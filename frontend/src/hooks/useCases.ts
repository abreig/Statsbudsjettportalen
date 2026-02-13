import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCases,
  fetchCase,
  fetchHistory,
  createCase,
  saveContent,
  changeStatus,
  createOpinion,
  resolveOpinion,
} from '../api/cases.ts';
import type {
  CaseCreatePayload,
  ContentUpdatePayload,
  CreateOpinionPayload,
  ResolveOpinionPayload,
  HistoryFilters,
} from '../api/cases.ts';

interface CaseFilters {
  budget_round_id?: string;
  department_id?: string;
  status?: string;
  case_type?: string;
  search?: string;
  division?: string;
}

export function useCases(filters: CaseFilters) {
  return useQuery({
    queryKey: ['cases', filters],
    queryFn: () => fetchCases(filters),
    enabled: !!filters.budget_round_id,
  });
}

export function useCase(id: string | undefined) {
  return useQuery({
    queryKey: ['cases', id],
    queryFn: () => fetchCase(id!),
    enabled: !!id,
  });
}

export function useHistory(filters: HistoryFilters) {
  return useQuery({
    queryKey: ['history', filters],
    queryFn: () => fetchHistory(filters),
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CaseCreatePayload) => createCase(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useSaveContent(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ContentUpdatePayload) => saveContent(caseId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
    },
  });
}

export function useChangeStatus(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { status: string; reason?: string }) =>
      changeStatus(caseId, params.status, params.reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases'] });
      void queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
    },
  });
}

export function useCreateOpinion(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOpinionPayload) => createOpinion(caseId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
    },
  });
}

export function useResolveOpinion(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { opinionId: string; payload: ResolveOpinionPayload }) =>
      resolveOpinion(params.opinionId, params.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
    },
  });
}
