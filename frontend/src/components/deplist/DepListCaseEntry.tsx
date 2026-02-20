import type { DepartmentListCaseEntry, CaseConclusion } from '../../lib/types';
import { formatMillions, resolveHeadingFormat } from './deplistUtils';
import { DepListConclusionList } from './DepListConclusionList';
import { DepListContentEditor } from './DepListContentEditor';

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
      <div className="dl-h7">{heading}</div>

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
            </>
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
