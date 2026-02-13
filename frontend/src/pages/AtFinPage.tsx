import { useNavigate } from 'react-router-dom';
import {
  Heading,
  BodyShort,
  Alert,
  Loader,
  Table,
  Tag,
} from '@navikt/ds-react';
import { useCases } from '../hooks/useCases.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { CaseStatusBadge } from '../components/cases/CaseStatusBadge.tsx';
import { CASE_TYPE_LABELS } from '../lib/caseTypes.ts';
import { AT_FIN_STATUSES, STATUS_LABELS } from '../lib/statusFlow.ts';
import { formatAmountNOK, formatDateShort } from '../lib/formatters.ts';

export function AtFinPage() {
  const user = useAuthStore((s) => s.user);
  const selectedRound = useUiStore((s) => s.selectedRound);
  const navigate = useNavigate();

  // Fetch all cases for the current department and round
  const filters = {
    budget_round_id: selectedRound?.id,
    department_id: user?.departmentId,
  };

  const { data: allCases, isLoading, error } = useCases(filters);

  // Filter client-side for cases "at FIN" (sendt_til_fin through sendt_til_regjeringen)
  const atFinStatuses = [...AT_FIN_STATUSES, 'sendt_til_regjeringen', 'regjeringsbehandlet'];
  const cases = allCases?.filter((c) => atFinStatuses.includes(c.status));

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

  return (
    <div>
      <div className="mb-6">
        <Heading size="large" level="1">
          Saker hos FIN
        </Heading>
        <BodyShort className="text-gray-600">
          Oversikt over saker som er sendt til eller behandles av Finansdepartementet.
          FINs vurdering vises først etter at saken er sendt til regjeringen.
        </BodyShort>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader size="xlarge" title="Laster saker..." />
        </div>
      )}

      {error && (
        <Alert variant="error">Kunne ikke laste saker.</Alert>
      )}

      {cases && cases.length === 0 && !isLoading && (
        <Alert variant="info">
          Ingen saker er hos FIN for øyeblikket i denne budsjettrunden.
        </Alert>
      )}

      {cases && cases.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Saksnavn</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>Kap/post</Table.HeaderCell>
                <Table.HeaderCell>Beløp (1 000 kr)</Table.HeaderCell>
                <Table.HeaderCell>Status hos FIN</Table.HeaderCell>
                <Table.HeaderCell>Oppdatert</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {cases.map((c) => (
                <Table.Row
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <Table.DataCell className="font-medium text-[var(--color-primary)]">
                    {c.caseName}
                  </Table.DataCell>
                  <Table.DataCell>
                    {CASE_TYPE_LABELS[c.caseType] ?? c.caseType}
                  </Table.DataCell>
                  <Table.DataCell>
                    {c.chapter && c.post ? `${c.chapter}/${c.post}` : c.chapter ?? '-'}
                  </Table.DataCell>
                  <Table.DataCell className="text-right">
                    {formatAmountNOK(c.amount)}
                  </Table.DataCell>
                  <Table.DataCell>
                    <CaseStatusBadge status={c.status} />
                  </Table.DataCell>
                  <Table.DataCell>{formatDateShort(c.updatedAt)}</Table.DataCell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </div>
  );
}
