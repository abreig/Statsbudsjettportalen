import { useNavigate } from 'react-router-dom';
import {
  Heading,
  BodyShort,
  Alert,
  Loader,
  Table,
  Tag,
} from '@navikt/ds-react';
import { useMyCases, useMyTasks } from '../hooks/useCases.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { CaseStatusBadge } from '../components/cases/CaseStatusBadge.tsx';
import { CASE_TYPE_LABELS } from '../lib/caseTypes.ts';
import { formatAmountNOK, formatDateShort } from '../lib/formatters.ts';

export function MySakerPage() {
  const navigate = useNavigate();
  const selectedRound = useUiStore((s) => s.selectedRound);

  const { data: myCases, isLoading: casesLoading } = useMyCases(selectedRound?.id);
  const { data: myTasks, isLoading: tasksLoading } = useMyTasks();

  return (
    <div>
      <div className="mb-6">
        <Heading size="large" level="1">
          Mine saker
        </Heading>
        {selectedRound && (
          <BodyShort className="text-gray-600">
            {selectedRound.name}
          </BodyShort>
        )}
      </div>

      {/* Section 1: My cases */}
      <div className="mb-8">
        <Heading size="medium" level="2" className="mb-3">
          Saker jeg er ansvarlig for
        </Heading>

        {casesLoading && (
          <div className="flex justify-center py-6">
            <Loader size="xlarge" title="Laster mine saker..." />
          </div>
        )}

        {myCases && myCases.length === 0 && !casesLoading && (
          <Alert variant="info">Du er ikke ansvarlig for noen saker i denne budsjettrunden.</Alert>
        )}

        {myCases && myCases.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <Table size="small">
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Saksnavn</Table.HeaderCell>
                  <Table.HeaderCell>Type</Table.HeaderCell>
                  <Table.HeaderCell>Kap/post</Table.HeaderCell>
                  <Table.HeaderCell>Beløp (1 000 kr)</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Oppdatert</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {myCases.map((c) => (
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

      {/* Section 2: My tasks (pending opinions/approvals) */}
      <div>
        <Heading size="medium" level="2" className="mb-3">
          Oppgaver
        </Heading>

        {tasksLoading && (
          <div className="flex justify-center py-6">
            <Loader size="xlarge" title="Laster oppgaver..." />
          </div>
        )}

        {myTasks && myTasks.length === 0 && !tasksLoading && (
          <Alert variant="info">Du har ingen ventende oppgaver.</Alert>
        )}

        {myTasks && myTasks.length > 0 && (
          <div className="space-y-2">
            {myTasks.map((task) => {
              let tagVariant: 'warning' | 'info' | 'alt3' = 'warning';
              let tagLabel = 'Til uttalelse';

              if (task.type === 'godkjenning') {
                if (task.forwardedFromId) {
                  tagVariant = 'alt3';
                  tagLabel = 'Videresendt for godkjenning';
                } else {
                  tagVariant = 'info';
                  tagLabel = 'Til godkjenning';
                }
              }

              return (
                <div
                  key={task.id}
                  onClick={() => navigate(`/cases/${task.caseId}`)}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Tag variant={tagVariant} size="small">
                      {tagLabel}
                    </Tag>
                    <div>
                      <BodyShort size="small" className="font-medium">
                        Forespurt av {task.requestedByName}
                      </BodyShort>
                      <BodyShort size="small" className="text-gray-500">
                        {formatDateShort(task.createdAt)}
                      </BodyShort>
                    </div>
                  </div>
                  <Tag variant="warning" size="xsmall">
                    Ventende
                  </Tag>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
