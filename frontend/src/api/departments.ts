import apiClient from './client';

export interface Department {
  id: string;
  code: string;
  name: string;
}

export async function fetchDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get<Department[]>('/departments');
  return data;
}
