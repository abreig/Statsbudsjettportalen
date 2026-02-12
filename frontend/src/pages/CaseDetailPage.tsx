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
} from '@navikt/ds-react';
import {
  ArrowLeft,
  Save,
  ArrowRightCircle,
  RotateCcw,
  History,
  CheckCircle2,
} from 'lucide-react';
import { useCase, useSaveContent, useChangeStatus } from '../hooks/useCases.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { CaseStatusBadge } from '../components/cases/CaseStatusBadge.tsx';
import { CaseWorkflowBar } from '../components/cases/CaseWorkflowBar.tsx';
import { ReturnCaseModal } from '../components/cases/ReturnCaseModal.tsx';
import { QuestionThread } from '../components/questions/QuestionThread.tsx';
import { CASE_TYPE_LABELS, CASE_TYPE_FIELDS, FIN_FIELDS } from '../lib/caseTypes.ts';
import { STATUS_LABELS, FAG_STATUS_FLOW, FIN_STATUS_FLOW } from '../lib/statusFlow.ts';
import { formatAmountNOK, formatDate } from '../lib/formatters.ts';
import { isFagRole, isFinRole, canReturnToFag } from '../lib/roles.ts';
import type { CaseContent } from '../lib/types.ts';

const FIN_VISIBLE_STATUSES = [
  'sendt_til_fin',
  'under_vurdering_fin',
  'returnert_til_fag',
  'ferdigbehandlet_fin',
];

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';

  const { data: budgetCase, isLoading, error } = useCase(id);
  const saveContentMut = useSaveContent(id ?? '');
  const changeStatusMut = useChangeStatus(id ?? '');

  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    status: string;
    label: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const userIsFag = isFagRole(role);
  const userIsFin = isFinRole(role);

  const content = budgetCase?.currentContent;
  const caseType = budgetCase?.caseType ?? '';
  const status = budgetCase?.status ?? '';
  const fagFields = CASE_TYPE_FIELDS[caseType] ?? [];

  // Determine editability
  const fagCanEdit = userIsFag && ['draft', 'under_arbeid', 'returnert_til_fag'].includes(status);
  const finCanEdit = userIsFin && ['sendt_til_fin', 'under_vurdering_fin'].includes(status);
  const showFinFields = userIsFin || FIN_VISIBLE_STATUSES.includes(status);

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
    // Collect all fields - both FAG and FIN
    const payload: Record<string, string | null> = {};
    for (const f of fagFields) {
      payload[f.key] = getFieldValue(f.key) || null;
    }
    if (showFinFields) {
      for (const f of FIN_FIELDS) {
        payload[f.key] = getFieldValue(f.key) || null;
      }
    }
    // Apply edits
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
      if (canReturnToFag(role) && (status === 'sendt_til_fin' || status === 'under_vurdering_fin')) {
        result.push({
          status: 'returnert_til_fag',
          label: 'Returner til FAG',
        });
      }
    }

    return result;
  };

  const handleStatusChange = (newStatus: string, reason?: string) => {
    changeStatusMut.mutate(
      { status: newStatus, reason },
      {
        onSuccess: () => {
          setConfirmAction(null);
          setShowReturnModal(false);
        },
      }
    );
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
        Kunne ikke laste saken. Proov igjen senere.
      </Alert>
    );
  }

  const nextStatuses = getNextStatuses();
  const hasEdits = Object.keys(editedFields).length > 0;

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
              Belop (1 000 kr)
            </Label>
            <BodyShort>{formatAmountNOK(budgetCase.amount)}</BodyShort>
          </div>
          <div>
            <Label size="small" className="text-gray-500">
              Avdeling
            </Label>
            <BodyShort>{budgetCase.departmentCode}</BodyShort>
          </div>
          <div>
            <Label size="small" className="text-gray-500">
              Opprettet av
            </Label>
            <BodyShort>{budgetCase.createdByName}</BodyShort>
          </div>
          <div>
            <Label size="small" className="text-gray-500">
              Sist oppdatert
            </Label>
            <BodyShort>{formatDate(budgetCase.updatedAt)}</BodyShort>
          </div>
        </div>
      </div>

      {/* Workflow bar */}
      <div className="mb-4">
        <CaseWorkflowBar currentStatus={budgetCase.status} />
      </div>

      {/* Action buttons */}
      {nextStatuses.length > 0 && (
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
              >
                {action.label}
              </Button>
            );
          })}
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
          <div className="flex items-center justify-between">
            <BodyShort>
              Er du sikker pa at du vil flytte saken til{' '}
              <strong>{STATUS_LABELS[confirmAction.status]}</strong>?
            </BodyShort>
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
                onClick={() => setConfirmAction(null)}
              >
                Avbryt
              </Button>
            </div>
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
