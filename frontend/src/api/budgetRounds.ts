import apiClient from './client';
import type { BudgetRound } from '../lib/types';

export async function fetchBudgetRounds(): Promise<BudgetRound[]> {
  const { data } = await apiClient.get<BudgetRound[]>('/budget-rounds');
  return data;
}

export async function fetchBudgetRound(id: string): Promise<BudgetRound> {
  const { data } = await apiClient.get<BudgetRound>(`/budget-rounds/${id}`);
  return data;
}
