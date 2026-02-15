import { useState, useMemo } from 'react';
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
  Switch,
} from '@navikt/ds-react';
import { PlusCircle } from 'lucide-react';
import { useCases } from '../hooks/useCases.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { CaseStatusBadge } from '../components/cases/CaseStatusBadge.tsx';
import { CASE_TYPE_LABELS } from '../lib/caseTypes.ts';
import { ALL_STATUSES, STATUS_LABELS, FIN_VISIBLE_STATUSES } from '../lib/statusFlow.ts';
import { formatAmountNOK, formatDateShort } from '../lib/formatters.ts';
import { isFagRole, isFinRole, canCreateCase } from '../lib/roles.ts';

export function CaseOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const selectedRound = useUiStore((s) => s.selectedRound);
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [chapterFilter, setChapterFilter] = useState('');
  const [postFilter, setPostFilter] = useState('');
  const [myDepartments, setMyDepartments] = useState(true);

  const userIsFag = user ? isFagRole(user.role) : false;
  const userIsFin = user ? isFinRole(user.role) : false;

  // For FIN users, only show FIN-visible statuses
  const statusOptions = userIsFin
    ? ALL_STATUSES.filter((s) => FIN_VISIBLE_STATUSES.includes(s))
    : ALL_STATUSES;

  const filters = {
    budget_round_id: selectedRound?.id,
    department_id: userIsFag ? user?.departmentId : undefined,
    status: statusFilter || undefined,
    case_type: typeFilter || undefined,
    search: searchTerm || undefined,
    division: divisionFilter || undefined,
    my_departments: userIsFin ? myDepartments : undefined,
  };

  const { data: cases, isLoading, error } = useCases(filters);

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

  // Extract unique divisions from cases for filter dropdown
  const divisions = cases
    ? [...new Set(cases.map((c) => c.responsibleDivision).filter(Boolean))]
    : [];

  // Extract unique chapters and posts for filters
  const chapters = useMemo(() => {
    if (!cases) return [];
    return [...new Set(cases.map((c) => c.chapter).filter(Boolean))].sort();
  }, [cases]);

  const postsForChapter = useMemo(() => {
    if (!cases || !chapterFilter) return [];
    return [...new Set(
      cases.filter((c) => c.chapter === chapterFilter).map((c) => c.post).filter(Boolean)
    )].sort();
  }, [cases, chapterFilter]);

  // Apply chapter/post filters client-side (already fetched)
  const filteredCases = useMemo(() => {
    if (!cases) return [];
    let result = divisionFilter
      ? cases.filter((c) => c.responsibleDivision === divisionFilter)
      : cases;
    if (chapterFilter) {
      result = result.filter((c) => c.chapter === chapterFilter);
    }
    if (postFilter) {
      result = result.filter((c) => c.post === postFilter);
    }
    return result;
  }, [cases, divisionFilter, chapterFilter, postFilter]);

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
            label="Søk i saker"
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
          {statusOptions.map((s) => (
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
        {chapters.length > 0 && (
          <Select
            label="Kapittel"
            size="small"
            value={chapterFilter}
            onChange={(e) => {
              setChapterFilter(e.target.value);
              setPostFilter('');
            }}
          >
            <option value="">Alle kapitler</option>
            {chapters.map((ch) => (
              <option key={ch!} value={ch!}>
                {ch}
              </option>
            ))}
          </Select>
        )}
        {chapterFilter && postsForChapter.length > 0 && (
          <Select
            label="Post"
            size="small"
            value={postFilter}
            onChange={(e) => setPostFilter(e.target.value)}
          >
            <option value="">Alle poster</option>
            {postsForChapter.map((p) => (
              <option key={p!} value={p!}>
                {p}
              </option>
            ))}
          </Select>
        )}
        {divisions.length > 0 && (
          <Select
            label="Avdeling"
            size="small"
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
          >
            <option value="">Alle avdelinger</option>
            {divisions.map((d) => (
              <option key={d!} value={d!}>
                {d}
              </option>
            ))}
          </Select>
        )}
        {userIsFin && (
          <div className="self-end">
            <Switch
              size="small"
              checked={myDepartments}
              onChange={(e) => setMyDepartments(e.target.checked)}
            >
              Mine departementer
            </Switch>
          </div>
        )}
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

      {filteredCases.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Saksnavn</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>Kapittel</Table.HeaderCell>
                <Table.HeaderCell>Post</Table.HeaderCell>
                <Table.HeaderCell>Beløp (1 000 kr)</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Departement</Table.HeaderCell>
                {divisions.length > 0 && (
                  <Table.HeaderCell>Avdeling</Table.HeaderCell>
                )}
                <Table.HeaderCell>Oppdatert</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredCases.map((c) => (
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
                  <Table.DataCell>{c.chapter ?? '-'}</Table.DataCell>
                  <Table.DataCell>{c.post ?? '-'}</Table.DataCell>
                  <Table.DataCell className="text-right">
                    {formatAmountNOK(c.amount)}
                  </Table.DataCell>
                  <Table.DataCell>
                    <CaseStatusBadge status={c.status} />
                  </Table.DataCell>
                  <Table.DataCell>{c.departmentCode}</Table.DataCell>
                  {divisions.length > 0 && (
                    <Table.DataCell>{c.responsibleDivision ?? '-'}</Table.DataCell>
                  )}
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
