import apiClient from './client';
import type { BudgetCase, CaseContent, CaseEvent } from '../lib/types';

interface CaseFilters {
  budget_round_id?: string;
  department_id?: string;
  status?: string;
  case_type?: string;
  search?: string;
  division?: string;
  my_departments?: boolean;
}

export async function fetchCases(filters: CaseFilters): Promise<BudgetCase[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
  });
  const { data } = await apiClient.get<BudgetCase[]>(`/cases?${params}`);
  return data;
}

export async function fetchCase(id: string): Promise<BudgetCase> {
  const { data } = await apiClient.get<BudgetCase>(`/cases/${id}`);
  return data;
}

export interface CaseCreatePayload {
  budgetRoundId: string;
  caseName: string;
  caseType: string;
  chapter?: string;
  post?: string;
  amount?: number;
  proposalText?: string;
  justification?: string;
  verbalConclusion?: string;
  socioeconomicAnalysis?: string;
  goalIndicator?: string;
  benefitPlan?: string;
  comment?: string;
}

export async function createCase(payload: CaseCreatePayload): Promise<BudgetCase> {
  const { data } = await apiClient.post<BudgetCase>('/cases', payload);
  return data;
}

export async function updateCase(id: string, payload: Partial<CaseCreatePayload>): Promise<void> {
  await apiClient.put(`/cases/${id}`, payload);
}

export async function changeStatus(id: string, status: string, reason?: string, comment?: string): Promise<void> {
  await apiClient.patch(`/cases/${id}/status`, { status, reason, comment });
}

export interface ContentUpdatePayload {
  caseName?: string | null;
  chapter?: string | null;
  post?: string | null;
  amount?: number | null;
  proposalText?: string | null;
  justification?: string | null;
  verbalConclusion?: string | null;
  socioeconomicAnalysis?: string | null;
  goalIndicator?: string | null;
  benefitPlan?: string | null;
  comment?: string | null;
  finAssessment?: string | null;
  finVerbal?: string | null;
  finRConclusion?: string | null;
}

export async function saveContent(id: string, payload: ContentUpdatePayload): Promise<CaseContent> {
  const { data } = await apiClient.post<CaseContent>(`/cases/${id}/content`, payload);
  return data;
}

export async function fetchContentVersions(id: string): Promise<CaseContent[]> {
  const { data } = await apiClient.get<CaseContent[]>(`/cases/${id}/content`);
  return data;
}

export async function fetchContentVersion(id: string, version: number): Promise<CaseContent> {
  const { data } = await apiClient.get<CaseContent>(`/cases/${id}/content/${version}`);
  return data;
}

export async function fetchCaseEvents(id: string): Promise<CaseEvent[]> {
  const { data } = await apiClient.get<CaseEvent[]>(`/cases/${id}/events`);
  return data;
}

// ─── Responsible handler ─────────────────────

export async function changeResponsible(caseId: string, newAssignedTo: string): Promise<void> {
  await apiClient.patch(`/cases/${caseId}/assign`, { newAssignedTo });
}

// ─── Opinions (uttalelser/godkjenninger) ───────────────────

export interface CreateOpinionPayload {
  assignedTo: string;
  type?: 'uttalelse' | 'godkjenning';
  comment?: string;
}

export interface ResolveOpinionPayload {
  status: 'given' | 'declined' | 'approved' | 'rejected';
  opinionText?: string;
}

export async function createOpinion(caseId: string, payload: CreateOpinionPayload): Promise<void> {
  await apiClient.post(`/cases/${caseId}/opinions`, payload);
}

export async function resolveOpinion(opinionId: string, payload: ResolveOpinionPayload): Promise<void> {
  await apiClient.patch(`/cases/opinions/${opinionId}`, payload);
}

export async function forwardApproval(opinionId: string, forwardTo: string): Promise<void> {
  await apiClient.post(`/cases/opinions/${opinionId}/forward`, { forwardTo });
}

// ─── My cases / My tasks ───────────────────

export async function fetchMyCases(budgetRoundId?: string): Promise<BudgetCase[]> {
  const params = new URLSearchParams();
  if (budgetRoundId) params.set('budget_round_id', budgetRoundId);
  const { data } = await apiClient.get<BudgetCase[]>(`/cases/my-cases?${params}`);
  return data;
}

export async function fetchMyTasks(): Promise<import('../lib/types').CaseOpinion[]> {
  const { data } = await apiClient.get<import('../lib/types').CaseOpinion[]>('/cases/my-tasks');
  return data;
}

// ─── History (cross-round) ───────────────────

export interface HistoryFilters {
  chapter?: string;
  post?: string;
  department_id?: string;
  year?: number;
}

export async function fetchHistory(filters: HistoryFilters): Promise<BudgetCase[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const { data } = await apiClient.get<BudgetCase[]>(`/cases/history?${params}`);
  return data;
}
