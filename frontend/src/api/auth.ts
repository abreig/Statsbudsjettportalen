import apiClient from './client';
import type { User } from '../lib/types';

interface LoginResponse {
  token: string;
  user: User;
}

export async function login(email: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}

export async function getUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>('/auth/users');
  return data;
}
