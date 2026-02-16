import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchQuestions,
  createQuestion,
  answerQuestion,
  fetchMyPendingQuestions,
} from '../api/questions.ts';

export function useQuestions(caseId: string | undefined) {
  return useQuery({
    queryKey: ['questions', caseId],
    queryFn: () => fetchQuestions(caseId!),
    enabled: !!caseId,
  });
}

export function useCreateQuestion(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionText: string) => createQuestion(caseId, questionText),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['questions', caseId] });
    },
  });
}

export function useAnswerQuestion(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { questionId: string; answerText: string; answerJson?: string | null }) =>
      answerQuestion(params.questionId, params.answerText, params.answerJson),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['questions', caseId] });
    },
  });
}

export function useMyPendingQuestions() {
  return useQuery({
    queryKey: ['questions', 'my-pending'],
    queryFn: fetchMyPendingQuestions,
  });
}
