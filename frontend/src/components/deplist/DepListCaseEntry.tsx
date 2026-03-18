import { useState, useContext } from 'react';
import { Button } from '@navikt/ds-react';
import { Pencil } from 'lucide-react';
import type { DepartmentListCaseEntry, CaseConclusion } from '../../lib/types';
import { formatMillions, resolveHeadingFormat } from './deplistUtils';
import { DepListConclusionList } from './DepListConclusionList';
import { DepListContentEditor } from './DepListContentEditor';
import { DepListCaseEditModal } from './DepListCaseEditModal';
import { DepListEditorContext } from './DepListEditorContext';

interface DepListCaseEntryProps {
  entry: DepartmentListCaseEntry;
  departmentAbbrev: string;
  sectionConfig: Record<string, unknown>;
  editable?: boolean;
  conclusions?: CaseConclusion[];
  onContentChange?: (entryId: string, contentJson: string) => void;
  onConclusionAdd?: (caseId: string, text: string) => void;
  onConclusionUpdate?: (conclusionId: string, text: string) => void;
  onConclusionDelete?: (conclusionId: string) => void;
}

export function DepListCaseEntry({
  entry,
  departmentAbbrev,
  sectionConfig,
  editable = false,
  conclusions = [],
  onContentChange,
  onConclusionAdd,
  onConclusionUpdate,
  onConclusionDelete,
}: DepListCaseEntryProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const ctx = useContext(DepListEditorContext);

  // Resolve the heading format from config
  const headingFormat = (sectionConfig.heading_format as string) ?? '{case_name}';
  const heading = resolveHeadingFormat(headingFormat, entry, departmentAbbrev);

  // Fields to render
  const fields = (sectionConfig.fields as Array<{
    key: string;
    render_as: string;
    format?: string;
  }>) ?? [];

  const hasConclusion = sectionConfig.has_conclusion === true;

  return (
    <div className="dl-case-entry" id={`case-${entry.caseId}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="dl-h7 flex-1">{heading}</div>
        {editable && (
          <Button
            variant="tertiary"
            size="xsmall"
            icon={<Pencil size={14} />}
            onClick={() => { setEditModalOpen(true); ctx?.setActiveCaseId(entry.caseId); }}
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            Rediger sak
          </Button>
        )}
      </div>

      {editModalOpen && (
        <DepListCaseEditModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          caseId={entry.caseId}
          caseName={entry.caseName}
        />
      )}

      {/* Override content (editable rich text) */}
      {entry.overrideContent ? (
        <DepListContentEditor
          initialContent={entry.overrideContent}
          editable={editable}
          onUpdate={(json) => onContentChange?.(entry.id, json)}
        />
      ) : (
        <>
          {/* Render fields from config */}
          {fields.map((field) => {
            const value = getFieldValue(entry, field.key);
            if (value == null) return null;

            if (field.render_as === 'inline' && field.format) {
              const formatted = field.format
                .replace('{department_abbrev}', departmentAbbrev)
                .replace('{value}', String(value));
              return (
                <div key={field.key} className="dl-case-amount">
                  {formatted}
                </div>
              );
            }

            return (
              <div key={field.key} className="dl-case-field">
                {String(value)}
              </div>
            );
          })}

          {/* If no fields defined, show default: amounts */}
          {fields.length === 0 && (
            <>
              {entry.amount != null && (
                <div className="dl-case-amount">
                  {departmentAbbrev}s forslag: {formatMillions(entry.amount)}
                </div>
              )}
              {entry.finAmount != null && (
                <div className="dl-case-amount">
                  FINs tilråding: {formatMillions(entry.finAmount)}
                </div>
              )}
              {entry.proposalText && (
                <div className="dl-case-field mt-1">
                  <div className="dl-case-field-label">Forslag til omtale</div>
                  <div className="whitespace-pre-wrap italic">{entry.proposalText}</div>
                </div>
              )}
            </>
          )}

          {/* FIN text fields — heading style, italicised body, shown when non-empty */}
          {entry.finAssessment && (
            <div className="dl-case-field">
              <div className="dl-case-field-label">FINs vurdering</div>
              <div className="whitespace-pre-wrap italic">{entry.finAssessment}</div>
            </div>
          )}
          {entry.finVerbal && (
            <div className="dl-case-field">
              <div className="dl-case-field-label">Konklusjon</div>
              <div className="whitespace-pre-wrap italic">{entry.finVerbal}</div>
            </div>
          )}
          {entry.finRConclusion && (
            <div className="dl-case-field">
              <div className="dl-case-field-label">Regjeringens konklusjon</div>
              <div className="whitespace-pre-wrap italic">{entry.finRConclusion}</div>
            </div>
          )}
        </>
      )}

      {/* Conclusion points (for decisions_section) */}
      {hasConclusion && (
        <DepListConclusionList
          conclusions={conclusions}
          editable={editable}
          onAdd={(text) => onConclusionAdd?.(entry.caseId, text)}
          onUpdate={onConclusionUpdate}
          onDelete={onConclusionDelete}
        />
      )}
    </div>
  );
}

function getFieldValue(entry: DepartmentListCaseEntry, key: string): string | number | null {
  switch (key) {
    case 'amount':
    case 'proposal_text':
      return entry.amount != null ? formatMillions(entry.amount) : null;
    case 'fin_amount':
      return entry.finAmount != null ? formatMillions(entry.finAmount) : null;
    case 'gov_amount':
      return entry.govAmount != null ? formatMillions(entry.govAmount) : null;
    case 'case_name':
      return entry.caseName;
    case 'case_type':
      return entry.caseType;
    default:
      return null;
  }
}
