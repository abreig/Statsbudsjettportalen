import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCases,
  fetchCase,
  fetchHistory,
  fetchMyCases,
  fetchMyTasks,
  createCase,
  saveContent,
  saveDocument,
  changeStatus,
  changeResponsible,
  changeFinResponsible,
  createOpinion,
  resolveOpinion,
  forwardApproval,
  updateListPlacement,
} from '../api/cases.ts';
import type {
  CaseCreatePayload,
  ContentUpdatePayload,
  DocumentSavePayload,
  CreateOpinionPayload,
  ResolveOpinionPayload,
  HistoryFilters,
  ListPlacementPayload,
} from '../api/cases.ts';

interface CaseFilters {
  budget_round_id?: string;
  department_id?: string;
  status?: string;
  case_type?: string;
  search?: string;
  division?: string;
  my_departments?: boolean;
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

export function useSaveDocument(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DocumentSavePayload) => saveDocument(caseId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
    },
  });
}

export function useChangeStatus(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { status: string; reason?: string; comment?: string }) =>
      changeStatus(caseId, params.status, params.reason, params.comment),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases'] });
      void queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
    },
  });
}

export function useChangeResponsible(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newAssignedTo: string) => changeResponsible(caseId, newAssignedTo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
    },
  });
}

export function useChangeFinResponsible(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newAssignedTo: string) => changeFinResponsible(caseId, newAssignedTo),
    onSuccess: () => {
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

export function useForwardApproval(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { opinionId: string; forwardTo: string }) =>
      forwardApproval(params.opinionId, params.forwardTo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
    },
  });
}

export function useMyCases(budgetRoundId?: string) {
  return useQuery({
    queryKey: ['my-cases', budgetRoundId],
    queryFn: () => fetchMyCases(budgetRoundId),
  });
}

export function useMyTasks() {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => fetchMyTasks(),
  });
}

export function useUpdateListPlacement(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ListPlacementPayload) => updateListPlacement(caseId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
    },
  });
}
