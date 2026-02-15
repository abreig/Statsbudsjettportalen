import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as apiLogin } from '../api/auth';
import type { User } from '../lib/types';
import { isFagRole, isFinRole } from '../lib/roles';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isFag: () => boolean;
  isFin: () => boolean;
  getAssignedDepartmentCodes: () => string[];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: async (email: string) => {
        const response = await apiLogin(email);
        localStorage.setItem('auth_token', response.token);
        set({ user: response.user, token: response.token });
      },
      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null });
      },
      isFag: () => {
        const user = get().user;
        return user ? isFagRole(user.role) : false;
      },
      isFin: () => {
        const user = get().user;
        return user ? isFinRole(user.role) : false;
      },
      getAssignedDepartmentCodes: () => {
        const user = get().user;
        return user?.assignedDepartments?.map((d) => d.departmentCode) ?? [];
      },
    }),
    { name: 'auth-storage' }
  )
);
