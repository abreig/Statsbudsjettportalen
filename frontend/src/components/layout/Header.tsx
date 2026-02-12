import { Button, BodyShort, Detail } from '@navikt/ds-react';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.ts';
import { useUiStore } from '../../stores/uiStore.ts';
import { ROLE_LABELS } from '../../lib/roles.ts';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const selectedRound = useUiStore((s) => s.selectedRound);
  const clearRound = useUiStore((s) => s.clearRound);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    clearRound();
    navigate('/login');
  };

  return (
    <header
      style={{ backgroundColor: '#1B5E99' }}
      className="flex items-center justify-between px-6 py-3 text-white"
    >
      <div className="flex items-center gap-6">
        <span className="text-xl font-bold tracking-tight">
          Statsbudsjettportalen
        </span>
        {selectedRound && (
          <span className="rounded bg-white/20 px-3 py-1 text-sm">
            {selectedRound.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="text-right">
            <BodyShort size="small" className="!text-white font-semibold">
              {user.fullName}
            </BodyShort>
            <Detail className="!text-white/80">
              {ROLE_LABELS[user.role] ?? user.role} &mdash; {user.departmentCode}
            </Detail>
          </div>
        )}
        <Button
          variant="tertiary-neutral"
          size="small"
          icon={<LogOut size={18} className="text-white" />}
          onClick={handleLogout}
          className="!text-white hover:!bg-white/20"
        >
          Logg ut
        </Button>
      </div>
    </header>
  );
}
