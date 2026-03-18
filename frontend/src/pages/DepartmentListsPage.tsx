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
  ConfirmationPanel,
} from '@navikt/ds-react';
import { Plus, FileText, Trash2 } from 'lucide-react';
import { useDepartmentLists, useCreateDepartmentList, useDeleteDepartmentList, useTemplates } from '../hooks/useDepartmentLists.ts';
import { useDepartments } from '../hooks/useDepartments.ts';
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
  const isFin = isFinRole(role) || isAdmin(role);

  const filters = {
    budget_round_id: selectedRound?.id,
  };

  const { data: lists, isLoading, error } = useDepartmentLists(filters);
  const { data: templates } = useTemplates();
  const { data: departments } = useDepartments();
  const createMut = useCreateDepartmentList();

  const deleteMut = useDeleteDepartmentList();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedDept, setSelectedDept] = useState(isFin ? '' : (user?.departmentId ?? ''));
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [overwriteConfirmed, setOverwriteConfirmed] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    const deptId = isFin ? selectedDept : (user?.departmentId ?? '');
    if (!selectedTemplate || !selectedRound?.id || !deptId) return;

    createMut.mutate(
      {
        templateId: selectedTemplate,
        budgetRoundId: selectedRound.id,
        departmentId: deptId,
      },
      {
        onSuccess: (newList) => {
          setShowCreate(false);
          setShowOverwriteConfirm(false);
          setOverwriteConfirmed(false);
          navigate(`/department-lists/${newList.id}`);
        },
        onError: (err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 409) {
            setShowOverwriteConfirm(true);
          }
        },
      }
    );
  };

  const handleOverwrite = () => {
    if (!overwriteConfirmed) return;
    // Find the existing list and navigate to it
    const deptId = isFin ? selectedDept : (user?.departmentId ?? '');
    const existing = lists?.find(
      (l) => l.departmentId === deptId && l.templateName === templates?.find((t) => t.id === selectedTemplate)?.name
    );
    if (existing) {
      navigate(`/department-lists/${existing.id}`);
    }
    setShowCreate(false);
    setShowOverwriteConfirm(false);
    setOverwriteConfirmed(false);
  };

  const resetCreateForm = () => {
    setShowCreate(false);
    setShowOverwriteConfirm(false);
    setOverwriteConfirmed(false);
    if (isFin) setSelectedDept('');
    setSelectedTemplate('');
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

          {!showOverwriteConfirm ? (
            <>
              <div className="flex flex-wrap items-end gap-4">
                {isFin && (
                  <Select
                    label="Departement"
                    size="small"
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                  >
                    <option value="">Velg departement...</option>
                    {departments?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </Select>
                )}
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
                    disabled={!selectedTemplate || (isFin && !selectedDept)}
                    loading={createMut.isPending}
                  >
                    Opprett
                  </Button>
                  <Button size="small" variant="secondary" onClick={resetCreateForm}>
                    Avbryt
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <Alert variant="warning" size="small">
                Det finnes allerede en departementsliste for dette departementet og denne malen. Vil du åpne den
                eksisterende listen?
              </Alert>
              <ConfirmationPanel
                checked={overwriteConfirmed}
                onChange={(e) => setOverwriteConfirmed(e.target.checked)}
                label="Ja, åpne den eksisterende listen"
                size="small"
              />
              <div className="flex gap-2">
                <Button
                  size="small"
                  onClick={handleOverwrite}
                  disabled={!overwriteConfirmed}
                >
                  Åpne eksisterende
                </Button>
                <Button size="small" variant="secondary" onClick={resetCreateForm}>
                  Avbryt
                </Button>
              </div>
            </div>
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
                <>
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
                      <div className="flex items-center gap-1">
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
                        {canCreate && (
                          <Button
                            size="xsmall"
                            variant="tertiary"
                            icon={<Trash2 size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(dl.id);
                            }}
                          />
                        )}
                      </div>
                    </Table.DataCell>
                  </Table.Row>
                  {confirmDeleteId === dl.id && (
                    <Table.Row key={`${dl.id}-confirm`}>
                      <Table.DataCell colSpan={6}>
                        <div className="flex items-center gap-3 py-1">
                          <span className="text-sm text-gray-700">
                            Slette «{dl.templateName}» for {dl.departmentCode}? Dette kan ikke angres.
                          </span>
                          <Button
                            size="xsmall"
                            variant="danger"
                            loading={deleteMut.isPending}
                            onClick={() => {
                              deleteMut.mutate(dl.id, { onSuccess: () => setConfirmDeleteId(null) });
                            }}
                          >
                            Slett
                          </Button>
                          <Button
                            size="xsmall"
                            variant="tertiary"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Avbryt
                          </Button>
                        </div>
                      </Table.DataCell>
                    </Table.Row>
                  )}
                </>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </div>
  );
}
