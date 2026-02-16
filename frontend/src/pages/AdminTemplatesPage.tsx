import { useState, useCallback } from 'react';
import {
  Heading,
  BodyShort,
  Button,
  TextField,
  Textarea,
  Select,
  Alert,
  Loader,
  Table,
  Tag,
  Modal,
} from '@navikt/ds-react';
import {
  PlusCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import {
  useTemplates,
  useCreateTemplate,
  useDeleteTemplate,
} from '../hooks/useDepartmentLists';
import {
  updateTemplate,
  replaceTemplateSections,
} from '../api/departmentLists';
import type { TemplateSectionInput } from '../api/departmentLists';
import type { DepartmentListTemplate, DepartmentListTemplateSection } from '../lib/types';
import { useQueryClient } from '@tanstack/react-query';

const SECTION_TYPES = [
  { value: 'department_header', label: 'Departementsoverskrift' },
  { value: 'fixed_content', label: 'Fast innhold' },
  { value: 'figure_placeholder', label: 'Figurplass' },
  { value: 'case_group', label: 'Sakskategori' },
  { value: 'case_subgroup', label: 'Undergruppe (A/B-liste)' },
  { value: 'case_entry_template', label: 'Saksmal' },
  { value: 'decisions_section', label: 'Beslutningsseksjon' },
  { value: 'summary_section', label: 'Omtaleseksjon' },
  { value: 'freetext', label: 'Fritekst' },
  { value: 'auto_table', label: 'Automatisk tabell' },
];

const HEADING_STYLES = [
  { value: 'Deplisteoverskrift1', label: 'Deplisteoverskrift 1 (16pt bold)' },
  { value: 'Deplisteoverskrift2', label: 'Deplisteoverskrift 2 (14pt bold)' },
  { value: 'Deplisteoverskrift3', label: 'Deplisteoverskrift 3 (14pt bold)' },
  { value: 'Overskrift5', label: 'Overskrift 5 (12pt bold)' },
  { value: 'Overskrift7', label: 'Overskrift 7 (12pt bold underline)' },
];

const BUDGET_ROUND_TYPES = [
  { value: 'mars', label: 'Marskonferansen' },
  { value: 'august', label: 'Augustkonferansen' },
  { value: 'rnb', label: 'Revidert nasjonalbudsjett' },
];

interface EditableSection {
  id: string;
  titleTemplate: string;
  headingStyle: string;
  sectionType: string;
  sortOrder: number;
  config: string;
  children: EditableSection[];
  expanded: boolean;
}

function templateSectionToEditable(s: DepartmentListTemplateSection): EditableSection {
  return {
    id: s.id,
    titleTemplate: s.titleTemplate,
    headingStyle: s.headingStyle,
    sectionType: s.sectionType,
    sortOrder: s.sortOrder,
    config: s.config || '',
    children: s.children.map(templateSectionToEditable),
    expanded: true,
  };
}

function editableToInput(s: EditableSection): TemplateSectionInput {
  return {
    titleTemplate: s.titleTemplate,
    headingStyle: s.headingStyle,
    sectionType: s.sectionType,
    sortOrder: s.sortOrder,
    config: s.config || null,
    children: s.children.length > 0 ? s.children.map(editableToInput) : undefined,
  };
}

let idCounter = 0;
function newEditableSection(): EditableSection {
  return {
    id: `new-${++idCounter}`,
    titleTemplate: '',
    headingStyle: 'Deplisteoverskrift2',
    sectionType: 'freetext',
    sortOrder: 0,
    config: '',
    children: [],
    expanded: true,
  };
}

export function AdminTemplatesPage() {
  const { data: templates, isLoading, error } = useTemplates();
  const createMut = useCreateTemplate();
  const deleteMut = useDeleteTemplate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<DepartmentListTemplate | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DepartmentListTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Template form state
  const [name, setName] = useState('');
  const [budgetRoundType, setBudgetRoundType] = useState('mars');
  const [placeholder, setPlaceholder] = useState('XX');
  const [classificationText, setClassificationText] = useState('');
  const [sections, setSections] = useState<EditableSection[]>([]);

  const resetForm = useCallback(() => {
    setName('');
    setBudgetRoundType('mars');
    setPlaceholder('XX');
    setClassificationText('');
    setSections([]);
  }, []);

  const startEdit = useCallback((template: DepartmentListTemplate) => {
    setEditing(template);
    setShowCreate(false);
    setName(template.name);
    setBudgetRoundType(template.budgetRoundType);
    setPlaceholder(template.departmentNamePlaceholder);
    setClassificationText(template.classificationText || '');
    setSections(template.sections.map(templateSectionToEditable));
  }, []);

  const startCreate = useCallback(() => {
    setEditing(null);
    setShowCreate(true);
    resetForm();
  }, [resetForm]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Renumber sort orders
      const renumbered = sections.map((s, i) => ({ ...s, sortOrder: i + 1 }));

      if (editing) {
        await updateTemplate(editing.id, {
          name,
          budgetRoundType,
          departmentNamePlaceholder: placeholder,
          classificationText: classificationText || undefined,
        });
        await replaceTemplateSections(editing.id, renumbered.map(editableToInput));
      } else {
        await createMut.mutateAsync({
          name,
          budgetRoundType,
          departmentNamePlaceholder: placeholder,
          classificationText: classificationText || undefined,
          sections: renumbered.map(editableToInput),
        });
      }

      void queryClient.invalidateQueries({ queryKey: ['department-list-templates'] });
      setEditing(null);
      setShowCreate(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  }, [editing, name, budgetRoundType, placeholder, classificationText, sections, createMut, queryClient, resetForm]);

  const handleDelete = useCallback(async (template: DepartmentListTemplate) => {
    await deleteMut.mutateAsync(template.id);
    setDeleteConfirm(null);
  }, [deleteMut]);

  const addSection = useCallback(() => {
    setSections(prev => [...prev, newEditableSection()]);
  }, []);

  const updateSection = useCallback((path: number[], field: string, value: string) => {
    setSections(prev => {
      const next = structuredClone(prev);
      let target: EditableSection[] = next;
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]].children;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (target[path[path.length - 1]] as any)[field] = value;
      return next;
    });
  }, []);

  const removeSection = useCallback((path: number[]) => {
    setSections(prev => {
      const next = structuredClone(prev);
      let target: EditableSection[] = next;
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]].children;
      }
      target.splice(path[path.length - 1], 1);
      return next;
    });
  }, []);

  const addChild = useCallback((path: number[]) => {
    setSections(prev => {
      const next = structuredClone(prev);
      let target: EditableSection[] = next;
      for (const idx of path) {
        target = target[idx].children;
      }
      target.push(newEditableSection());
      return next;
    });
  }, []);

  const toggleExpand = useCallback((path: number[]) => {
    setSections(prev => {
      const next = structuredClone(prev);
      let target: EditableSection[] = next;
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]].children;
      }
      target[path[path.length - 1]].expanded = !target[path[path.length - 1]].expanded;
      return next;
    });
  }, []);

  const isEditing = editing !== null || showCreate;

  if (isLoading) return <div className="flex justify-center p-12"><Loader size="xlarge" /></div>;
  if (error) return <Alert variant="error">Kunne ikke laste maler</Alert>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Heading size="large">Departementsliste-maler</Heading>
        {!isEditing && (
          <Button
            type="button"
            variant="primary"
            size="small"
            onClick={startCreate}
            icon={<PlusCircle size={16} />}
          >
            Ny mal
          </Button>
        )}
      </div>

      {!isEditing && templates && templates.length > 0 && (
        <Table size="small">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Navn</Table.HeaderCell>
              <Table.HeaderCell>Type</Table.HeaderCell>
              <Table.HeaderCell>Seksjoner</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Opprettet</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {templates.map((t) => (
              <Table.Row key={t.id}>
                <Table.DataCell>{t.name}</Table.DataCell>
                <Table.DataCell>
                  {BUDGET_ROUND_TYPES.find(b => b.value === t.budgetRoundType)?.label ?? t.budgetRoundType}
                </Table.DataCell>
                <Table.DataCell>{countSections(t.sections)}</Table.DataCell>
                <Table.DataCell>
                  <Tag variant={t.isActive ? 'success' : 'neutral'} size="small">
                    {t.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Tag>
                </Table.DataCell>
                <Table.DataCell>
                  {new Date(t.createdAt).toLocaleDateString('nb-NO')}
                </Table.DataCell>
                <Table.DataCell>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="xsmall"
                      icon={<Pencil size={14} />}
                      onClick={() => startEdit(t)}
                    />
                    <Button
                      type="button"
                      variant="tertiary"
                      size="xsmall"
                      icon={<Trash2 size={14} />}
                      onClick={() => setDeleteConfirm(t)}
                    />
                  </div>
                </Table.DataCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {!isEditing && templates && templates.length === 0 && (
        <Alert variant="info">
          Ingen maler opprettet enda. Klikk &quot;Ny mal&quot; for a opprette en.
        </Alert>
      )}

      {isEditing && (
        <div className="space-y-6 rounded border border-gray-200 bg-white p-6 shadow-sm">
          <Heading size="medium">
            {editing ? `Rediger: ${editing.name}` : 'Ny mal'}
          </Heading>

          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Malnavn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="small"
            />
            <Select
              label="Budsjettrundetype"
              value={budgetRoundType}
              onChange={(e) => setBudgetRoundType(e.target.value)}
              size="small"
            >
              {BUDGET_ROUND_TYPES.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </Select>
            <TextField
              label="Departementsnavn-plassholder"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              size="small"
              description="Erstattes med faktisk departementsnavn"
            />
          </div>

          <Textarea
            label="Klassifiseringstekst"
            value={classificationText}
            onChange={(e) => setClassificationText(e.target.value)}
            size="small"
            minRows={2}
            description="F.eks. 'STRENGT FORTROLIG jf. ...'"
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Heading size="small">Seksjoner</Heading>
              <Button
                type="button"
                variant="secondary"
                size="xsmall"
                icon={<PlusCircle size={14} />}
                onClick={addSection}
              >
                Legg til seksjon
              </Button>
            </div>

            {sections.length === 0 && (
              <BodyShort size="small" className="text-gray-500">
                Ingen seksjoner. Legg til en seksjon for a definere dokumentstrukturen.
              </BodyShort>
            )}

            <div className="space-y-2">
              {sections.map((section, idx) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  path={[idx]}
                  onUpdate={updateSection}
                  onRemove={removeSection}
                  onAddChild={addChild}
                  onToggleExpand={toggleExpand}
                  depth={0}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="tertiary"
              size="small"
              onClick={() => { setEditing(null); setShowCreate(false); resetForm(); }}
            >
              Avbryt
            </Button>
            <Button
              type="button"
              variant="primary"
              size="small"
              onClick={handleSave}
              loading={saving}
              disabled={!name.trim()}
            >
              {editing ? 'Lagre endringer' : 'Opprett mal'}
            </Button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <Modal
          open
          onClose={() => setDeleteConfirm(null)}
          header={{ heading: 'Slett mal' }}
        >
          <Modal.Body>
            <BodyShort>
              Er du sikker pa at du vil slette malen &quot;{deleteConfirm.name}&quot;?
            </BodyShort>
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="danger"
              size="small"
              onClick={() => handleDelete(deleteConfirm)}
              loading={deleteMut.isPending}
            >
              Slett
            </Button>
            <Button
              type="button"
              variant="tertiary"
              size="small"
              onClick={() => setDeleteConfirm(null)}
            >
              Avbryt
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

// ===== Section Editor Component =====

interface SectionEditorProps {
  section: EditableSection;
  path: number[];
  depth: number;
  onUpdate: (path: number[], field: string, value: string) => void;
  onRemove: (path: number[]) => void;
  onAddChild: (path: number[]) => void;
  onToggleExpand: (path: number[]) => void;
}

function SectionEditor({
  section,
  path,
  depth,
  onUpdate,
  onRemove,
  onAddChild,
  onToggleExpand,
}: SectionEditorProps) {
  const sectionTypeLabel = SECTION_TYPES.find(t => t.value === section.sectionType)?.label ?? section.sectionType;
  const headingLabel = HEADING_STYLES.find(h => h.value === section.headingStyle)?.label ?? section.headingStyle;

  return (
    <div
      className="rounded border border-gray-200 bg-gray-50"
      style={{ marginLeft: depth * 24 }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <GripVertical size={14} className="text-gray-400 cursor-grab" />

        <button
          type="button"
          onClick={() => onToggleExpand(path)}
          className="text-gray-500 hover:text-gray-800"
        >
          {section.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <Tag variant="alt1" size="xsmall">{sectionTypeLabel}</Tag>

        <BodyShort size="small" className="flex-1 font-medium truncate">
          {section.titleTemplate || '(uten tittel)'}
        </BodyShort>

        <Tag variant="neutral" size="xsmall" className="hidden sm:inline-flex">
          {headingLabel.split(' ')[0]}
        </Tag>

        <Button
          type="button"
          variant="tertiary"
          size="xsmall"
          icon={<PlusCircle size={12} />}
          onClick={() => onAddChild(path)}
          title="Legg til barn"
        />
        <Button
          type="button"
          variant="tertiary"
          size="xsmall"
          icon={<Trash2 size={12} />}
          onClick={() => onRemove(path)}
          title="Slett"
        />
      </div>

      {section.expanded && (
        <div className="border-t border-gray-200 px-3 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Tittelmal"
              value={section.titleTemplate}
              onChange={(e) => onUpdate(path, 'titleTemplate', e.target.value)}
              size="small"
              description="Bruk {department_name} for departementsnavn"
            />
            <Select
              label="Seksjonstype"
              value={section.sectionType}
              onChange={(e) => onUpdate(path, 'sectionType', e.target.value)}
              size="small"
            >
              {SECTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </div>

          <Select
            label="Overskriftsstil"
            value={section.headingStyle}
            onChange={(e) => onUpdate(path, 'headingStyle', e.target.value)}
            size="small"
          >
            {HEADING_STYLES.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </Select>

          {(section.sectionType === 'case_group' ||
            section.sectionType === 'case_entry_template' ||
            section.sectionType === 'decisions_section' ||
            section.sectionType === 'auto_table') && (
            <Textarea
              label="Konfigurasjon (JSON)"
              value={section.config}
              onChange={(e) => onUpdate(path, 'config', e.target.value)}
              size="small"
              minRows={3}
              description="JSONB-konfigurasjon for seksjonen"
            />
          )}

          {section.children.length > 0 && (
            <div className="space-y-2 pt-2">
              <BodyShort size="small" className="text-gray-600 font-medium">
                Underseksjoner ({section.children.length})
              </BodyShort>
              {section.children.map((child, idx) => (
                <SectionEditor
                  key={child.id}
                  section={child}
                  path={[...path, idx]}
                  depth={0}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onAddChild={onAddChild}
                  onToggleExpand={onToggleExpand}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Helpers =====

function countSections(sections: DepartmentListTemplateSection[]): number {
  return sections.reduce(
    (acc, s) => acc + 1 + countSections(s.children),
    0
  );
}
