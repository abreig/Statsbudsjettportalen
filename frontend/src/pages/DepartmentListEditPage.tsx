import { useState, useCallback, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { downloadFileWithAuth } from '../lib/download.ts';
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
  Maximize2,
  List,
  MessageSquare,
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
import { FocusModeOverlay } from '../components/editor/FocusModeOverlay.tsx';
import { useResourceLock } from '../hooks/useResourceLock.ts';
import { LockBanner } from '../components/lock/LockBanner.tsx';
import { IdleWarningDialog } from '../components/lock/IdleWarningDialog.tsx';
import { IdleKickMessage } from '../components/lock/IdleKickMessage.tsx';
import { EditorToolbar } from '../components/editor/EditorToolbar.tsx';
import { CommentPanel } from '../components/editor/CommentPanel.tsx';
import { collectCommentMarks } from '../components/editor/CommentsExtension.ts';
import { uploadDepListImage } from '../components/deplist/DepListContentEditor.tsx';
import { DepListEditorContext } from '../components/deplist/DepListEditorContext.tsx';
import type { TrackMode } from '../components/editor/TrackChangesExtension.ts';
import {
  useComments,
  useCreateComment,
  useReplyToComment,
  useResolveComment,
  useReopenComment,
  useDeleteComment,
} from '../hooks/useComments.ts';
import type { CaseComment } from '../api/comments.ts';

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
  const [focusMode, setFocusMode] = useState(false);

  // UI panels
  const [tocOpen, setTocOpen] = useState(false);

  // Global editor context state
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [trackMode, setTrackMode] = useState<TrackMode>('editing');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  const handleSetActiveComment = useCallback((commentId: string | null) => {
    setActiveCommentId(commentId);
    if (commentId && activeEditor) {
      const marks = collectCommentMarks(activeEditor.state.doc);
      const mark = marks.find((m) => m.commentId === commentId);
      if (mark) {
        activeEditor.commands.setTextSelection(mark.from);
        activeEditor.view.dispatch(activeEditor.state.tr.scrollIntoView());
      }
    }
  }, [activeEditor]);

  // Comment hooks (only active when a case is selected)
  const { data: comments = [] } = useComments(activeCaseId ?? undefined);
  const createCommentMut = useCreateComment(activeCaseId ?? '');
  const replyMut = useReplyToComment(activeCaseId ?? '');
  const resolveMut = useResolveComment(activeCaseId ?? '');
  const reopenMut = useReopenComment(activeCaseId ?? '');
  const deleteMut = useDeleteComment(activeCaseId ?? '');

  // F11 toggles focus mode
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        setFocusMode((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

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
    <DepListEditorContext.Provider value={{
      activeEditor, setActiveEditor,
      trackingEnabled, setTrackingEnabled,
      trackMode, setTrackMode,
      activeCaseId, setActiveCaseId,
    }}>
      <div className="mx-auto max-w-[1600px]">
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
            {/* TOC toggle */}
            <Button
              size="small"
              variant={tocOpen ? 'primary' : 'tertiary'}
              icon={<List size={16} />}
              onClick={() => setTocOpen((v) => !v)}
              title="Innholdsfortegnelse"
            >
              Innholdsfortegnelse
            </Button>

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
              icon={<Maximize2 size={16} />}
              onClick={() => setFocusMode((v) => !v)}
              title="Fokusmodus (F11)"
            >
              Fokusmodus
            </Button>
            <Button
              size="small"
              variant="tertiary"
              icon={<FileDown size={16} />}
              onClick={() => {
                const filename = `depliste-${depList.departmentCode ?? depList.id}.docx`;
                void downloadFileWithAuth(getDepListExportUrl(depList.id), filename);
              }}
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
        {lockHolder && lockHolder.userId !== user?.id && (
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

        {/* Main layout: [TOC] [Document] [Comments] */}
        <div className="flex gap-4">
          {/* TOC sidebar (left, toggleable) */}
          {tocOpen && !focusMode && depList.sections && (
            <div className="w-[220px] shrink-0">
              <DepListSidebar sections={depList.sections} />
            </div>
          )}

          {/* Document column */}
          <div className="min-w-0 flex-1">
            {/* Global sticky toolbar */}
            {editable && (
              <div className="sticky top-0 z-10 mb-3 rounded-lg border border-gray-200 bg-white shadow-sm">
                <EditorToolbar
                  editor={activeEditor}
                  trackingEnabled={trackingEnabled}
                  trackMode={trackMode}
                  onToggleTracking={() => setTrackingEnabled((v) => !v)}
                  onSetTrackMode={setTrackMode}
                  onImageUpload={uploadDepListImage}
                />
              </div>
            )}

            <FocusModeOverlay
              active={focusMode}
              onExit={() => setFocusMode(false)}
              onSave={dirty ? handleSave : undefined}
              saving={saving}
              maxWidth="860px"
            >
              <DepListDocument
                depList={depList}
                classificationText={null}
                editable={editable}
                onSectionContentChange={handleSectionContentChange}
                onEntryContentChange={handleEntryContentChange}
              />
            </FocusModeOverlay>
          </div>

          {/* Comment panel (right, sticky) */}
          {!focusMode && (
            <div className="w-[280px] shrink-0 self-start sticky top-0">
              <div className="max-h-[calc(100vh-4rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white">
                {activeCaseId ? (
                  <CommentPanel
                    editor={activeEditor}
                    caseId={activeCaseId}
                    comments={comments as CaseComment[]}
                    currentUserId={user?.id ?? ''}
                    activeCommentId={activeCommentId}
                    onSetActiveComment={handleSetActiveComment}
                    onCreateComment={(commentId, text, anchorText) => {
                      createCommentMut.mutate({ commentId, commentText: text, anchorText });
                    }}
                    onReply={(commentDbId, text) => {
                      replyMut.mutate({ commentDbId, payload: { commentText: text } });
                    }}
                    onResolve={(comment: CaseComment) => resolveMut.mutate(comment.id)}
                    onReopen={(comment: CaseComment) => reopenMut.mutate(comment.id)}
                    onDelete={(comment: CaseComment) => deleteMut.mutate(comment.id)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-6 text-center text-gray-400">
                    <MessageSquare size={24} className="opacity-40" />
                    <BodyShort size="small">
                      Klikk «Rediger sak» for å se og skrive kommentarer for en sak.
                    </BodyShort>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DepListEditorContext.Provider>
  );
}
