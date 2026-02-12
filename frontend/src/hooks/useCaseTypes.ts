import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCaseTypes,
  createCaseType,
  updateCaseType,
  deleteCaseType,
} from '../api/caseTypes.ts';
import type { CaseTypeCreatePayload, CaseTypeUpdatePayload } from '../api/caseTypes.ts';

export function useCaseTypes() {
  return useQuery({
    queryKey: ['caseTypes'],
    queryFn: fetchCaseTypes,
  });
}

export function useCreateCaseType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CaseTypeCreatePayload) => createCaseType(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['caseTypes'] });
    },
  });
}

export function useUpdateCaseType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CaseTypeUpdatePayload }) =>
      updateCaseType(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['caseTypes'] });
    },
  });
}

export function useDeleteCaseType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCaseType(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['caseTypes'] });
    },
  });
}
