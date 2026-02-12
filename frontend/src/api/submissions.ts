import apiClient from './client';
import type { Submission } from '../lib/types';

interface SubmissionFilters {
  budget_round_id?: string;
  department_id?: string;
}

export async function fetchSubmissions(filters: SubmissionFilters): Promise<Submission[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const { data } = await apiClient.get<Submission[]>(`/submissions?${params}`);
  return data;
}

export async function createSubmission(budgetRoundId: string, caseIds: string[], isSupplement = false): Promise<Submission> {
  const { data } = await apiClient.post<Submission>('/submissions', {
    budgetRoundId,
    caseIds,
    isSupplement,
  });
  return data;
}
