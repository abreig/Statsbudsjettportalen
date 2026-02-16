import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { JSONContent } from '@tiptap/core';
import {
  Heading,
  BodyShort,
  BodyLong,
  Label,
  Button,
  Alert,
  Loader,
  Textarea,
  TextField,
  Tag,
} from '@navikt/ds-react';
import {
  ArrowLeft,
  Save,
  ArrowRightCircle,
  RotateCcw,
  History,
  CheckCircle2,
  MessageSquarePlus,
  MessageSquareReply,
  XCircle,
  Forward,
  ShieldCheck,
  PanelRightClose,
  PanelRightOpen,
  FileDown,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { useCase, useSaveDocument, useChangeStatus, useChangeResponsible, useChangeFinResponsible, useCreateOpinion, useResolveOpinion, useForwardApproval } from '../hooks/useCases.ts';
import { useComments, useCreateComment, useReplyToComment, useResolveComment, useReopenComment, useDeleteComment } from '../hooks/useComments.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { CaseStatusBadge } from '../components/cases/CaseStatusBadge.tsx';
import { CaseWorkflowBar } from '../components/cases/CaseWorkflowBar.tsx';
import { ReturnCaseModal } from '../components/cases/ReturnCaseModal.tsx';
import { QuestionThread } from '../components/questions/QuestionThread.tsx';
import { CaseDocumentEditor } from '../components/editor/CaseDocumentEditor.tsx';
import { SectionNavigation } from '../components/editor/SectionNavigation.tsx';
import { CommentPanel } from '../components/editor/CommentPanel.tsx';
import { buildDocumentFromContent } from '../components/editor/documentUtils.ts';
import type { TrackMode } from '../components/editor/TrackChangesExtension.ts';
import { CASE_TYPE_LABELS, CASE_TYPE_FIELDS, FIN_FIELDS, GOV_CONCLUSION_FIELD } from '../lib/caseTypes.ts';
import { STATUS_LABELS, FIN_FIELDS_VISIBLE_TO_FAG, FIN_VISIBLE_STATUSES, getAllowedTransitions } from '../lib/statusFlow.ts';
import { formatAmountNOK, formatDate } from '../lib/formatters.ts';
import { isFagRole, isFinRole, isFinLeader, canChangeResponsible, canSendOpinion } from '../lib/roles.ts';
import type { CaseOpinion } from '../lib/types.ts';
import apiClient from '../api/client.ts';
import { useResourceLock } from '../hooks/useResourceLock.ts';
import { LockBanner } from '../components/lock/LockBanner.tsx';
import { IdleWarningDialog } from '../components/lock/IdleWarningDialog.tsx';
import { IdleKickMessage } from '../components/lock/IdleKickMessage.tsx';
import { ConflictDialog } from '../components/lock/ConflictDialog.tsx';

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';

  const { data: budgetCase, isLoading, error } = useCase(id);
  const saveDocumentMut = useSaveDocument(id ?? '');
  const changeStatusMut = useChangeStatus(id ?? '');
  const changeResponsibleMut = useChangeResponsible(id ?? '');
  const changeFinResponsibleMut = useChangeFinResponsible(id ?? '');
  const createOpinionMut = useCreateOpinion(id ?? '');
  const resolveOpinionMut = useResolveOpinion(id ?? '');
  const forwardApprovalMut = useForwardApproval(id ?? '');

  // Sidebar and metadata state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editedMetaFields, setEditedMetaFields] = useState<Record<string, string>>({});

  // Document editor state
  const [documentDirty, setDocumentDirty] = useState(false);
  const latestDocJson = useRef<JSONContent | null>(null);

  // Track changes override state (resolved after auto-values are computed below)
  const [trackChangesOverride, setTrackChangesOverride] = useState<boolean | null>(null);
  const [trackModeOverride, setTrackModeOverride] = useState<TrackMode | null>(null);

  // Comments state
  const editorRef = useRef<Editor | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const { data: comments = [] } = useComments(id);
  const createCommentMut = useCreateComment(id ?? '');
  const replyToCommentMut = useReplyToComment(id ?? '');
  const resolveCommentMut = useResolveComment(id ?? '');
  const reopenCommentMut = useReopenComment(id ?? '');
  const deleteCommentMut = useDeleteComment(id ?? '');

  // Status/opinion state
  const [showChangeResponsible, setShowChangeResponsible] = useState(false);
  const [showChangeFinResponsible, setShowChangeFinResponsible] = useState(false);
  const [deptUsers, setDeptUsers] = useState<Array<{ id: string; fullName: string; email: string; role: string }>>([]);
  const [finUsers, setFinUsers] = useState<Array<{ id: string; fullName: string; email: string; role: string }>>([]);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    status: string;
    label: string;
    isBackward?: boolean;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const [opinionAssignee, setOpinionAssignee] = useState('');
  const [showOpinionForm, setShowOpinionForm] = useState<false | 'uttalelse' | 'godkjenning'>(false);
  const [opinionResponses, setOpinionResponses] = useState<Record<string, string>>({});
  const [forwardTarget, setForwardTarget] = useState<string | null>(null);
  const [forwardUsers, setForwardUsers] = useState<Array<{ id: string; fullName: string; email: string }>>([]);
  const [opinionComment, setOpinionComment] = useState('');
  const [opinionUserSearch, setOpinionUserSearch] = useState('');
  const [opinionUsers, setOpinionUsers] = useState<Array<{ id: string; fullName: string; email: string }>>([]);
  const [conflict, setConflict] = useState<{ currentVersion: number; yourVersion: number } | null>(null);

  const userIsFag = isFagRole(role);
  const userIsFin = isFinRole(role);

  const content = budgetCase?.currentContent;
  const caseType = budgetCase?.caseType ?? '';
  const status = budgetCase?.status ?? '';
  const fagFields = CASE_TYPE_FIELDS[caseType] ?? [];

  // ─── Status-based editor mode logic (Sprint 2.4) ───────────────
  // Determines editability, track changes, and editor mode based on
  // case status + user role to enforce the collaborative workflow.
  const isAtFin = ['sendt_til_fin', 'under_vurdering_fin', 'ferdigbehandlet_fin'].includes(status);
  const isReturned = status === 'returnert_til_fag';
  const isRejected = status === 'avvist_av_fin';
  const isCaseClosed = status === 'regjeringsbehandlet';

  const canEdit = (() => {
    if (isCaseClosed) return false;
    if (isRejected) return false; // Rejected cases are permanently closed
    if (isAtFin && userIsFag) return false; // FAG cannot edit while at FIN
    if (isReturned && userIsFin) return false; // FIN cannot edit returned case
    return true;
  })();

  // Resource lock - acquire when editing is possible
  const saveBeforeKick = useCallback(async (): Promise<{ saved: boolean; conflict: boolean }> => {
    const docToSave = latestDocJson.current;
    if (!id || !budgetCase || !docToSave || !documentDirty) {
      return { saved: false, conflict: false };
    }
    try {
      await saveDocumentMut.mutateAsync({
        contentJson: JSON.stringify(docToSave),
        caseName: budgetCase.caseName ?? null,
        chapter: budgetCase.chapter ?? null,
        post: budgetCase.post ?? null,
        amount: budgetCase.amount ?? null,
        finAmount: budgetCase.finAmount ?? null,
        govAmount: budgetCase.govAmount ?? null,
        trackChangesActive: trackChangesOverride ?? false,
        expectedVersion: budgetCase.version,
      });
      return { saved: true, conflict: false };
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number } };
      if (axiosErr.response?.status === 409) {
        return { saved: false, conflict: true };
      }
      return { saved: false, conflict: false };
    }
  }, [id, budgetCase, documentDirty, saveDocumentMut, trackChangesOverride]);

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
    resourceType: 'case',
    resourceId: id,
    enabled: canEdit,
    onSaveBeforeKick: saveBeforeKick,
  });

  // The editor is editable only if canEdit AND we hold the lock
  const editable = canEdit && !lockReadOnly;

  // Auto-enable tracking when FIN edits a case, or when FAG reviews returned case
  const autoTrackingEnabled = (() => {
    if (userIsFin && isAtFin) return true; // FIN edits always tracked
    if (userIsFag && isReturned) return true; // FAG reviewing FIN changes
    return false;
  })();

  // Auto-set track mode based on status + role
  const autoTrackMode: TrackMode = (() => {
    if (userIsFag && isReturned) return 'review'; // FAG reviews FIN's changes
    return 'editing';
  })();

  // Resolved track changes state (user override or auto-value)
  const trackChangesEnabled = trackChangesOverride ?? autoTrackingEnabled;
  const trackMode = trackModeOverride ?? autoTrackMode;

  const showFinFields = userIsFin
    || (userIsFag && FIN_FIELDS_VISIBLE_TO_FAG.includes(status));

  // "Regjeringens konklusjon" visible when status is sendt_til_regjeringen or later for all users
  const showGovConclusion = ['sendt_til_regjeringen', 'regjeringsbehandlet'].includes(status);

  // Build the document JSON from current content
  const documentContent = buildDocumentFromContent(
    content ?? null,
    fagFields,
    FIN_FIELDS,
    id ?? '',
    showFinFields,
    showGovConclusion ? GOV_CONCLUSION_FIELD : null
  );

  // Handle document changes from the editor (no autosave — manual save only)
  const handleDocumentUpdate = useCallback((doc: JSONContent) => {
    latestDocJson.current = doc;
    setDocumentDirty(true);
    setSaveSuccess(false);
  }, []);

  // Warn user about unsaved changes when leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (documentDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [documentDirty]);

  const triggerSave = useCallback((doc?: JSONContent) => {
    const docToSave = doc ?? latestDocJson.current;
    if (!id || !budgetCase || !docToSave) return;

    setSaveError(null);
    saveDocumentMut.mutate({
      contentJson: JSON.stringify(docToSave),
      caseName: editedMetaFields.caseName ?? budgetCase.caseName ?? null,
      chapter: editedMetaFields.chapter ?? budgetCase.chapter ?? null,
      post: editedMetaFields.post ?? budgetCase.post ?? null,
      amount: editedMetaFields.amount
        ? Number(editedMetaFields.amount)
        : budgetCase.amount ?? null,
      finAmount: budgetCase.finAmount ?? null,
      govAmount: budgetCase.govAmount ?? null,
      trackChangesActive: trackChangesEnabled,
      expectedVersion: budgetCase.version,
    }, {
      onSuccess: () => {
        setDocumentDirty(false);
        setEditedMetaFields({});
        setSaveSuccess(true);
        setSaveError(null);
        setConflict(null);
      },
      onError: (err: unknown) => {
        const axiosErr = err as { response?: { status: number; data?: { currentVersion?: number; yourVersion?: number } } };
        if (axiosErr.response?.status === 409 && axiosErr.response.data) {
          setConflict({
            currentVersion: axiosErr.response.data.currentVersion ?? 0,
            yourVersion: axiosErr.response.data.yourVersion ?? budgetCase.version,
          });
        } else {
          const message = err instanceof Error ? err.message : 'Ukjent feil ved lagring';
          setSaveError(`Kunne ikke lagre: ${message}. Prøv igjen.`);
        }
      },
    });
  }, [id, budgetCase, editedMetaFields, saveDocumentMut, trackChangesEnabled]);

  const handleManualSave = () => {
    triggerSave();
  };

  const handleMetaFieldChange = (key: string, value: string) => {
    setEditedMetaFields((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
    setDocumentDirty(true);
  };

  const getNextStatuses = () => getAllowedTransitions(status, role);

  const handleStatusChange = (newStatus: string, reason?: string, comment?: string) => {
    changeStatusMut.mutate(
      { status: newStatus, reason, comment: comment || statusComment || undefined },
      {
        onSuccess: () => {
          setConfirmAction(null);
          setShowReturnModal(false);
          setStatusComment('');
        },
      }
    );
  };

  const handleRequestOpinion = () => {
    if (!opinionAssignee.trim() || !showOpinionForm) return;
    createOpinionMut.mutate(
      { assignedTo: opinionAssignee.trim(), type: showOpinionForm, comment: opinionComment || undefined },
      {
        onSuccess: () => {
          setOpinionAssignee('');
          setOpinionComment('');
          setOpinionUserSearch('');
          setShowOpinionForm(false);
        },
      }
    );
  };

  const handleResolveOpinion = (opinion: CaseOpinion, resolveStatus: 'given' | 'declined' | 'approved' | 'rejected') => {
    resolveOpinionMut.mutate({
      opinionId: opinion.id,
      payload: {
        status: resolveStatus,
        opinionText: (resolveStatus === 'given' || resolveStatus === 'approved') ? opinionResponses[opinion.id] : undefined,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader size="xlarge" title="Laster sak..." />
      </div>
    );
  }

  if (error || !budgetCase) {
    return (
      <Alert variant="error">
        Kunne ikke laste saken. Prøv igjen senere.
      </Alert>
    );
  }

  const nextStatuses = getNextStatuses();
  const hasEdits = documentDirty || Object.keys(editedMetaFields).length > 0;
  const opinions = budgetCase.opinions ?? [];
  const pendingOpinions = opinions.filter((o) => o.status === 'pending');
  const resolvedOpinions = opinions.filter((o) => o.status !== 'pending');
  const isReturnedStatus = status === 'returnert_til_fag';
  const isClosed = status === 'regjeringsbehandlet' || status === 'avvist_av_fin';
  const isLocked = pendingOpinions.length > 0;
  const isResponsible = user?.id === budgetCase.assignedTo || user?.id === budgetCase.finAssignedTo;
  const canOpinion = canSendOpinion(role, user?.id ?? '', budgetCase.assignedTo, budgetCase.finAssignedTo);
  const showFinHandler = FIN_VISIBLE_STATUSES.includes(status);

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="small"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/cases')}
          >
            Tilbake
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="small"
            icon={<FileDown size={16} />}
            onClick={() => {
              window.open(`/api/cases/${id}/export/word`, '_blank');
            }}
          >
            Eksporter Word
          </Button>
          <Button
            variant="tertiary"
            size="small"
            icon={<History size={16} />}
            onClick={() => navigate(`/cases/${id}/history`)}
          >
            Historikk
          </Button>
          <Button
            variant="tertiary"
            size="small"
            icon={sidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? 'Skjul panel' : 'Vis panel'}
          </Button>
        </div>
      </div>

      {/* Workflow bar */}
      <div className="mb-4">
        <CaseWorkflowBar currentStatus={budgetCase.status} opinions={budgetCase.opinions} />
      </div>

      {/* Returned / Rejected / Closed banners */}
      {isReturnedStatus && (
        <Alert variant="warning" size="small" className="mb-4">
          Saken er returnert til FAG for revisjon.
        </Alert>
      )}
      {isRejected && (
        <Alert variant="error" size="small" className="mb-4">
          Forslaget er avvist av FIN. Saken er permanent lukket.
        </Alert>
      )}
      {isClosed && (
        <Alert variant="success" size="small" className="mb-4">
          Saken er regjeringsbehandlet og lukket.
        </Alert>
      )}

      {/* Status-based read-only indicator */}
      {isAtFin && userIsFag && (
        <Alert variant="info" size="small" className="mb-4">
          Saken er til behandling hos FIN. Dokumentet er skrivebeskyttet.
        </Alert>
      )}
      {isReturned && userIsFag && (
        <Alert variant="warning" size="small" className="mb-4">
          Saken er returnert fra FIN med endringer. Gjennomgå og godta/avvis endringene.
        </Alert>
      )}

      {/* Save success message */}
      {saveSuccess && (
        <Alert variant="success" size="small" className="mb-4">
          Innholdet er lagret (versjon {budgetCase.version}).
        </Alert>
      )}

      {/* Save error message */}
      {saveError && (
        <Alert variant="error" size="small" className="mb-4">
          {saveError}
        </Alert>
      )}

      {/* Lock banner - shown when another user is editing */}
      {lockHolder && (
        <LockBanner
          holderName={lockHolder.fullName}
          lockedAt={lockHolder.lockedAt}
          onRetry={acquireLock}
        />
      )}

      {/* Idle kick message */}
      {idleKickReason && (
        <IdleKickMessage reason={idleKickReason} onDismiss={dismissIdleKick} />
      )}

      {/* Idle warning overlay */}
      {idleWarning && (
        <IdleWarningDialog secondsLeft={idleSecondsLeft} onStayActive={stayActive} />
      )}

      {/* Version conflict dialog */}
      {conflict && (
        <ConflictDialog
          currentVersion={conflict.currentVersion}
          yourVersion={conflict.yourVersion}
          onDismiss={() => setConflict(null)}
          onReload={() => window.location.reload()}
        />
      )}

      {/* Status change confirmation */}
      {confirmAction && (
        <Alert variant="warning" className="mb-4">
          <BodyShort className="mb-3">
            Er du sikker på at du vil flytte saken til{' '}
            <strong>{STATUS_LABELS[confirmAction.status]}</strong>?
          </BodyShort>
          <Textarea
            label="Kommentar (valgfritt)"
            value={statusComment}
            onChange={(e) => setStatusComment(e.target.value)}
            minRows={2}
            resize="vertical"
            size="small"
            className="mb-3"
          />
          <div className="flex gap-2">
            <Button
              size="small"
              onClick={() => handleStatusChange(confirmAction.status)}
              loading={changeStatusMut.isPending}
              icon={<CheckCircle2 size={14} />}
            >
              Bekreft
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={() => { setConfirmAction(null); setStatusComment(''); }}
            >
              Avbryt
            </Button>
          </div>
        </Alert>
      )}

      {changeStatusMut.isError && (
        <Alert variant="error" size="small" className="mb-4">
          Kunne ikke endre status. Sjekk at statusovergangen er gyldig.
        </Alert>
      )}

      {/* ═══════════════════════════════════════════════════════
          MAIN LAYOUT: Document (70%) + Sidebar (30%)
          ═══════════════════════════════════════════════════════ */}
      <div className="flex gap-6">
        {/* ─── Left: Document Panel ──────────────────────── */}
        <div className={sidebarOpen ? 'w-[70%] min-w-0' : 'w-full'}>
          {/* Action bar */}
          {(nextStatuses.length > 0 || isResponsible) && !isClosed && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={handleManualSave}
                    loading={saveDocumentMut.isPending}
                    icon={<Save size={14} />}
                    disabled={!hasEdits}
                  >
                    Lagre
                  </Button>
                )}

                {nextStatuses.map((action) => {
                  if (action.status === 'returnert_til_fag') {
                    return (
                      <Button
                        key={action.status}
                        size="small"
                        variant="secondary"
                        icon={<RotateCcw size={14} />}
                        onClick={() => setShowReturnModal(true)}
                        disabled={isLocked}
                      >
                        {action.label}
                      </Button>
                    );
                  }
                  if (action.status === 'avvist_av_fin') {
                    return (
                      <Button
                        key={action.status}
                        size="small"
                        variant="danger"
                        icon={<XCircle size={14} />}
                        onClick={() => setShowRejectModal(true)}
                        disabled={isLocked}
                      >
                        {action.label}
                      </Button>
                    );
                  }
                  return (
                    <Button
                      key={action.status}
                      size="small"
                      variant={action.isBackward ? 'secondary' : 'primary'}
                      icon={action.isBackward ? <RotateCcw size={14} /> : <ArrowRightCircle size={14} />}
                      onClick={() => setConfirmAction(action)}
                      disabled={isLocked}
                    >
                      {action.label}
                    </Button>
                  );
                })}

                {canOpinion && (
                  <>
                    <Button
                      size="small"
                      variant="tertiary"
                      icon={<MessageSquarePlus size={14} />}
                      onClick={async () => {
                        const { data } = await apiClient.get<Array<{ id: string; fullName: string; email: string; departmentId: string }>>('/auth/users');
                        setOpinionUsers(data.filter((u) => u.id !== user?.id));
                        setOpinionUserSearch('');
                        setOpinionComment('');
                        setOpinionAssignee('');
                        setShowOpinionForm('uttalelse');
                      }}
                    >
                      Til uttalelse
                    </Button>
                    <Button
                      size="small"
                      variant="tertiary"
                      icon={<ShieldCheck size={14} />}
                      onClick={async () => {
                        const { data } = await apiClient.get<Array<{ id: string; fullName: string; email: string; departmentId: string }>>('/auth/users');
                        setOpinionUsers(data.filter((u) => u.id !== user?.id));
                        setOpinionUserSearch('');
                        setOpinionComment('');
                        setOpinionAssignee('');
                        setShowOpinionForm('godkjenning');
                      }}
                    >
                      Til godkjenning
                    </Button>
                  </>
                )}

                {isLocked && (
                  <BodyShort size="small" className="self-center text-amber-700">
                    Saken er låst – ventende uttalelser/godkjenninger
                  </BodyShort>
                )}

                {documentDirty && !saveDocumentMut.isPending && (
                  <BodyShort size="small" className="self-center text-amber-600">
                    Ulagrede endringer
                  </BodyShort>
                )}
                {saveDocumentMut.isPending && (
                  <BodyShort size="small" className="self-center text-blue-600">
                    Lagrer...
                  </BodyShort>
                )}
              </div>

              {/* Inline opinion form */}
              {showOpinionForm && (
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <Heading size="xsmall" level="3" className="mb-3">
                    {showOpinionForm === 'uttalelse' ? 'Send til uttalelse' : 'Send til godkjenning'}
                  </Heading>

                  <Label size="small" className="mb-1">Velg mottaker</Label>
                  <TextField
                    label=""
                    hideLabel
                    placeholder="Søk etter bruker..."
                    value={opinionUserSearch}
                    onChange={(e) => setOpinionUserSearch(e.target.value)}
                    size="small"
                    className="mb-2"
                  />

                  {!opinionAssignee && (
                    <div className="mb-3 max-h-40 space-y-1 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2">
                      {opinionUsers
                        .filter((u) => {
                          const q = opinionUserSearch.toLowerCase();
                          return !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                        })
                        .map((u) => (
                          <Button
                            key={u.id}
                            size="xsmall"
                            variant="tertiary"
                            className="w-full justify-start"
                            onClick={() => setOpinionAssignee(u.id)}
                          >
                            {u.fullName} ({u.email})
                          </Button>
                        ))}
                    </div>
                  )}

                  {opinionAssignee && (
                    <div className="mb-3 flex items-center gap-2">
                      <Tag variant="info" size="small">
                        {opinionUsers.find((u) => u.id === opinionAssignee)?.fullName ?? opinionAssignee}
                      </Tag>
                      <Button size="xsmall" variant="tertiary" onClick={() => setOpinionAssignee('')}>
                        Endre
                      </Button>
                    </div>
                  )}

                  <Textarea
                    label="Kommentar til mottaker (valgfritt)"
                    value={opinionComment}
                    onChange={(e) => setOpinionComment(e.target.value)}
                    minRows={2}
                    resize="vertical"
                    size="small"
                    className="mb-3"
                  />

                  <div className="flex gap-2">
                    <Button
                      size="small"
                      onClick={handleRequestOpinion}
                      loading={createOpinionMut.isPending}
                      icon={showOpinionForm === 'uttalelse' ? <MessageSquarePlus size={14} /> : <ShieldCheck size={14} />}
                      disabled={!opinionAssignee}
                    >
                      Send forespørsel
                    </Button>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => { setShowOpinionForm(false); setOpinionAssignee(''); setOpinionComment(''); setOpinionUserSearch(''); }}
                    >
                      Avbryt
                    </Button>
                  </div>
                  {createOpinionMut.isError && (
                    <Alert variant="error" size="small" className="mt-2">
                      Kunne ikke sende forespørsel.
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── Document Editor ─────────────────────────── */}
          <CaseDocumentEditor
            initialContent={documentContent}
            editable={editable}
            onUpdate={handleDocumentUpdate}
            onActivity={registerActivity}
            trackChangesEnabled={trackChangesEnabled}
            trackMode={trackMode}
            onToggleTracking={() => setTrackChangesOverride((prev) => !(prev ?? autoTrackingEnabled))}
            onSetTrackMode={(mode) => setTrackModeOverride(mode)}
            currentUser={user ? { id: user.id, name: user.fullName } : undefined}
            onEditorReady={(editor) => { editorRef.current = editor; }}
          />

          {/* ─── Opinions section ─────────────────────────── */}
          {opinions.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-white p-6">
              <Heading size="small" level="2" className="mb-4 text-amber-800">
                Uttalelser og godkjenninger
              </Heading>

              <div className="space-y-3">
                {pendingOpinions.map((op) => {
                  const isUttalelse = op.type === 'uttalelse';
                  const borderColor = isUttalelse ? 'border-amber-200' : 'border-blue-200';
                  const bgColor = isUttalelse ? 'bg-amber-50' : 'bg-blue-50';

                  return (
                    <div key={op.id} className={`rounded border ${borderColor} ${bgColor} p-3`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Tag variant={isUttalelse ? 'warning' : 'info'} size="xsmall">
                              {isUttalelse ? 'Til uttalelse' : op.forwardedFromId ? 'Videresendt for godkjenning' : 'Til godkjenning'}
                            </Tag>
                            <BodyShort size="small" className="font-medium">
                              {op.assignedToName}
                            </BodyShort>
                          </div>
                          <BodyShort size="small" className="mt-1 text-gray-500">
                            Sendt av {op.requestedByName} - {formatDate(op.createdAt)}
                          </BodyShort>
                          {op.requestComment && (
                            <BodyShort size="small" className="mt-1 rounded bg-gray-100 p-2 text-gray-700 italic">
                              &laquo;{op.requestComment}&raquo;
                            </BodyShort>
                          )}
                        </div>
                        <Tag variant="warning" size="xsmall">Ventende</Tag>
                      </div>

                      {user && op.assignedTo === user.id && (
                        <div className="mt-3 space-y-2">
                          <Textarea
                            label={isUttalelse ? 'Din uttalelse' : 'Kommentar'}
                            value={opinionResponses[op.id] ?? ''}
                            onChange={(e) =>
                              setOpinionResponses((prev) => ({
                                ...prev,
                                [op.id]: e.target.value,
                              }))
                            }
                            minRows={2}
                            resize="vertical"
                          />
                          <div className="flex gap-2">
                            {isUttalelse ? (
                              <>
                                <Button
                                  size="small"
                                  icon={<MessageSquareReply size={14} />}
                                  onClick={() => handleResolveOpinion(op, 'given')}
                                  loading={resolveOpinionMut.isPending}
                                >
                                  Gi uttalelse
                                </Button>
                                <Button
                                  size="small"
                                  variant="secondary"
                                  icon={<XCircle size={14} />}
                                  onClick={() => handleResolveOpinion(op, 'declined')}
                                  loading={resolveOpinionMut.isPending}
                                >
                                  Avslå
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="small"
                                  icon={<ShieldCheck size={14} />}
                                  onClick={() => handleResolveOpinion(op, 'approved')}
                                  loading={resolveOpinionMut.isPending}
                                >
                                  Godkjenn
                                </Button>
                                <Button
                                  size="small"
                                  variant="danger"
                                  icon={<XCircle size={14} />}
                                  onClick={() => handleResolveOpinion(op, 'rejected')}
                                  loading={resolveOpinionMut.isPending}
                                >
                                  Avslå
                                </Button>
                                <Button
                                  size="small"
                                  variant="secondary"
                                  icon={<Forward size={14} />}
                                  onClick={async () => {
                                    const { data } = await apiClient.get<Array<{ id: string; fullName: string; email: string; departmentId: string }>>('/auth/users');
                                    setForwardUsers(data.filter((u) => u.id !== user.id));
                                    setForwardTarget(op.id);
                                  }}
                                >
                                  Videresend
                                </Button>
                              </>
                            )}
                          </div>

                          {forwardTarget === op.id && (
                            <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-3">
                              <Label size="small" className="mb-2">Velg mottaker for videresending</Label>
                              <div className="max-h-40 space-y-1 overflow-y-auto">
                                {forwardUsers.map((u) => (
                                  <Button
                                    key={u.id}
                                    size="xsmall"
                                    variant="tertiary"
                                    className="w-full justify-start"
                                    onClick={() => {
                                      forwardApprovalMut.mutate(
                                        { opinionId: op.id, forwardTo: u.id },
                                        { onSuccess: () => setForwardTarget(null) }
                                      );
                                    }}
                                    loading={forwardApprovalMut.isPending}
                                  >
                                    {u.fullName} ({u.email})
                                  </Button>
                                ))}
                              </div>
                              <Button size="xsmall" variant="secondary" className="mt-2" onClick={() => setForwardTarget(null)}>
                                Avbryt
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {resolvedOpinions.map((op) => {
                  const statusLabel: Record<string, string> = {
                    given: 'Avgitt',
                    declined: 'Avslått',
                    approved: 'Godkjent',
                    rejected: 'Avslått',
                    forwarded: 'Videresendt',
                  };
                  const tagVariant = (op.status === 'given' || op.status === 'approved')
                    ? 'success' as const
                    : op.status === 'forwarded' ? 'info' as const : 'neutral' as const;

                  return (
                    <div key={op.id} className="rounded border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Tag variant={op.type === 'uttalelse' ? 'warning' : 'info'} size="xsmall">
                              {op.type === 'uttalelse' ? 'Uttalelse' : 'Godkjenning'}
                            </Tag>
                            <BodyShort size="small" className="font-medium">
                              {op.assignedToName}
                            </BodyShort>
                          </div>
                          <BodyShort size="small" className="text-gray-500">
                            {formatDate(op.resolvedAt ?? op.createdAt)}
                          </BodyShort>
                        </div>
                        <Tag variant={tagVariant} size="xsmall">
                          {statusLabel[op.status] ?? op.status}
                        </Tag>
                      </div>
                      {op.requestComment && (
                        <BodyShort size="small" className="mt-1 rounded bg-gray-100 p-2 text-gray-700 italic">
                          &laquo;{op.requestComment}&raquo;
                        </BodyShort>
                      )}
                      {op.opinionText && (
                        <BodyLong className="mt-2 whitespace-pre-wrap text-sm">
                          {op.opinionText}
                        </BodyLong>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Questions */}
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6">
            <QuestionThread caseId={id!} />
          </div>
        </div>

        {/* ─── Right: Sidebar Panel ──────────────────────── */}
        {sidebarOpen && (
          <div className="w-[30%] min-w-[280px] space-y-4">
            {/* Case header / metadata */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-start justify-between">
                <Heading size="small" level="2" className="pr-2">
                  {budgetCase.caseName}
                </Heading>
                <CaseStatusBadge status={budgetCase.status} size="medium" />
              </div>

              <BodyShort size="small" className="mb-3 text-gray-600">
                {CASE_TYPE_LABELS[budgetCase.caseType] ?? budgetCase.caseType}
              </BodyShort>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label size="small" className="text-gray-500">Kapittel</Label>
                    {canEdit ? (
                      <TextField label="" hideLabel size="small"
                        value={editedMetaFields.chapter ?? budgetCase.chapter ?? ''}
                        onChange={(e) => handleMetaFieldChange('chapter', e.target.value)}
                      />
                    ) : (
                      <BodyShort size="small">{budgetCase.chapter ?? '-'}</BodyShort>
                    )}
                  </div>
                  <div>
                    <Label size="small" className="text-gray-500">Post</Label>
                    {canEdit ? (
                      <TextField label="" hideLabel size="small"
                        value={editedMetaFields.post ?? budgetCase.post ?? ''}
                        onChange={(e) => handleMetaFieldChange('post', e.target.value)}
                      />
                    ) : (
                      <BodyShort size="small">{budgetCase.post ?? '-'}</BodyShort>
                    )}
                  </div>
                </div>

                <div>
                  <Label size="small" className="text-gray-500">FAGs forslag (1 000 kr)</Label>
                  {canEdit ? (
                    <TextField label="" hideLabel size="small" type="number"
                      value={editedMetaFields.amount ?? String(budgetCase.amount ?? '')}
                      onChange={(e) => handleMetaFieldChange('amount', e.target.value)}
                    />
                  ) : (
                    <BodyShort size="small">{formatAmountNOK(budgetCase.amount)}</BodyShort>
                  )}
                </div>

                <div>
                  <Label size="small" className="text-gray-500">FINs tilråding (1 000 kr)</Label>
                  {canEdit && userIsFin ? (
                    <TextField label="" hideLabel size="small" type="number"
                      value={editedMetaFields.finAmount ?? String(budgetCase.finAmount ?? '')}
                      onChange={(e) => handleMetaFieldChange('finAmount', e.target.value)}
                    />
                  ) : (
                    <BodyShort size="small">{formatAmountNOK(budgetCase.finAmount)}</BodyShort>
                  )}
                </div>

                <div>
                  <Label size="small" className="text-gray-500">Regjeringens vedtak (1 000 kr)</Label>
                  {canEdit && userIsFin && ['sendt_til_regjeringen', 'regjeringsbehandlet'].includes(status) ? (
                    <TextField label="" hideLabel size="small" type="number"
                      value={editedMetaFields.govAmount ?? String(budgetCase.govAmount ?? '')}
                      onChange={(e) => handleMetaFieldChange('govAmount', e.target.value)}
                    />
                  ) : (
                    <BodyShort size="small">{formatAmountNOK(budgetCase.govAmount)}</BodyShort>
                  )}
                </div>

                <div>
                  <Label size="small" className="text-gray-500">Departement</Label>
                  <BodyShort size="small">{budgetCase.departmentCode}</BodyShort>
                </div>

                {budgetCase.responsibleDivision && (
                  <div>
                    <Label size="small" className="text-gray-500">Ansvarlig avdeling</Label>
                    <BodyShort size="small">{budgetCase.responsibleDivision}</BodyShort>
                  </div>
                )}

                <div>
                  <Label size="small" className="text-gray-500">Ansvarlig saksbehandler</Label>
                  <div className="flex items-center gap-2">
                    <BodyShort size="small">{budgetCase.assignedToName ?? budgetCase.createdByName}</BodyShort>
                    {canChangeResponsible(role, user?.id ?? '', budgetCase.assignedTo) && !isClosed && (
                      <Button
                        size="xsmall"
                        variant="tertiary"
                        onClick={async () => {
                          const { data } = await apiClient.get<Array<{ id: string; fullName: string; email: string; role: string; departmentId: string }>>('/auth/users');
                          setDeptUsers(data.filter((u) => u.departmentId === budgetCase.departmentId));
                          setShowChangeResponsible(true);
                        }}
                      >
                        Endre
                      </Button>
                    )}
                  </div>
                </div>

                {showFinHandler && (
                  <div>
                    <Label size="small" className="text-gray-500">FIN-saksbehandler</Label>
                    <div className="flex items-center gap-2">
                      <BodyShort size="small">{budgetCase.finAssignedToName ?? 'Ikke tildelt'}</BodyShort>
                      {(isFinLeader(role) || user?.id === budgetCase.finAssignedTo || role === 'administrator') && !isClosed && (
                        <Button
                          size="xsmall"
                          variant="tertiary"
                          onClick={async () => {
                            const { data } = await apiClient.get<Array<{ id: string; fullName: string; email: string; role: string; departmentId: string }>>('/auth/users');
                            setFinUsers(data.filter((u) => u.role.includes('_fin') && u.id !== budgetCase.finAssignedTo));
                            setShowChangeFinResponsible(true);
                          }}
                        >
                          Endre
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label size="small" className="text-gray-500">Versjon</Label>
                  <BodyShort size="small">{budgetCase.version}</BodyShort>
                </div>

                <div>
                  <Label size="small" className="text-gray-500">Sist oppdatert</Label>
                  <BodyShort size="small">{formatDate(budgetCase.updatedAt)}</BodyShort>
                </div>
              </div>

              {/* Change responsible handler dialog */}
              {showChangeResponsible && (
                <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-3">
                  <Label size="small" className="mb-2">Velg ny ansvarlig saksbehandler</Label>
                  <div className="space-y-1">
                    {deptUsers.filter((u) => u.id !== budgetCase.assignedTo).map((u) => (
                      <Button
                        key={u.id}
                        size="xsmall"
                        variant="tertiary"
                        className="w-full justify-start"
                        onClick={() => {
                          changeResponsibleMut.mutate(u.id, {
                            onSuccess: () => setShowChangeResponsible(false),
                          });
                        }}
                        loading={changeResponsibleMut.isPending}
                      >
                        {u.fullName} ({u.email})
                      </Button>
                    ))}
                  </div>
                  <Button size="xsmall" variant="secondary" className="mt-2" onClick={() => setShowChangeResponsible(false)}>
                    Avbryt
                  </Button>
                </div>
              )}

              {/* Change FIN-saksbehandler dialog */}
              {showChangeFinResponsible && (
                <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-3">
                  <Label size="small" className="mb-2">Velg ny FIN-saksbehandler</Label>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {finUsers.map((u) => (
                      <Button
                        key={u.id}
                        size="xsmall"
                        variant="tertiary"
                        className="w-full justify-start"
                        onClick={() => {
                          changeFinResponsibleMut.mutate(u.id, {
                            onSuccess: () => setShowChangeFinResponsible(false),
                          });
                        }}
                        loading={changeFinResponsibleMut.isPending}
                      >
                        {u.fullName} ({u.email})
                      </Button>
                    ))}
                  </div>
                  <Button size="xsmall" variant="secondary" className="mt-2" onClick={() => setShowChangeFinResponsible(false)}>
                    Avbryt
                  </Button>
                </div>
              )}
            </div>

            {/* Comments panel */}
            {canEdit && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <CommentPanel
                  editor={editorRef.current}
                  caseId={id ?? ''}
                  comments={comments}
                  currentUserId={user?.id ?? ''}
                  activeCommentId={activeCommentId}
                  onSetActiveComment={setActiveCommentId}
                  onCreateComment={(commentId, text, anchorText) => {
                    createCommentMut.mutate({ commentId, commentText: text, anchorText });
                  }}
                  onReply={(commentDbId, text) => {
                    replyToCommentMut.mutate({ commentDbId, payload: { commentText: text } });
                  }}
                  onResolve={(comment) => {
                    resolveCommentMut.mutate(comment.id);
                    editorRef.current?.commands.resolveCommentMark(comment.commentId);
                  }}
                  onReopen={(comment) => {
                    reopenCommentMut.mutate(comment.id);
                    editorRef.current?.commands.reopenCommentMark(comment.commentId);
                  }}
                  onDelete={(comment) => {
                    deleteCommentMut.mutate(comment.id);
                    editorRef.current?.commands.removeCommentMark(comment.commentId);
                  }}
                />
              </div>
            )}

            {/* Section navigation */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <SectionNavigation
                fagFields={fagFields}
                finFields={FIN_FIELDS}
                showFinFields={showFinFields}
                govConclusionField={showGovConclusion ? GOV_CONCLUSION_FIELD : null}
              />
            </div>

          </div>
        )}
      </div>

      {/* Return modal */}
      <ReturnCaseModal
        open={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onConfirm={(reason) =>
          handleStatusChange('returnert_til_fag', reason)
        }
        loading={changeStatusMut.isPending}
      />

      {/* Reject modal */}
      <ReturnCaseModal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={(reason) =>
          handleStatusChange('avvist_av_fin', reason)
        }
        loading={changeStatusMut.isPending}
        variant="reject"
      />
    </div>
  );
}
