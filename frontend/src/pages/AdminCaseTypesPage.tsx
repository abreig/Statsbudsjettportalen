import { useState } from 'react';
import {
  Heading,
  BodyShort,
  Button,
  TextField,
  Textarea,
  Alert,
  Loader,
  Table,
  Tag,
  Modal,
  Switch,
} from '@navikt/ds-react';
import { PlusCircle, Pencil, Trash2, Plus, X } from 'lucide-react';
import {
  useCaseTypes,
  useCreateCaseType,
  useUpdateCaseType,
  useDeleteCaseType,
} from '../hooks/useCaseTypes.ts';
import type { CaseTypeDefinition } from '../lib/types.ts';
import type { CaseTypeCreatePayload } from '../api/caseTypes.ts';

interface FieldRow {
  key: string;
  label: string;
  required: boolean;
}

const emptyForm: CaseTypeCreatePayload = {
  code: '',
  name: '',
  description: '',
  sortOrder: 0,
  fields: [],
};

export function AdminCaseTypesPage() {
  const { data: caseTypes, isLoading, error } = useCaseTypes();
  const createMut = useCreateCaseType();
  const updateMut = useUpdateCaseType();
  const deleteMut = useDeleteCaseType();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<CaseTypeDefinition | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFields([]);
    setShowForm(true);
  };

  const openEdit = (ct: CaseTypeDefinition) => {
    setEditingId(ct.id);
    setForm({
      code: ct.code,
      name: ct.name,
      description: ct.description,
      sortOrder: ct.sortOrder,
      fields: ct.fields,
    });
    setFields(ct.fields.map((f) => ({ ...f })));
    setShowForm(true);
  };

  const addField = () => {
    setFields((prev) => [...prev, { key: '', label: '', required: false }]);
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const updateField = (index: number, patch: Partial<FieldRow>) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
  };

  const handleSave = () => {
    const payload = { ...form, fields };

    if (editingId) {
      updateMut.mutate(
        { id: editingId, payload: { name: payload.name, description: payload.description, sortOrder: payload.sortOrder, fields: payload.fields } },
        { onSuccess: () => setShowForm(false) }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => setShowForm(false),
      });
    }
  };

  const handleDelete = (ct: CaseTypeDefinition) => {
    deleteMut.mutate(ct.id, {
      onSuccess: () => setDeleteConfirm(null),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader size="xlarge" title="Laster sakstyper..." />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">Kunne ikke laste sakstyper.</Alert>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading size="large" level="1">
            Administrer sakstyper
          </Heading>
          <BodyShort className="text-gray-600">
            Legg til, rediger eller fjern sakstyper og deres feltkonfigurasjoner.
          </BodyShort>
        </div>
        <Button onClick={openCreate} icon={<PlusCircle size={18} />}>
          Ny sakstype
        </Button>
      </div>

      {caseTypes && caseTypes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Kode</Table.HeaderCell>
                <Table.HeaderCell>Navn</Table.HeaderCell>
                <Table.HeaderCell>Beskrivelse</Table.HeaderCell>
                <Table.HeaderCell>Felt</Table.HeaderCell>
                <Table.HeaderCell>Rekkef.</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell className="w-24" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {caseTypes.map((ct) => (
                <Table.Row key={ct.id}>
                  <Table.DataCell className="font-mono text-sm">
                    {ct.code}
                  </Table.DataCell>
                  <Table.DataCell className="font-medium">
                    {ct.name}
                  </Table.DataCell>
                  <Table.DataCell className="max-w-xs truncate text-sm text-gray-600">
                    {ct.description}
                  </Table.DataCell>
                  <Table.DataCell>{ct.fields.length} felt</Table.DataCell>
                  <Table.DataCell>{ct.sortOrder}</Table.DataCell>
                  <Table.DataCell>
                    <Tag
                      variant={ct.isActive ? 'success' : 'neutral'}
                      size="xsmall"
                    >
                      {ct.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Tag>
                  </Table.DataCell>
                  <Table.DataCell>
                    <div className="flex gap-1">
                      <Button
                        variant="tertiary"
                        size="xsmall"
                        icon={<Pencil size={14} />}
                        onClick={() => openEdit(ct)}
                        title="Rediger"
                      />
                      <Button
                        variant="tertiary-neutral"
                        size="xsmall"
                        icon={<Trash2 size={14} />}
                        onClick={() => setDeleteConfirm(ct)}
                        title="Slett"
                      />
                    </div>
                  </Table.DataCell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}

      {caseTypes && caseTypes.length === 0 && (
        <Alert variant="info">Ingen sakstyper definert enda.</Alert>
      )}

      {/* Create/Edit form modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        header={{ heading: editingId ? 'Rediger sakstype' : 'Ny sakstype' }}
        width="medium"
      >
        <Modal.Body>
          <div className="space-y-4">
            <TextField
              label="Kode"
              description="Unik identifikator (f.eks. satsingsforslag)"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              disabled={!!editingId}
            />
            <TextField
              label="Navn"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Textarea
              label="Beskrivelse"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              minRows={2}
              resize="vertical"
            />
            <TextField
              label="Sorteringsrekkefølge"
              type="number"
              value={String(form.sortOrder)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sortOrder: Number(e.target.value) || 0,
                }))
              }
            />

            {/* Fields editor */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Heading size="xsmall" level="3">
                  Innholdsfelt
                </Heading>
                <Button
                  variant="tertiary"
                  size="xsmall"
                  icon={<Plus size={14} />}
                  onClick={addField}
                >
                  Legg til felt
                </Button>
              </div>

              {fields.length === 0 && (
                <BodyShort size="small" className="text-gray-500">
                  Ingen felt definert. Klikk &quot;Legg til felt&quot; for a
                  legge til.
                </BodyShort>
              )}

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <TextField
                          label="Feltnøkkel"
                          size="small"
                          value={field.key}
                          onChange={(e) =>
                            updateField(index, { key: e.target.value })
                          }
                          placeholder="f.eks. proposalText"
                        />
                        <TextField
                          label="Visningsnavn"
                          size="small"
                          value={field.label}
                          onChange={(e) =>
                            updateField(index, { label: e.target.value })
                          }
                          placeholder="f.eks. Forslag til omtale"
                        />
                      </div>
                      <Switch
                        size="small"
                        checked={field.required}
                        onChange={(e) =>
                          updateField(index, {
                            required: e.target.checked,
                          })
                        }
                      >
                        Obligatorisk
                      </Switch>
                    </div>
                    <Button
                      variant="tertiary-neutral"
                      size="xsmall"
                      icon={<X size={14} />}
                      onClick={() => removeField(index)}
                      title="Fjern felt"
                      className="mt-6"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(createMut.isError || updateMut.isError) && (
            <Alert variant="error" size="small" className="mt-4">
              Kunne ikke lagre sakstypen. Sjekk at koden er unik.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={handleSave}
            loading={createMut.isPending || updateMut.isPending}
          >
            {editingId ? 'Oppdater' : 'Opprett'}
          </Button>
          <Button variant="secondary" onClick={() => setShowForm(false)}>
            Avbryt
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        header={{ heading: 'Slett sakstype' }}
        width="small"
      >
        <Modal.Body>
          <BodyShort>
            Er du sikker på at du vil slette sakstypen{' '}
            <strong>{deleteConfirm?.name}</strong>? Sakstypen vil bli
            deaktivert og ikke lenger tilgjengelig for nye saker.
          </BodyShort>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="danger"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            loading={deleteMut.isPending}
          >
            Slett
          </Button>
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            Avbryt
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
