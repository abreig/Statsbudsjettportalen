import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Heading,
  BodyShort,
  Alert,
  Loader,
  Button,
  Tag,
  Select,
} from '@navikt/ds-react';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  FileDown,
  CheckCircle2,
} from 'lucide-react';
import { useDepartmentList } from '../hooks/useDepartmentLists.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { isFinRole, isAdmin } from '../lib/roles.ts';
import {
  updateDepartmentListSection,
  updateCaseEntry,
  updateDepartmentListStatus,
  autoPlaceCases,
  getDepListExportUrl,
} from '../api/departmentLists.ts';
import { DepListDocument } from '../components/deplist/DepListDocument.tsx';
import { DepListSidebar } from '../components/deplist/DepListSidebar.tsx';
import { useResourceLock } from '../hooks/useResourceLock.ts';
import { LockBanner } from '../components/lock/LockBanner.tsx';
import { IdleWarningDialog } from '../components/lock/IdleWarningDialog.tsx';
import { IdleKickMessage } from '../components/lock/IdleKickMessage.tsx';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Utkast',
  in_progress: 'Under arbeid',
  completed: 'Ferdig',
};

export function DepartmentListEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';

  const { data: depList, isLoading, error } = useDepartmentList(id);
  const canEdit = (isFinRole(role) || isAdmin(role)) && depList?.status !== 'completed';

  // Resource locking
  const saveBeforeKick = useCallback(async () => {
    return { saved: false, conflict: false };
  }, []);

  const {
    lockHolder,
    isReadOnly: lockReadOnly,
    idleWarning,
    idleSecondsLeft,
    idleKickReason,
    dismissIdleKick,
    acquire: acquireLock,
    stayActive,
    registerActivity,
  } = useResourceLock({
    resourceType: 'department_list',
    resourceId: id,
    enabled: canEdit ?? false,
    onSaveBeforeKick: saveBeforeKick,
  });

  const editable = canEdit && !lockReadOnly;

  // Dirty tracking
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [autoPlacing, setAutoPlacing] = useState(false);

  // Pending changes buffer
  const [pendingChanges, setPendingChanges] = useState<
    Array<{ type: 'section' | 'entry'; id: string; data: Record<string, unknown> }>
  >([]);

  const handleSectionContentChange = useCallback(
    (sectionId: string, contentJson: string) => {
      setPendingChanges((prev) => {
        const filtered = prev.filter((c) => !(c.type === 'section' && c.id === sectionId));
        return [...filtered, { type: 'section', id: sectionId, data: { contentJson } }];
      });
      setDirty(true);
      setSaveSuccess(false);
      registerActivity?.();
    },
    [registerActivity]
  );

  const handleEntryContentChange = useCallback(
    (entryId: string, contentJson: string) => {
      setPendingChanges((prev) => {
        const filtered = prev.filter((c) => !(c.type === 'entry' && c.id === entryId));
        return [...filtered, { type: 'entry', id: entryId, data: { overrideContent: contentJson } }];
      });
      setDirty(true);
      setSaveSuccess(false);
      registerActivity?.();
    },
    [registerActivity]
  );

  const handleSave = async () => {
    if (!id || pendingChanges.length === 0) return;
    setSaving(true);
    try {
      for (const change of pendingChanges) {
        if (change.type === 'section') {
          await updateDepartmentListSection(id, change.id, change.data as { contentJson: string });
        } else if (change.type === 'entry') {
          await updateCaseEntry(id, change.id, change.data as { overrideContent: string });
        }
      }
      setPendingChanges([]);
      setDirty(false);
      setSaveSuccess(true);
      void queryClient.invalidateQueries({ queryKey: ['department-lists', id] });
    } catch {
      // errors handled by individual calls
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    await updateDepartmentListStatus(id, newStatus);
    void queryClient.invalidateQueries({ queryKey: ['department-lists', id] });
    void queryClient.invalidateQueries({ queryKey: ['department-lists'] });
  };

  const handleAutoPlace = async () => {
    if (!id) return;
    setAutoPlacing(true);
    try {
      const result = await autoPlaceCases(id);
      void queryClient.invalidateQueries({ queryKey: ['department-lists', id] });
      if (result.placed === 0) {
        alert('Ingen nye saker ble plassert. Alle kvalifiserte saker er allerede i listen.');
      }
    } finally {
      setAutoPlacing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader size="xlarge" title="Laster departementsliste..." />
      </div>
    );
  }

  if (error || !depList) {
    return (
      <Alert variant="error">Kunne ikke laste departementslisten.</Alert>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="small"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/department-lists')}
          >
            Tilbake
          </Button>
          <Tag variant={depList.status === 'completed' ? 'success' : 'info'} size="small">
            {STATUS_LABELS[depList.status] ?? depList.status}
          </Tag>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <>
              <Button
                size="small"
                variant="secondary"
                icon={<RefreshCw size={14} />}
                onClick={handleAutoPlace}
                loading={autoPlacing}
              >
                Plasser saker
              </Button>
              <Button
                size="small"
                icon={<Save size={14} />}
                onClick={handleSave}
                loading={saving}
                disabled={!dirty}
              >
                Lagre
              </Button>
            </>
          )}
          <Button
            size="small"
            variant="tertiary"
            icon={<FileDown size={16} />}
            onClick={() => window.open(getDepListExportUrl(depList.id), '_blank')}
          >
            Eksporter Word
          </Button>
          {editable && depList.status !== 'completed' && (
            <Select
              label=""
              hideLabel
              size="small"
              value={depList.status}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="draft">Utkast</option>
              <option value="in_progress">Under arbeid</option>
              <option value="completed">Ferdig</option>
            </Select>
          )}
        </div>
      </div>

      {/* Header info */}
      <div className="mb-4">
        <Heading size="medium" level="1">
          {depList.templateName}
        </Heading>
        <BodyShort className="text-gray-600">
          {depList.departmentName} ({depList.departmentCode})
        </BodyShort>
      </div>

      {/* Lock / idle banners */}
      {lockHolder && (
        <LockBanner
          holderName={lockHolder.fullName}
          lockedAt={lockHolder.lockedAt}
          onRetry={acquireLock}
        />
      )}
      {idleKickReason && (
        <IdleKickMessage reason={idleKickReason} onDismiss={dismissIdleKick} />
      )}
      {idleWarning && (
        <IdleWarningDialog secondsLeft={idleSecondsLeft} onStayActive={stayActive} />
      )}

      {saveSuccess && (
        <Alert variant="success" size="small" className="mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            Endringene er lagret.
          </div>
        </Alert>
      )}

      {/* Main layout: Document + Sidebar */}
      <div className="flex gap-6">
        {/* Document */}
        <div className="min-w-0 flex-1">
          <DepListDocument
            depList={depList}
            classificationText={null}
            editable={editable}
            onSectionContentChange={handleSectionContentChange}
            onEntryContentChange={handleEntryContentChange}
          />
        </div>

        {/* Sidebar */}
        {depList.sections && (
          <div className="w-[260px] shrink-0 space-y-4">
            <DepListSidebar sections={depList.sections} />
          </div>
        )}
      </div>
    </div>
  );
}
