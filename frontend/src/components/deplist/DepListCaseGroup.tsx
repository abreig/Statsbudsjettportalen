import type { DepartmentListSection, CaseConclusion } from '../../lib/types';
import { parseConfig, groupBySubgroup, resolveIntroText, collectCaseEntries } from './deplistUtils';
import { DepListCaseEntry } from './DepListCaseEntry';
import { DepListAutoTable } from './DepListAutoTable';

interface DepListCaseGroupProps {
  section: DepartmentListSection;
  departmentName: string;
  departmentAbbrev: string;
  editable?: boolean;
  conclusions?: Record<string, CaseConclusion[]>;
  onContentChange?: (entryId: string, contentJson: string) => void;
  onConclusionAdd?: (caseId: string, text: string) => void;
  onConclusionUpdate?: (conclusionId: string, text: string) => void;
  onConclusionDelete?: (conclusionId: string) => void;
}

export function DepListCaseGroup({
  section,
  departmentName,
  departmentAbbrev,
  editable = false,
  conclusions = {},
  onContentChange,
  onConclusionAdd,
  onConclusionUpdate,
  onConclusionDelete,
}: DepListCaseGroupProps) {
  const config = parseConfig(section.contentJson);
  // Also merge any template section config that came through
  const allEntries = collectCaseEntries(section);
  const subgroups = groupBySubgroup(allEntries, config);

  // Intro text
  const introTemplate = config.intro_text_template as string | undefined;
  const introText = introTemplate
    ? resolveIntroText(introTemplate, allEntries, departmentName)
    : null;

  // Summary table
  const showSummaryTable = config.summary_table === true;

  // Entry template config (for how to render each case)
  const entryConfig = (config as Record<string, unknown>) ?? {};

  return (
    <div>
      {/* Intro text */}
      {introText && <div className="dl-body">{introText}</div>}

      {/* Summary table */}
      {showSummaryTable && (
        <DepListAutoTable
          entries={allEntries}
          departmentAbbrev={departmentAbbrev}
        />
      )}

      {/* Subgroups */}
      {subgroups.map((sg) => (
        <div key={sg.value || '__default'} className="dl-subgroup">
          {sg.title && <div className="dl-h5">{sg.title}</div>}
          {sg.entries.length === 0 && (
            <div className="dl-empty-section">Ingen saker i denne gruppen</div>
          )}
          {sg.entries.map((entry) => (
            <DepListCaseEntry
              key={entry.id}
              entry={entry}
              departmentAbbrev={departmentAbbrev}
              sectionConfig={entryConfig}
              editable={editable}
              conclusions={conclusions[entry.caseId] ?? []}
              onContentChange={onContentChange}
              onConclusionAdd={onConclusionAdd}
              onConclusionUpdate={onConclusionUpdate}
              onConclusionDelete={onConclusionDelete}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
