import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTemplates,
  fetchTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  replaceTemplateSections,
  fetchDepartmentLists,
  fetchDepartmentList,
  createDepartmentList,
  fetchConclusions,
  createConclusion,
  updateConclusion,
  deleteConclusion,
  replaceConclusions,
} from '../api/departmentLists';
import type { TemplateCreatePayload, TemplateUpdatePayload, TemplateSectionInput, DepartmentListCreatePayload } from '../api/departmentLists';

// ===== Template Hooks =====

export function useTemplates(budgetRoundType?: string) {
  return useQuery({
    queryKey: ['department-list-templates', budgetRoundType],
    queryFn: () => fetchTemplates(budgetRoundType ? { budget_round_type: budgetRoundType } : undefined),
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['department-list-templates', id],
    queryFn: () => fetchTemplate(id!),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TemplateCreatePayload) => createTemplate(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['department-list-templates'] });
    },
  });
}

export function useUpdateTemplate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TemplateUpdatePayload) => updateTemplate(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['department-list-templates'] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['department-list-templates'] });
    },
  });
}

export function useReplaceTemplateSections(templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sections: TemplateSectionInput[]) => replaceTemplateSections(templateId, sections),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['department-list-templates', templateId] });
    },
  });
}

// ===== Department List Hooks =====

export function useDepartmentLists(budgetRoundId?: string, departmentId?: string) {
  return useQuery({
    queryKey: ['department-lists', budgetRoundId, departmentId],
    queryFn: () => fetchDepartmentLists({
      budget_round_id: budgetRoundId,
      department_id: departmentId,
    }),
  });
}

export function useDepartmentList(id: string | undefined) {
  return useQuery({
    queryKey: ['department-lists', id],
    queryFn: () => fetchDepartmentList(id!),
    enabled: !!id,
  });
}

export function useCreateDepartmentList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DepartmentListCreatePayload) => createDepartmentList(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['department-lists'] });
    },
  });
}

// ===== Conclusion Hooks =====

export function useConclusions(caseId: string | undefined) {
  return useQuery({
    queryKey: ['conclusions', caseId],
    queryFn: () => fetchConclusions(caseId!),
    enabled: !!caseId,
  });
}

export function useCreateConclusion(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { text: string; sortOrder: number }) => createConclusion(caseId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conclusions', caseId] });
    },
  });
}

export function useUpdateConclusion(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conclusionId, ...payload }: { conclusionId: string; text?: string; sortOrder?: number }) =>
      updateConclusion(caseId, conclusionId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conclusions', caseId] });
    },
  });
}

export function useDeleteConclusion(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conclusionId: string) => deleteConclusion(caseId, conclusionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conclusions', caseId] });
    },
  });
}

export function useReplaceConclusions(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conclusions: { text: string; sortOrder: number }[]) => replaceConclusions(caseId, conclusions),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conclusions', caseId] });
    },
  });
}
