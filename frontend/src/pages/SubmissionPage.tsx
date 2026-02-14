import { useState } from 'react';
import {
  Heading,
  BodyShort,
  Alert,
  Loader,
  Table,
  Checkbox,
  Button,
  Tag,
} from '@navikt/ds-react';
import { Send, CheckCircle2 } from 'lucide-react';
import { useCases } from '../hooks/useCases.ts';
import { useSubmissions, useCreateSubmission } from '../hooks/useSubmissions.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { CASE_TYPE_LABELS } from '../lib/caseTypes.ts';
import { formatAmountNOK, formatDate } from '../lib/formatters.ts';

export function SubmissionPage() {
  const user = useAuthStore((s) => s.user);
  const selectedRound = useUiStore((s) => s.selectedRound);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { data: cases, isLoading: casesLoading } = useCases({
    budget_round_id: selectedRound?.id,
    department_id: user?.departmentId,
    status: 'godkjent_pol',
  });

  const { data: submissions, isLoading: subsLoading } = useSubmissions({
    budget_round_id: selectedRound?.id,
    department_id: user?.departmentId,
  });

  const createSubmission = useCreateSubmission();

  if (!selectedRound) {
    return (
      <Alert variant="warning">
        Du må velge en budsjettrunde først.{' '}
        <a href="/budget-rounds" className="underline">
          Velg budsjettrunde
        </a>
      </Alert>
    );
  }

  const toggleCase = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!cases) return;
    if (selectedIds.size === cases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cases.map((c) => c.id)));
    }
  };

  const handleSubmit = () => {
    if (selectedIds.size === 0 || !selectedRound) return;
    const isSupplement = (submissions?.length ?? 0) > 0;
    createSubmission.mutate(
      {
        budgetRoundId: selectedRound.id,
        caseIds: Array.from(selectedIds),
        isSupplement,
      },
      {
        onSuccess: () => {
          setSelectedIds(new Set());
          setSubmitSuccess(true);
        },
      }
    );
  };

  return (
    <div>
      <Heading size="large" level="1" className="mb-1">
        Send innspill til FIN
      </Heading>
      <BodyShort className="mb-6 text-gray-600">
        {selectedRound.name} &mdash; Velg godkjente saker som skal sendes.
      </BodyShort>

      {submitSuccess && (
        <Alert variant="success" className="mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            Innspill er sendt til Finansdepartementet.
          </div>
        </Alert>
      )}

      {/* Klarerte cases */}
      <div className="mb-8">
        <Heading size="small" level="2" className="mb-3">
          Godkjente saker (POL)
        </Heading>

        {casesLoading && (
          <div className="flex justify-center py-6">
            <Loader size="large" title="Laster saker..." />
          </div>
        )}

        {cases && cases.length === 0 && (
          <Alert variant="info">
            Ingen godkjente saker tilgjengelig for innsending.
          </Alert>
        )}

        {cases && cases.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <Table size="small">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell className="w-10">
                      <Checkbox
                        checked={selectedIds.size === cases.length}
                        indeterminate={
                          selectedIds.size > 0 &&
                          selectedIds.size < cases.length
                        }
                        onChange={toggleAll}
                        hideLabel
                      >
                        Velg alle
                      </Checkbox>
                    </Table.HeaderCell>
                    <Table.HeaderCell>Saksnavn</Table.HeaderCell>
                    <Table.HeaderCell>Type</Table.HeaderCell>
                    <Table.HeaderCell>Kap/post</Table.HeaderCell>
                    <Table.HeaderCell>Beløp (1 000 kr)</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {cases.map((c) => (
                    <Table.Row
                      key={c.id}
                      selected={selectedIds.has(c.id)}
                    >
                      <Table.DataCell>
                        <Checkbox
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleCase(c.id)}
                          hideLabel
                        >
                          Velg {c.caseName}
                        </Checkbox>
                      </Table.DataCell>
                      <Table.DataCell className="font-medium">
                        {c.caseName}
                      </Table.DataCell>
                      <Table.DataCell>
                        {CASE_TYPE_LABELS[c.caseType] ?? c.caseType}
                      </Table.DataCell>
                      <Table.DataCell>
                        {c.chapter && c.post
                          ? `${c.chapter}/${c.post}`
                          : c.chapter ?? '-'}
                      </Table.DataCell>
                      <Table.DataCell className="text-right">
                        {formatAmountNOK(c.amount)}
                      </Table.DataCell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <BodyShort size="small" className="text-gray-600">
                {selectedIds.size} av {cases.length} saker valgt
              </BodyShort>
              <Button
                onClick={handleSubmit}
                disabled={selectedIds.size === 0}
                loading={createSubmission.isPending}
                icon={<Send size={16} />}
              >
                Send til FIN ({selectedIds.size})
              </Button>
            </div>
          </>
        )}

        {createSubmission.isError && (
          <Alert variant="error" className="mt-4">
            Kunne ikke sende innspill. Prøv igjen.
          </Alert>
        )}
      </div>

      {/* Previous submissions */}
      <div>
        <Heading size="small" level="2" className="mb-3">
          Tidligere innsendinger
        </Heading>

        {subsLoading && (
          <div className="flex justify-center py-6">
            <Loader size="medium" title="Laster innsendinger..." />
          </div>
        )}

        {submissions && submissions.length === 0 && (
          <BodyShort size="small" className="text-gray-500">
            Ingen tidligere innsendinger.
          </BodyShort>
        )}

        {submissions && submissions.length > 0 && (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BodyShort weight="semibold">
                      Innsending {formatDate(sub.submittedAt)}
                    </BodyShort>
                    {sub.isSupplement && (
                      <Tag variant="alt1" size="xsmall">
                        Tillegg
                      </Tag>
                    )}
                  </div>
                  <BodyShort size="small" className="text-gray-500">
                    av {sub.submittedByName}
                  </BodyShort>
                </div>
                <div className="text-sm text-gray-600">
                  {sub.cases.length} saker:{' '}
                  {sub.cases.map((c) => c.caseName).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
