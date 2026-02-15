import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heading,
  BodyShort,
  Alert,
  Loader,
  Table,
  TextField,
  Select,
} from '@navikt/ds-react';
import { useHistory } from '../hooks/useCases.ts';
import { CaseStatusBadge } from '../components/cases/CaseStatusBadge.tsx';
import { CASE_TYPE_LABELS } from '../lib/caseTypes.ts';
import { formatAmountNOK, formatDateShort } from '../lib/formatters.ts';

export function HistoryPage() {
  const navigate = useNavigate();

  const [chapterFilter, setChapterFilter] = useState('');
  const [postFilter, setPostFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const filters = {
    chapter: chapterFilter || undefined,
    post: postFilter || undefined,
    year: yearFilter ? Number(yearFilter) : undefined,
  };

  const { data: cases, isLoading, error } = useHistory(filters);

  // Extract unique years from data
  const years = cases
    ? [...new Set(cases.map((c) => new Date(c.createdAt).getFullYear()))]
        .sort((a, b) => b - a)
    : [];


  return (
    <div>
      <div className="mb-6">
        <Heading size="large" level="1">
          Historikk
        </Heading>
        <BodyShort className="text-gray-600">
          Se saker fra lukkede budsjettrunder på tvers av år og runder.
        </BodyShort>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <TextField
          label="Kapittel"
          size="small"
          value={chapterFilter}
          onChange={(e) => setChapterFilter(e.target.value)}
          className="w-32"
        />
        <TextField
          label="Post"
          size="small"
          value={postFilter}
          onChange={(e) => setPostFilter(e.target.value)}
          className="w-32"
        />
        {years.length > 0 && (
          <Select
            label="År"
            size="small"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="">Alle år</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader size="xlarge" title="Laster historikk..." />
        </div>
      )}

      {error && (
        <Alert variant="error">Kunne ikke laste historikk.</Alert>
      )}

      {cases && cases.length === 0 && !isLoading && (
        <Alert variant="info">
          Ingen historiske saker funnet. Saker vises her når budsjettrunder er lukket.
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
                <Table.HeaderCell>FAGs forslag</Table.HeaderCell>
                <Table.HeaderCell>FINs tilråding</Table.HeaderCell>
                <Table.HeaderCell>R-vedtak</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Departement</Table.HeaderCell>
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
                  <Table.DataCell className="text-right">
                    {formatAmountNOK(c.finAmount)}
                  </Table.DataCell>
                  <Table.DataCell className="text-right">
                    {formatAmountNOK(c.govAmount)}
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
