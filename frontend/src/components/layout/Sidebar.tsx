import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.ts';
import { canCreateCase, canSubmitToFin, isFinRole, isFagRole, isAdmin } from '../../lib/roles.ts';
import {
  LayoutList,
  PlusCircle,
  Send,
  Inbox,
  CalendarDays,
  Settings,
  Building2,
  Archive,
  UserCircle,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  show: boolean;
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';

  const items: NavItem[] = [
    {
      to: '/budget-rounds',
      label: 'Budsjettrunder',
      icon: <CalendarDays size={20} />,
      show: true,
    },
    {
      to: '/cases',
      label: 'Saksoversikt',
      icon: <LayoutList size={20} />,
      show: true,
    },
    {
      to: '/my-cases',
      label: 'Mine saker',
      icon: <UserCircle size={20} />,
      show: true,
    },
    {
      to: '/cases/new',
      label: 'Opprett sak',
      icon: <PlusCircle size={20} />,
      show: canCreateCase(role),
    },
    {
      to: '/submissions',
      label: 'Send innspill',
      icon: <Send size={20} />,
      show: canSubmitToFin(role),
    },
    {
      to: '/at-fin',
      label: 'Hos FIN',
      icon: <Building2 size={20} />,
      show: isFagRole(role),
    },
    {
      to: '/cases',
      label: 'Innspill fra FAG',
      icon: <Inbox size={20} />,
      show: isFinRole(role) && !isFagRole(role),
    },
    {
      to: '/history',
      label: 'Historikk',
      icon: <Archive size={20} />,
      show: true,
    },
    {
      to: '/admin/case-types',
      label: 'Sakstyper',
      icon: <Settings size={20} />,
      show: isAdmin(role),
    },
  ];

  const visibleItems = items.filter((item) => item.show);

  return (
    <nav className="w-60 shrink-0 border-r border-gray-200 bg-white">
      <ul className="flex flex-col gap-1 p-3">
        {visibleItems.map((item) => (
          <li key={item.to + item.label}>
            <NavLink
              to={item.to}
              end={item.to === '/cases'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--a-surface-action-subtle)] text-[var(--a-text-action)]'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
