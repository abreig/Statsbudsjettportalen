import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSubmissions, createSubmission } from '../api/submissions.ts';

interface SubmissionFilters {
  budget_round_id?: string;
  department_id?: string;
}

export function useSubmissions(filters: SubmissionFilters) {
  return useQuery({
    queryKey: ['submissions', filters],
    queryFn: () => fetchSubmissions(filters),
    enabled: !!filters.budget_round_id,
  });
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { budgetRoundId: string; caseIds: string[]; isSupplement?: boolean }) =>
      createSubmission(params.budgetRoundId, params.caseIds, params.isSupplement),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['submissions'] });
      void queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}
