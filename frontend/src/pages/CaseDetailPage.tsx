import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useCase, useSaveContent, useChangeStatus, useChangeResponsible, useCreateOpinion, useResolveOpinion, useForwardApproval } from '../hooks/useCases.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { CaseStatusBadge } from '../components/cases/CaseStatusBadge.tsx';
import { CaseWorkflowBar } from '../components/cases/CaseWorkflowBar.tsx';
import { ReturnCaseModal } from '../components/cases/ReturnCaseModal.tsx';
import { QuestionThread } from '../components/questions/QuestionThread.tsx';
import { CASE_TYPE_LABELS, CASE_TYPE_FIELDS, FIN_FIELDS } from '../lib/caseTypes.ts';
import { STATUS_LABELS, FAG_STATUS_FLOW, FIN_STATUS_FLOW, POST_FIN_FLOW, FIN_FIELDS_VISIBLE_TO_FAG } from '../lib/statusFlow.ts';
import { formatAmountNOK, formatDate } from '../lib/formatters.ts';
import { isFagRole, isFinRole, canReturnToFag, canChangeResponsible } from '../lib/roles.ts';
import type { CaseContent, CaseOpinion } from '../lib/types.ts';
import apiClient from '../api/client.ts';

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';

  const { data: budgetCase, isLoading, error } = useCase(id);
  const saveContentMut = useSaveContent(id ?? '');
  const changeStatusMut = useChangeStatus(id ?? '');
  const changeResponsibleMut = useChangeResponsible(id ?? '');
  const createOpinionMut = useCreateOpinion(id ?? '');
  const resolveOpinionMut = useResolveOpinion(id ?? '');
  const forwardApprovalMut = useForwardApproval(id ?? '');

  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [showChangeResponsible, setShowChangeResponsible] = useState(false);
  const [deptUsers, setDeptUsers] = useState<Array<{ id: string; fullName: string; email: string; role: string }>>([]);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    status: string;
    label: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusComment, setStatusComment] = useState('');
  const [opinionAssignee, setOpinionAssignee] = useState('');
  const [showOpinionForm, setShowOpinionForm] = useState<false | 'uttalelse' | 'godkjenning'>(false);
  const [opinionResponses, setOpinionResponses] = useState<Record<string, string>>({});
  const [forwardTarget, setForwardTarget] = useState<string | null>(null);
  const [forwardUsers, setForwardUsers] = useState<Array<{ id: string; fullName: string; email: string }>>([]);

  const userIsFag = isFagRole(role);
  const userIsFin = isFinRole(role);

  const content = budgetCase?.currentContent;
  const caseType = budgetCase?.caseType ?? '';
  const status = budgetCase?.status ?? '';
  const fagFields = CASE_TYPE_FIELDS[caseType] ?? [];

  // Determine editability
  const fagCanEdit = userIsFag && ['draft', 'under_arbeid', 'returnert_til_fag'].includes(status);
  const finCanEdit = userIsFin && ['sendt_til_fin', 'under_vurdering_fin'].includes(status);

  // Punkt 3: FAG cannot see FIN fields between sendt_til_fin and ferdigbehandlet_fin
  // FAG CAN see FIN fields after sendt_til_regjeringen/regjeringsbehandlet
  // FIN can always see FIN fields when status >= sendt_til_fin
  const showFinFields = userIsFin
    || (userIsFag && FIN_FIELDS_VISIBLE_TO_FAG.includes(status));

  const getFieldValue = useCallback(
    (key: string) => {
      if (key in editedFields) return editedFields[key];
      if (content) return (content[key as keyof CaseContent] as string) ?? '';
      return '';
    },
    [editedFields, content]
  );

  const handleFieldChange = (key: string, value: string) => {
    setEditedFields((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const handleSave = () => {
    if (!id) return;
    const payload: Record<string, string | null> = {};
    for (const f of fagFields) {
      payload[f.key] = getFieldValue(f.key) || null;
    }
    if (showFinFields) {
      for (const f of FIN_FIELDS) {
        payload[f.key] = getFieldValue(f.key) || null;
      }
    }
    for (const [k, v] of Object.entries(editedFields)) {
      payload[k] = v || null;
    }
    saveContentMut.mutate(payload, {
      onSuccess: () => {
        setEditedFields({});
        setSaveSuccess(true);
      },
    });
  };

  // Compute next status for the current role
  const getNextStatuses = (): Array<{ status: string; label: string }> => {
    const result: Array<{ status: string; label: string }> = [];

    if (userIsFag) {
      const flow = FAG_STATUS_FLOW;
      const idx = flow.indexOf(status);
      if (status === 'returnert_til_fag') {
        result.push({
          status: 'under_arbeid',
          label: 'Gjenoppta arbeid',
        });
      } else if (idx >= 0 && idx < flow.length - 1) {
        const next = flow[idx + 1];
        result.push({
          status: next,
          label: `Flytt til ${STATUS_LABELS[next]}`,
        });
      }
    }

    if (userIsFin) {
      const flow = FIN_STATUS_FLOW;
      const idx = flow.indexOf(status);
      if (idx >= 0 && idx < flow.length - 1) {
        const next = flow[idx + 1];
        result.push({
          status: next,
          label: `Flytt til ${STATUS_LABELS[next]}`,
        });
      }

      // Post-FIN flow: ferdigbehandlet_fin → sendt_til_regjeringen → regjeringsbehandlet
      const postIdx = POST_FIN_FLOW.indexOf(status);
      if (postIdx >= 0 && postIdx < POST_FIN_FLOW.length - 1) {
        const next = POST_FIN_FLOW[postIdx + 1];
        // Only underdirektor_fin can do sendt_til_regjeringen → regjeringsbehandlet
        if (next === 'regjeringsbehandlet' && role !== 'underdirektor_fin') {
          // saksbehandler_fin cannot do this transition
        } else {
          // Avoid duplicate if already added from FIN_STATUS_FLOW
          if (!result.some((r) => r.status === next)) {
            result.push({
              status: next,
              label: `Flytt til ${STATUS_LABELS[next]}`,
            });
          }
        }
      }

      if (canReturnToFag(role) && (status === 'sendt_til_fin' || status === 'under_vurdering_fin')) {
        result.push({
          status: 'returnert_til_fag',
          label: 'Returner til FAG',
        });
      }
    }

    return result;
  };

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
      { assignedTo: opinionAssignee.trim(), type: showOpinionForm },
      {
        onSuccess: () => {
          setOpinionAssignee('');
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
  const hasEdits = Object.keys(editedFields).length > 0;
  const opinions = budgetCase.opinions ?? [];
  const pendingOpinions = opinions.filter((o) => o.status === 'pending');
  const resolvedOpinions = opinions.filter((o) => o.status !== 'pending');
  const isReturnedStatus = status === 'returnert_til_fag';
  const isClosed = status === 'regjeringsbehandlet';
  const isLocked = pendingOpinions.length > 0;
  const isResponsible = user?.id === budgetCase.assignedTo;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="tertiary"
          size="small"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate('/cases')}
        >
          Tilbake
        </Button>
        <Button
          variant="tertiary"
          size="small"
          icon={<History size={16} />}
          onClick={() => navigate(`/cases/${id}/history`)}
        >
          Historikk
        </Button>
      </div>

      {/* Case header */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <Heading size="medium" level="1">
              {budgetCase.caseName}
            </Heading>
            <BodyShort className="mt-1 text-gray-600">
              {CASE_TYPE_LABELS[budgetCase.caseType] ?? budgetCase.caseType}
              {budgetCase.chapter && ` | Kap. ${budgetCase.chapter}`}
              {budgetCase.post && ` Post ${budgetCase.post}`}
            </BodyShort>
          </div>
          <CaseStatusBadge status={budgetCase.status} size="medium" />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <Label size="small" className="text-gray-500">
              Beløp (1 000 kr)
            </Label>
            <BodyShort>{formatAmountNOK(budgetCase.amount)}</BodyShort>
          </div>
          <div>
            <Label size="small" className="text-gray-500">
              Departement
            </Label>
            <BodyShort>{budgetCase.departmentCode}</BodyShort>
          </div>
          {budgetCase.responsibleDivision && (
            <div>
              <Label size="small" className="text-gray-500">
                Ansvarlig avdeling
              </Label>
              <BodyShort>{budgetCase.responsibleDivision}</BodyShort>
            </div>
          )}
          <div>
            <Label size="small" className="text-gray-500">
              Ansvarlig saksbehandler
            </Label>
            <div className="flex items-center gap-2">
              <BodyShort>{budgetCase.assignedToName ?? budgetCase.createdByName}</BodyShort>
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
          <div>
            <Label size="small" className="text-gray-500">
              Sist oppdatert
            </Label>
            <BodyShort>{formatDate(budgetCase.updatedAt)}</BodyShort>
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
      </div>

      {/* Workflow bar */}
      <div className="mb-4">
        <CaseWorkflowBar currentStatus={budgetCase.status} opinions={budgetCase.opinions} />
      </div>

      {/* Returned banner */}
      {isReturnedStatus && (
        <Alert variant="error" size="small" className="mb-4">
          Saken er returnert til FAG for revisjon.
        </Alert>
      )}

      {/* Closed banner */}
      {isClosed && (
        <Alert variant="success" size="small" className="mb-4">
          Saken er regjeringsbehandlet og lukket.
        </Alert>
      )}

      {/* Action buttons */}
      {nextStatuses.length > 0 && !isClosed && (
        <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-4">
          <Label size="small" className="mr-2 self-center text-gray-500">
            Handlinger:
          </Label>

          {(fagCanEdit || finCanEdit) && (
            <Button
              size="small"
              variant="secondary"
              onClick={handleSave}
              loading={saveContentMut.isPending}
              icon={<Save size={14} />}
              disabled={!hasEdits}
            >
              Lagre innhold
            </Button>
          )}

          {nextStatuses.map((action) => {
            if (action.status === 'returnert_til_fag') {
              return (
                <Button
                  key={action.status}
                  size="small"
                  variant="danger"
                  icon={<RotateCcw size={14} />}
                  onClick={() => setShowReturnModal(true)}
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
                variant="primary"
                icon={<ArrowRightCircle size={14} />}
                onClick={() => setConfirmAction(action)}
                disabled={isLocked}
              >
                {action.label}
              </Button>
            );
          })}

          {isLocked && (
            <BodyShort size="small" className="self-center text-amber-700">
              Saken er låst – ventende uttalelser/godkjenninger
            </BodyShort>
          )}
        </div>
      )}

      {/* Save success message */}
      {saveSuccess && (
        <Alert variant="success" size="small" className="mb-4">
          Innholdet er lagret (versjon {budgetCase.version}).
        </Alert>
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
              onClick={() =>
                handleStatusChange(confirmAction.status)
              }
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

      {/* FAG content fields */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-6">
        <Heading size="small" level="2" className="mb-4">
          Faginnhold
        </Heading>

        <div className="space-y-4">
          {fagFields.map((field) => {
            const value = getFieldValue(field.key);
            const isEditable = fagCanEdit;

            if (isEditable) {
              return (
                <Textarea
                  key={field.key}
                  label={field.label}
                  value={value}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  minRows={3}
                  resize="vertical"
                />
              );
            }

            return (
              <div key={field.key}>
                <Label size="small" className="text-gray-600">
                  {field.label}
                </Label>
                <BodyLong className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
                  {value || '-'}
                </BodyLong>
              </div>
            );
          })}
        </div>
      </div>

      {/* FIN fields */}
      {showFinFields && (
        <div className="mb-4 rounded-lg border-2 border-[var(--color-fin)]/30 bg-white p-6">
          <Heading size="small" level="2" className="mb-4" style={{ color: 'var(--color-fin)' }}>
            FINs vurdering
          </Heading>

          <div className="space-y-4">
            {FIN_FIELDS.map((field) => {
              const value = getFieldValue(field.key);
              const isEditable = finCanEdit;

              if (isEditable) {
                return (
                  <Textarea
                    key={field.key}
                    label={field.label}
                    value={value}
                    onChange={(e) =>
                      handleFieldChange(field.key, e.target.value)
                    }
                    minRows={3}
                    resize="vertical"
                  />
                );
              }

              return (
                <div key={field.key}>
                  <Label size="small" className="text-gray-600">
                    {field.label}
                  </Label>
                  <BodyLong className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
                    {value || '-'}
                  </BodyLong>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Opinions / Uttalelser og Godkjenninger */}
      {opinions.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-white p-6">
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
                    </div>
                    <Tag variant="warning" size="xsmall">Ventende</Tag>
                  </div>

                  {/* If the current user is the assignee, show response form */}
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

                      {/* Forward user picker */}
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

      {/* Request opinion/approval buttons - only visible for responsible handler */}
      {!isClosed && isResponsible && (
        <div className="mb-4">
          {showOpinionForm ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <Heading size="xsmall" level="3" className="mb-3">
                {showOpinionForm === 'uttalelse' ? 'Til uttalelse' : 'Til godkjenning'}
              </Heading>
              <TextField
                label="Bruker-ID (e-post eller ID)"
                value={opinionAssignee}
                onChange={(e) => setOpinionAssignee(e.target.value)}
                size="small"
                className="mb-3"
              />
              <div className="flex gap-2">
                <Button
                  size="small"
                  onClick={handleRequestOpinion}
                  loading={createOpinionMut.isPending}
                  icon={showOpinionForm === 'uttalelse' ? <MessageSquarePlus size={14} /> : <ShieldCheck size={14} />}
                >
                  Send forespørsel
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setShowOpinionForm(false)}
                >
                  Avbryt
                </Button>
              </div>
              {createOpinionMut.isError && (
                <Alert variant="error" size="small" className="mt-2">
                  Kunne ikke sende forespørsel. Sjekk at bruker-ID er gyldig.
                </Alert>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="small"
                variant="tertiary"
                icon={<MessageSquarePlus size={14} />}
                onClick={() => setShowOpinionForm('uttalelse')}
              >
                Til uttalelse
              </Button>
              <Button
                size="small"
                variant="tertiary"
                icon={<ShieldCheck size={14} />}
                onClick={() => setShowOpinionForm('godkjenning')}
              >
                Til godkjenning
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Questions */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-6">
        <QuestionThread caseId={id!} />
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
    </div>
  );
}
