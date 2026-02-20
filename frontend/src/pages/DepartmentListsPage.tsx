import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heading,
  BodyShort,
  Alert,
  Loader,
  Table,
  Button,
  Select,
  Tag,
} from '@navikt/ds-react';
import { Plus, FileText } from 'lucide-react';
import { useDepartmentLists, useCreateDepartmentList, useTemplates } from '../hooks/useDepartmentLists.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { isFinRole, isAdmin } from '../lib/roles.ts';
import { formatDate } from '../lib/formatters.ts';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Utkast',
  in_progress: 'Under arbeid',
  completed: 'Ferdig',
};

const STATUS_VARIANTS: Record<string, 'neutral' | 'info' | 'success'> = {
  draft: 'neutral',
  in_progress: 'info',
  completed: 'success',
};

export function DepartmentListsPage() {
  const user = useAuthStore((s) => s.user);
  const selectedRound = useUiStore((s) => s.selectedRound);
  const navigate = useNavigate();
  const role = user?.role ?? '';

  const canCreate = isFinRole(role) || isAdmin(role);

  const filters = {
    budget_round_id: selectedRound?.id,
    department_id: user?.departmentId,
  };

  const { data: lists, isLoading, error } = useDepartmentLists(filters);
  const { data: templates } = useTemplates();
  const createMut = useCreateDepartmentList();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedDept] = useState(user?.departmentId ?? '');

  const handleCreate = () => {
    if (!selectedTemplate || !selectedRound?.id || !selectedDept) return;
    createMut.mutate(
      {
        templateId: selectedTemplate,
        budgetRoundId: selectedRound.id,
        departmentId: selectedDept,
      },
      {
        onSuccess: (newList) => {
          setShowCreate(false);
          navigate(`/department-lists/${newList.id}`);
        },
      }
    );
  };

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading size="large" level="1">
            Departementslister
          </Heading>
          <BodyShort className="text-gray-600">
            Departementslister for {selectedRound.name}
          </BodyShort>
        </div>
        {canCreate && (
          <Button
            size="small"
            icon={<Plus size={16} />}
            onClick={() => setShowCreate(true)}
          >
            Opprett liste
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Heading size="small" level="2" className="mb-3">
            Opprett ny departementsliste
          </Heading>
          <div className="flex flex-wrap items-end gap-4">
            <Select
              label="Mal"
              size="small"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">Velg mal...</option>
              {templates
                ?.filter((t) => t.isActive)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </Select>
            <div className="flex gap-2">
              <Button
                size="small"
                onClick={handleCreate}
                disabled={!selectedTemplate}
                loading={createMut.isPending}
              >
                Opprett
              </Button>
              <Button
                size="small"
                variant="secondary"
                onClick={() => setShowCreate(false)}
              >
                Avbryt
              </Button>
            </div>
          </div>
          {createMut.isError && (
            <Alert variant="error" size="small" className="mt-2">
              Kunne ikke opprette listen. Den kan allerede eksistere for dette departementet.
            </Alert>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader size="xlarge" title="Laster departementslister..." />
        </div>
      )}

      {error && (
        <Alert variant="error">Kunne ikke laste departementslister.</Alert>
      )}

      {lists && lists.length === 0 && !isLoading && (
        <Alert variant="info">
          Ingen departementslister er opprettet for denne budsjettrunden ennå.
        </Alert>
      )}

      {lists && lists.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Mal</Table.HeaderCell>
                <Table.HeaderCell>Departement</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Opprettet</Table.HeaderCell>
                <Table.HeaderCell>Sist oppdatert</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {lists.map((dl) => (
                <Table.Row
                  key={dl.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/department-lists/${dl.id}`)}
                >
                  <Table.DataCell className="font-medium text-[var(--color-primary)]">
                    {dl.templateName}
                  </Table.DataCell>
                  <Table.DataCell>
                    {dl.departmentCode} — {dl.departmentName}
                  </Table.DataCell>
                  <Table.DataCell>
                    <Tag
                      variant={STATUS_VARIANTS[dl.status] ?? 'neutral'}
                      size="xsmall"
                    >
                      {STATUS_LABELS[dl.status] ?? dl.status}
                    </Tag>
                  </Table.DataCell>
                  <Table.DataCell>{formatDate(dl.createdAt)}</Table.DataCell>
                  <Table.DataCell>{formatDate(dl.updatedAt)}</Table.DataCell>
                  <Table.DataCell>
                    <Button
                      size="xsmall"
                      variant="tertiary"
                      icon={<FileText size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/department-lists/${dl.id}`);
                      }}
                    >
                      Åpne
                    </Button>
                  </Table.DataCell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </div>
  );
}
