import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.ts';

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
