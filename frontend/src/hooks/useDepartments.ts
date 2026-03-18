import { useQuery } from '@tanstack/react-query';
import { fetchDepartments } from '../api/departments.ts';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    staleTime: 10 * 60 * 1000,
  });
}
