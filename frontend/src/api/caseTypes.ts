import apiClient from './client';
import type { CaseTypeDefinition } from '../lib/types';

export async function fetchCaseTypes(): Promise<CaseTypeDefinition[]> {
  const { data } = await apiClient.get<CaseTypeDefinition[]>('/case-types');
  return data;
}

export interface CaseTypeCreatePayload {
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  fields: { key: string; label: string; required: boolean }[];
}

export interface CaseTypeUpdatePayload {
  name?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
  fields?: { key: string; label: string; required: boolean }[];
}

export async function createCaseType(payload: CaseTypeCreatePayload): Promise<CaseTypeDefinition> {
  const { data } = await apiClient.post<CaseTypeDefinition>('/case-types', payload);
  return data;
}

export async function updateCaseType(id: string, payload: CaseTypeUpdatePayload): Promise<void> {
  await apiClient.put(`/case-types/${id}`, payload);
}

export async function deleteCaseType(id: string): Promise<void> {
  await apiClient.delete(`/case-types/${id}`);
}
