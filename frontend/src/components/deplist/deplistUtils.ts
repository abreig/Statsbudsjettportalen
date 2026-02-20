import type { DepartmentListSection, DepartmentListCaseEntry } from '../../lib/types';

/** Map heading style from template to CSS class */
export function headingClass(headingStyle: string, sectionType?: string): string {
  const base: Record<string, string> = {
    Deplisteoverskrift1: 'dl-h1',
    Deplisteoverskrift2: 'dl-h2',
    Deplisteoverskrift3: 'dl-h3',
    Overskrift5: 'dl-h5',
    Overskrift7: 'dl-h7',
  };
  const cls = base[headingStyle] ?? 'dl-h3';
  if (sectionType === 'department_header') return `${cls} dl-department-header`;
  return cls;
}

/** Parse JSONB config safely */
export function parseConfig(configStr: string | null): Record<string, unknown> {
  if (!configStr) return {};
  try {
    return JSON.parse(configStr) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Group case entries by subgroup */
export function groupBySubgroup(
  entries: DepartmentListCaseEntry[],
  config: Record<string, unknown>,
): { title: string; value: string; entries: DepartmentListCaseEntry[] }[] {
  const subgroups = (config.subgroups as Array<{ value: string; title: string }>) ?? [];
  if (subgroups.length === 0) {
    return [{ title: '', value: '', entries }];
  }
  return subgroups.map((sg) => ({
    title: sg.title,
    value: sg.value,
    entries: entries.filter((e) => e.subgroup === sg.value),
  }));
}

/** Format amount as "##,# mill. kroner" */
export function formatMillions(amount: number | null): string {
  if (amount == null) return '-';
  const millions = amount / 1000;
  return `${millions.toLocaleString('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mill. kroner`;
}

/** Resolve heading format template */
export function resolveHeadingFormat(
  format: string,
  entry: DepartmentListCaseEntry,
  departmentAbbrev: string,
): string {
  return format
    .replace('{department_abbrev}', departmentAbbrev)
    .replace('{priority}', String(entry.sortOrder))
    .replace('{case_name}', entry.caseName);
}

/** Resolve intro text template */
export function resolveIntroText(
  template: string,
  entries: DepartmentListCaseEntry[],
  departmentName: string,
): string {
  const aListEntries = entries.filter((e) => e.subgroup === 'a_list');
  const totalAmount = aListEntries.reduce((sum, e) => sum + (e.finAmount ?? e.amount ?? 0), 0);
  return template
    .replace('{department_name}', departmentName)
    .replace('{total_amount}', formatMillions(totalAmount))
    .replace('{count}', String(aListEntries.length));
}

/** Build a flat table of contents from sections */
export interface TocEntry {
  id: string;
  title: string;
  level: number;
  sectionType: string;
}

export function buildToc(sections: DepartmentListSection[], level: number = 1): TocEntry[] {
  const entries: TocEntry[] = [];
  for (const section of sections) {
    if (section.title) {
      entries.push({
        id: section.id,
        title: section.title,
        level,
        sectionType: section.sectionType,
      });
    }
    if (section.children?.length) {
      entries.push(...buildToc(section.children, level + 1));
    }
  }
  return entries;
}

/** Collect all case entries from a section tree for summary tables */
export function collectCaseEntries(section: DepartmentListSection): DepartmentListCaseEntry[] {
  const entries = [...(section.caseEntries ?? [])];
  for (const child of section.children ?? []) {
    entries.push(...collectCaseEntries(child));
  }
  return entries;
}
