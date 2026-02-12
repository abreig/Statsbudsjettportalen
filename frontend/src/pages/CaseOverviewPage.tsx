import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heading,
  BodyShort,
  Alert,
  Loader,
  Table,
  Search,
  Select,
  Button,
} from '@navikt/ds-react';
import { PlusCircle } from 'lucide-react';
import { useCases } from '../hooks/useCases.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { CaseStatusBadge } from '../components/cases/CaseStatusBadge.tsx';
import { CASE_TYPE_LABELS } from '../lib/caseTypes.ts';
import { ALL_STATUSES, STATUS_LABELS } from '../lib/statusFlow.ts';
import { formatAmountNOK, formatDateShort } from '../lib/formatters.ts';
import { isFagRole, canCreateCase } from '../lib/roles.ts';

export function CaseOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const selectedRound = useUiStore((s) => s.selectedRound);
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filters = {
    budget_round_id: selectedRound?.id,
    department_id: user && isFagRole(user.role) ? user.departmentId : undefined,
    status: statusFilter || undefined,
    case_type: typeFilter || undefined,
    search: searchTerm || undefined,
  };

  const { data: cases, isLoading, error } = useCases(filters);

  if (!selectedRound) {
    return (
      <Alert variant="warning">
        Du ma velge en budsjettrunde forst.{' '}
        <a href="/budget-rounds" className="underline">
          Velg budsjettrunde
        </a>
      </Alert>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading size="large" level="1">
            Saksoversikt
          </Heading>
          <BodyShort className="text-gray-600">
            {selectedRound.name}
          </BodyShort>
        </div>
        {user && canCreateCase(user.role) && (
          <Button
            onClick={() => navigate('/cases/new')}
            icon={<PlusCircle size={18} />}
          >
            Opprett sak
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="w-64">
          <Search
            label="Sok i saker"
            variant="simple"
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            onClear={() => setSearchTerm('')}
          />
        </div>
        <Select
          label="Status"
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Alle statuser</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select
          label="Sakstype"
          size="small"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Alle typer</option>
          {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
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
        <Alert variant="info">Ingen saker funnet med valgte filtre.</Alert>
      )}

      {cases && cases.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Saksnavn</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>Kap/post</Table.HeaderCell>
                <Table.HeaderCell>Belop (1 000 kr)</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Avdeling</Table.HeaderCell>
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
                  <Table.DataCell>{c.departmentCode}</Table.DataCell>
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
