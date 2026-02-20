import apiClient from './client';
import type {
  DepartmentListTemplate,
  DepartmentListTemplateSection,
  DepartmentList,
  CaseConclusion,
} from '../lib/types';

// ===== Templates =====

interface TemplateFilters {
  budget_round_type?: string;
  is_active?: boolean;
}

export async function fetchTemplates(filters?: TemplateFilters): Promise<DepartmentListTemplate[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v));
    });
  }
  const { data } = await apiClient.get<DepartmentListTemplate[]>(`/department-list-templates?${params}`);
  return data;
}

export async function fetchTemplate(id: string): Promise<DepartmentListTemplate> {
  const { data } = await apiClient.get<DepartmentListTemplate>(`/department-list-templates/${id}`);
  return data;
}

export interface TemplateSectionInput {
  titleTemplate: string;
  headingStyle: string;
  sectionType: string;
  sortOrder: number;
  config?: string | null;
  children?: TemplateSectionInput[];
}

export interface TemplateCreatePayload {
  name: string;
  budgetRoundType: string;
  departmentNamePlaceholder?: string;
  classificationText?: string;
  sections?: TemplateSectionInput[];
}

export async function createTemplate(payload: TemplateCreatePayload): Promise<DepartmentListTemplate> {
  const { data } = await apiClient.post<DepartmentListTemplate>('/department-list-templates', payload);
  return data;
}

export interface TemplateUpdatePayload {
  name?: string;
  budgetRoundType?: string;
  departmentNamePlaceholder?: string;
  classificationText?: string;
  isActive?: boolean;
}

export async function updateTemplate(id: string, payload: TemplateUpdatePayload): Promise<DepartmentListTemplate> {
  const { data } = await apiClient.put<DepartmentListTemplate>(`/department-list-templates/${id}`, payload);
  return data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`/department-list-templates/${id}`);
}

export async function replaceTemplateSections(
  templateId: string,
  sections: TemplateSectionInput[]
): Promise<DepartmentListTemplate> {
  const { data } = await apiClient.put<DepartmentListTemplate>(
    `/department-list-templates/${templateId}/sections`,
    sections
  );
  return data;
}

export async function addTemplateSection(
  templateId: string,
  section: TemplateSectionInput
): Promise<DepartmentListTemplateSection> {
  const { data } = await apiClient.post<DepartmentListTemplateSection>(
    `/department-list-templates/${templateId}/sections`,
    section
  );
  return data;
}

export async function updateTemplateSection(
  templateId: string,
  sectionId: string,
  payload: Partial<TemplateSectionInput>
): Promise<DepartmentListTemplateSection> {
  const { data } = await apiClient.put<DepartmentListTemplateSection>(
    `/department-list-templates/${templateId}/sections/${sectionId}`,
    payload
  );
  return data;
}

export async function deleteTemplateSection(templateId: string, sectionId: string): Promise<void> {
  await apiClient.delete(`/department-list-templates/${templateId}/sections/${sectionId}`);
}

// ===== Department Lists =====

interface DepartmentListFilters {
  budget_round_id?: string;
  department_id?: string;
}

export async function fetchDepartmentLists(filters?: DepartmentListFilters): Promise<DepartmentList[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v));
    });
  }
  const { data } = await apiClient.get<DepartmentList[]>(`/department-lists?${params}`);
  return data;
}

export async function fetchDepartmentList(id: string): Promise<DepartmentList> {
  const { data } = await apiClient.get<DepartmentList>(`/department-lists/${id}`);
  return data;
}

export interface DepartmentListCreatePayload {
  templateId: string;
  budgetRoundId: string;
  departmentId: string;
}

export async function createDepartmentList(payload: DepartmentListCreatePayload): Promise<DepartmentList> {
  const { data } = await apiClient.post<DepartmentList>('/department-lists', payload);
  return data;
}

export async function updateDepartmentListStatus(id: string, status: string): Promise<DepartmentList> {
  const { data } = await apiClient.put<DepartmentList>(`/department-lists/${id}/status`, { status });
  return data;
}

export async function updateDepartmentListSection(
  listId: string,
  sectionId: string,
  payload: { title?: string; contentJson?: string }
): Promise<void> {
  await apiClient.put(`/department-lists/${listId}/sections/${sectionId}`, payload);
}

export interface CaseEntryAddPayload {
  sectionId: string;
  caseId: string;
  subgroup?: string;
  sortOrder: number;
}

export async function addCaseEntry(listId: string, payload: CaseEntryAddPayload) {
  const { data } = await apiClient.post(`/department-lists/${listId}/case-entries`, payload);
  return data;
}

export async function updateCaseEntry(
  listId: string,
  entryId: string,
  payload: { subgroup?: string; sortOrder?: number; overrideContent?: string }
): Promise<void> {
  await apiClient.put(`/department-lists/${listId}/case-entries/${entryId}`, payload);
}

export async function removeCaseEntry(listId: string, entryId: string): Promise<void> {
  await apiClient.delete(`/department-lists/${listId}/case-entries/${entryId}`);
}

// ===== Case Conclusions =====

export async function fetchConclusions(caseId: string): Promise<CaseConclusion[]> {
  const { data } = await apiClient.get<CaseConclusion[]>(`/cases/${caseId}/conclusions`);
  return data;
}

export async function createConclusion(
  caseId: string,
  payload: { text: string; sortOrder: number }
): Promise<CaseConclusion> {
  const { data } = await apiClient.post<CaseConclusion>(`/cases/${caseId}/conclusions`, payload);
  return data;
}

export async function updateConclusion(
  caseId: string,
  conclusionId: string,
  payload: { text?: string; sortOrder?: number }
): Promise<CaseConclusion> {
  const { data } = await apiClient.put<CaseConclusion>(
    `/cases/${caseId}/conclusions/${conclusionId}`,
    payload
  );
  return data;
}

export async function deleteConclusion(caseId: string, conclusionId: string): Promise<void> {
  await apiClient.delete(`/cases/${caseId}/conclusions/${conclusionId}`);
}

export async function replaceConclusions(
  caseId: string,
  conclusions: { text: string; sortOrder: number }[]
): Promise<CaseConclusion[]> {
  const { data } = await apiClient.put<CaseConclusion[]>(`/cases/${caseId}/conclusions`, conclusions);
  return data;
}

// ===== Auto-placement =====

export async function autoPlaceCases(listId: string): Promise<{ placed: number }> {
  const { data } = await apiClient.post<{ placed: number }>(`/department-lists/${listId}/auto-place`);
  return data;
}

// ===== Figures =====

export async function uploadFigure(
  listId: string,
  sectionId: string,
  file: File,
  caption?: string,
): Promise<{ fileUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sectionId', sectionId);
  if (caption) formData.append('caption', caption);
  const { data } = await apiClient.post<{ fileUrl: string }>(
    `/department-lists/${listId}/figures`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

// ===== Word Export =====

export function getDepListExportUrl(listId: string): string {
  return `/api/department-lists/${listId}/export/word`;
}
