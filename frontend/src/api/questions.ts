import apiClient from './client';
import type { Question, QuestionWithCase } from '../lib/types';

export async function fetchQuestions(caseId: string): Promise<Question[]> {
  const { data } = await apiClient.get<Question[]>(`/cases/${caseId}/questions`);
  return data;
}

export async function createQuestion(caseId: string, questionText: string): Promise<Question> {
  const { data } = await apiClient.post<Question>(`/cases/${caseId}/questions`, { questionText });
  return data;
}

export async function answerQuestion(
  questionId: string,
  answerText: string,
  answerJson?: string | null
): Promise<Question> {
  const { data } = await apiClient.patch<Question>(`/questions/${questionId}/answer`, {
    answerText,
    answerJson,
  });
  return data;
}

export async function fetchMyPendingQuestions(): Promise<QuestionWithCase[]> {
  const { data } = await apiClient.get<QuestionWithCase[]>('/questions/my-pending');
  return data;
}
