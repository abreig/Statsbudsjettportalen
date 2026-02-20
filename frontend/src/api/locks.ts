import apiClient from './client';

export interface LockInfo {
  id: string;
  resourceType: string;
  resourceId: string;
  lockedBy: string;
  lockedByName: string;
  lockedAt: string;
  expiresAt: string;
}

export async function acquireLock(resourceType: string, resourceId: string): Promise<LockInfo> {
  const { data } = await apiClient.post<LockInfo>('/locks', { resourceType, resourceId });
  return data;
}

export async function releaseLock(lockId: string): Promise<void> {
  await apiClient.delete(`/locks/${lockId}`);
}

export async function heartbeatLock(lockId: string): Promise<void> {
  await apiClient.put(`/locks/${lockId}/heartbeat`);
}

export async function checkLock(resourceType: string, resourceId: string): Promise<LockInfo | null> {
  try {
    const { data } = await apiClient.get<LockInfo>(`/locks`, {
      params: { resourceType, resourceId },
    });
    return data;
  } catch {
    return null;
  }
}

/**
 * Release a lock via sendBeacon for reliable cleanup on page unload.
 * Falls back to a regular DELETE if sendBeacon is unavailable.
 */
export function releaseLockBeacon(lockId: string): void {
  const token = localStorage.getItem('auth_token');
  const url = `/api/locks/${lockId}`;

  if (navigator.sendBeacon) {
    // sendBeacon only supports POST, so we use a special header
    const blob = new Blob([JSON.stringify({ _method: 'DELETE' })], {
      type: 'application/json',
    });
    const sent = navigator.sendBeacon(url + '?_method=DELETE', blob);
    if (!sent) {
      // Fallback to sync XHR
      const xhr = new XMLHttpRequest();
      xhr.open('DELETE', url, false);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send();
    }
  } else {
    const xhr = new XMLHttpRequest();
    xhr.open('DELETE', url, false);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send();
  }
}
