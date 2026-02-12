import apiClient from './client';
import type { Question } from '../lib/types';

export async function fetchQuestions(caseId: string): Promise<Question[]> {
  const { data } = await apiClient.get<Question[]>(`/cases/${caseId}/questions`);
  return data;
}

export async function createQuestion(caseId: string, questionText: string): Promise<Question> {
  const { data } = await apiClient.post<Question>(`/cases/${caseId}/questions`, { questionText });
  return data;
}

export async function answerQuestion(questionId: string, answerText: string): Promise<Question> {
  const { data } = await apiClient.patch<Question>(`/questions/${questionId}/answer`, { answerText });
  return data;
}
