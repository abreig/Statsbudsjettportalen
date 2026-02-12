import { useQuery } from '@tanstack/react-query';
import { fetchBudgetRounds, fetchBudgetRound } from '../api/budgetRounds.ts';

export function useBudgetRounds() {
  return useQuery({
    queryKey: ['budget-rounds'],
    queryFn: fetchBudgetRounds,
  });
}

export function useBudgetRound(id: string | undefined) {
  return useQuery({
    queryKey: ['budget-rounds', id],
    queryFn: () => fetchBudgetRound(id!),
    enabled: !!id,
  });
}
