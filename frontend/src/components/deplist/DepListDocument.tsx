import type { DepartmentList, CaseConclusion } from '../../lib/types';
import { DepListSection } from './DepListSection';
import './deplist.css';

interface DepListDocumentProps {
  depList: DepartmentList;
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

export function DepListDocument({
  depList,
  classificationText,
  editable = false,
  conclusions = {},
  onSectionContentChange,
  onEntryContentChange,
  onConclusionAdd,
  onConclusionUpdate,
  onConclusionDelete,
  onFigureUpload,
}: DepListDocumentProps) {
  const sections = depList.sections ?? [];

  return (
    <div className="dl-document">
      {sections.map((section) => (
        <DepListSection
          key={section.id}
          section={section}
          departmentName={depList.departmentName}
          departmentAbbrev={depList.departmentCode}
          classificationText={classificationText}
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
  );
}
