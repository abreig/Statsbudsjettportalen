import type { DepartmentListSection, CaseConclusion } from '../../lib/types';
import { headingClass, parseConfig } from './deplistUtils';
import { DepListContentEditor } from './DepListContentEditor';
import { DepListCaseGroup } from './DepListCaseGroup';
import { DepListFigure } from './DepListFigure';

interface DepListSectionProps {
  section: DepartmentListSection;
  departmentName: string;
  departmentAbbrev: string;
  classificationText?: string | null;
  editable?: boolean;
  conclusions?: Record<string, CaseConclusion[]>;
  onSectionContentChange?: (sectionId: string, contentJson: string) => void;
  onEntryContentChange?: (entryId: string, contentJson: string) => void;
  onConclusionAdd?: (caseId: string, text: string) => void;
  onConclusionUpdate?: (conclusionId: string, text: string) => void;
  onConclusionDelete?: (conclusionId: string) => void;
  onFigureUpload?: (sectionId: string, file: File) => void;
}

export function DepListSection({
  section,
  departmentName,
  departmentAbbrev,
  classificationText,
  editable = false,
  conclusions = {},
  onSectionContentChange,
  onEntryContentChange,
  onConclusionAdd,
  onConclusionUpdate,
  onConclusionDelete,
  onFigureUpload,
}: DepListSectionProps) {
  const sType = section.sectionType;
  const hClass = headingClass(section.headingStyle, sType);
  const config = parseConfig(section.contentJson);

  return (
    <div className="dl-section" id={`section-${section.id}`}>
      {/* Section heading */}
      {section.title && (
        <div className={hClass}>{section.title}</div>
      )}

      {/* Classification box (only for department_header) */}
      {sType === 'department_header' && classificationText && (
        <div className="dl-classification-box">{classificationText}</div>
      )}

      {/* Section body based on type */}
      {sType === 'fixed_content' && (
        <DepListContentEditor
          initialContent={section.contentJson}
          editable={editable}
          onUpdate={(json) => onSectionContentChange?.(section.id, json)}
        />
      )}

      {sType === 'freetext' && (
        <DepListContentEditor
          initialContent={section.contentJson}
          editable={editable}
          onUpdate={(json) => onSectionContentChange?.(section.id, json)}
        />
      )}

      {sType === 'figure_placeholder' && (
        <DepListFigure
          fileUrl={config.file_url as string | undefined}
          caption={config.caption as string | undefined}
          widthPercent={config.width_percent as number | undefined}
          editable={editable}
          onUpload={(file) => onFigureUpload?.(section.id, file)}
          onCaptionChange={(caption) => {
            const updated = { ...config, caption };
            onSectionContentChange?.(section.id, JSON.stringify(updated));
          }}
        />
      )}

      {(sType === 'case_group' || sType === 'decisions_section' || sType === 'summary_section') && (
        <DepListCaseGroup
          section={section}
          departmentName={departmentName}
          departmentAbbrev={departmentAbbrev}
          editable={editable}
          conclusions={conclusions}
          onContentChange={onEntryContentChange}
          onConclusionAdd={onConclusionAdd}
          onConclusionUpdate={onConclusionUpdate}
          onConclusionDelete={onConclusionDelete}
        />
      )}

      {sType === 'auto_table' && (
        <div className="dl-body">
          <div className="dl-empty-section">Automatisk generert tabell</div>
        </div>
      )}

      {/* Render children recursively */}
      {section.children?.length > 0 && (
        <div className="dl-section-children">
          {section.children.map((child) => (
            <DepListSection
              key={child.id}
              section={child}
              departmentName={departmentName}
              departmentAbbrev={departmentAbbrev}
              editable={editable}
              conclusions={conclusions}
              onSectionContentChange={onSectionContentChange}
              onEntryContentChange={onEntryContentChange}
              onConclusionAdd={onConclusionAdd}
              onConclusionUpdate={onConclusionUpdate}
              onConclusionDelete={onConclusionDelete}
              onFigureUpload={onFigureUpload}
            />
          ))}
        </div>
      )}
    </div>
  );
}
