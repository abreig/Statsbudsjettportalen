import { useCallback, useEffect, useRef, useState } from 'react';
import { acquireLock, releaseLock, heartbeatLock, releaseLockBeacon, type LockInfo } from '../api/locks';
import { useAuthStore } from '../stores/authStore';

interface UseResourceLockOptions {
  resourceType: 'case' | 'department_list';
  resourceId: string | undefined;
  enabled?: boolean;
  idleTimeoutMs?: number;
  warningBeforeMs?: number;
  heartbeatIntervalMs?: number;
  onSaveBeforeKick?: () => Promise<{ saved: boolean; conflict: boolean }>;
}

type IdleKickReason = 'saved' | 'conflict' | 'no_changes' | null;

interface UseResourceLockReturn {
  isLocked: boolean;
  lockHolder: { userId: string; fullName: string; lockedAt: string } | null;
  isReadOnly: boolean;
  idleWarning: boolean;
  idleSecondsLeft: number;
  idleKickReason: IdleKickReason;
  dismissIdleKick: () => void;
  acquire: () => Promise<boolean>;
  release: () => Promise<void>;
  stayActive: () => void;
  registerActivity: () => void;
}

const IDLE_TIMEOUT_DEFAULT = 5 * 60 * 1000;
const WARNING_BEFORE_DEFAULT = 60 * 1000;
const HEARTBEAT_INTERVAL_DEFAULT = 60 * 1000;

export function useResourceLock({
  resourceType,
  resourceId,
  enabled = true,
  idleTimeoutMs = IDLE_TIMEOUT_DEFAULT,
  warningBeforeMs = WARNING_BEFORE_DEFAULT,
  heartbeatIntervalMs = HEARTBEAT_INTERVAL_DEFAULT,
  onSaveBeforeKick,
}: UseResourceLockOptions): UseResourceLockReturn {
  const user = useAuthStore((s) => s.user);

  const [isLocked, setIsLocked] = useState(false);
  const [lockHolder, setLockHolder] = useState<UseResourceLockReturn['lockHolder']>(null);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [idleWarning, setIdleWarning] = useState(false);
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(0);
  const [idleKickReason, setIdleKickReason] = useState<IdleKickReason>(null);

  const lockIdRef = useRef<string | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const mountedRef = useRef(true);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    heartbeatTimerRef.current = null;
    idleTimerRef.current = null;
    warningTimerRef.current = null;
    countdownTimerRef.current = null;
  }, []);

  // Handle idle kick
  const handleIdleKick = useCallback(async () => {
    if (!mountedRef.current) return;

    setIdleWarning(false);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    let reason: IdleKickReason = 'no_changes';

    if (onSaveBeforeKick) {
      try {
        const result = await onSaveBeforeKick();
        reason = result.conflict ? 'conflict' : result.saved ? 'saved' : 'no_changes';
      } catch {
        reason = 'conflict';
      }
    }

    // Release lock
    if (lockIdRef.current) {
      try {
        await releaseLock(lockIdRef.current);
      } catch { /* ignore */ }
      lockIdRef.current = null;
    }

    if (!mountedRef.current) return;

    setIsLocked(false);
    setIsReadOnly(true);
    setIdleKickReason(reason);
    clearTimers();
  }, [onSaveBeforeKick, clearTimers]);

  // Start idle tracking
  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setIdleWarning(false);

    // Warning timer (fires warningBeforeMs before timeout)
    const warningDelay = idleTimeoutMs - warningBeforeMs;
    warningTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setIdleWarning(true);
      setIdleSecondsLeft(Math.ceil(warningBeforeMs / 1000));
      // Start countdown
      countdownTimerRef.current = setInterval(() => {
        setIdleSecondsLeft((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningDelay);

    // Full timeout
    idleTimerRef.current = setTimeout(() => {
      handleIdleKick();
    }, idleTimeoutMs);
  }, [idleTimeoutMs, warningBeforeMs, handleIdleKick]);

  // Register user activity
  const registerActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isLocked) {
      startIdleTimer();
    }
  }, [isLocked, startIdleTimer]);

  // Manually stay active (button in warning dialog)
  const stayActive = useCallback(() => {
    setIdleWarning(false);
    registerActivity();
  }, [registerActivity]);

  // Acquire lock
  const acquire = useCallback(async (): Promise<boolean> => {
    if (!resourceId || !enabled) return false;

    try {
      const lock = await acquireLock(resourceType, resourceId);
      if (!mountedRef.current) return false;

      lockIdRef.current = lock.id;
      setIsLocked(true);
      setLockHolder(null);
      setIsReadOnly(false);
      setIdleKickReason(null);

      // Start heartbeat
      heartbeatTimerRef.current = setInterval(async () => {
        if (lockIdRef.current) {
          try {
            await heartbeatLock(lockIdRef.current);
          } catch {
            // Lock expired or released
            if (mountedRef.current) {
              setIsLocked(false);
              setIsReadOnly(true);
              lockIdRef.current = null;
              clearTimers();
            }
          }
        }
      }, heartbeatIntervalMs);

      // Start idle timer
      startIdleTimer();

      return true;
    } catch (err: unknown) {
      if (!mountedRef.current) return false;

      // 409 Conflict - someone else has the lock
      const error = err as { response?: { status: number; data?: LockInfo } };
      if (error.response?.status === 409 && error.response.data) {
        const holder = error.response.data;
        setLockHolder({
          userId: holder.lockedBy,
          fullName: holder.lockedByName,
          lockedAt: holder.lockedAt,
        });
      }
      setIsLocked(false);
      setIsReadOnly(true);
      return false;
    }
  }, [resourceType, resourceId, enabled, heartbeatIntervalMs, startIdleTimer, clearTimers]);

  // Release lock
  const release = useCallback(async () => {
    clearTimers();
    if (lockIdRef.current) {
      try {
        await releaseLock(lockIdRef.current);
      } catch { /* ignore */ }
      lockIdRef.current = null;
    }
    if (mountedRef.current) {
      setIsLocked(false);
      setIsReadOnly(true);
      setIdleWarning(false);
      setLockHolder(null);
    }
  }, [clearTimers]);

  // Dismiss idle kick message
  const dismissIdleKick = useCallback(() => {
    setIdleKickReason(null);
  }, []);

  // Auto-acquire on mount
  useEffect(() => {
    if (!resourceId || !enabled || !user) return;

    acquire();

    return () => {
      // Cleanup on unmount: release lock via beacon for reliability
      if (lockIdRef.current) {
        releaseLockBeacon(lockIdRef.current);
        lockIdRef.current = null;
      }
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId, enabled]);

  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Handle beforeunload
  useEffect(() => {
    const handleUnload = () => {
      if (lockIdRef.current) {
        releaseLockBeacon(lockIdRef.current);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return {
    isLocked,
    lockHolder,
    isReadOnly: !enabled ? false : isReadOnly,
    idleWarning,
    idleSecondsLeft,
    idleKickReason,
    dismissIdleKick,
    acquire,
    release,
    stayActive,
    registerActivity,
  };
}
