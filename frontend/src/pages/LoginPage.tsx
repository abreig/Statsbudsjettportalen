import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, BodyShort, Heading, Loader } from '@navikt/ds-react';
import { useAuthStore } from '../stores/authStore.ts';
import { isFagRole, isFinRole, ROLE_LABELS } from '../lib/roles.ts';

interface TestUser {
  email: string;
  name: string;
  role: string;
  department: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'fag.kld@test.no',
    name: 'Kari Nordmann',
    role: 'saksbehandler_fag',
    department: 'Klima- og miljødepartementet',
  },
  {
    email: 'budsjett.kld@test.no',
    name: 'Ole Hansen',
    role: 'budsjettenhet_fag',
    department: 'Klima- og miljødepartementet',
  },
  {
    email: 'fin.kld@test.no',
    name: 'Eva Johansen',
    role: 'saksbehandler_fin',
    department: 'Finansdepartementet',
  },
  {
    email: 'undirdir.fin@test.no',
    name: 'Per Olsen',
    role: 'underdirektor_fin',
    department: 'Finansdepartementet',
  },
  {
    email: 'admin@test.no',
    name: 'Admin Bruker',
    role: 'administrator',
    department: 'Finansdepartementet',
  },
];

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string) => {
    setLoading(email);
    setError(null);
    try {
      await login(email);
      navigate('/budget-rounds');
    } catch {
      setError('Kunne ikke logge inn. Sjekk at backend kjorer.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Heading size="xlarge" level="1" className="mb-2">
            Statsbudsjettportalen
          </Heading>
          <BodyShort className="text-gray-600">
            Velg en testbruker for a logge inn
          </BodyShort>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {TEST_USERS.map((u) => {
            const isFag = isFagRole(u.role);
            const isFin = isFinRole(u.role);
            const borderColor = isFag
              ? 'var(--color-fag)'
              : isFin
              ? 'var(--color-fin)'
              : '#999';
            const isLoading = loading === u.email;

            return (
              <button
                key={u.email}
                onClick={() => void handleLogin(u.email)}
                disabled={loading !== null}
                className="relative cursor-pointer rounded-lg border-2 bg-white p-5 text-left shadow-sm transition-all hover:shadow-md disabled:opacity-60"
                style={{ borderColor }}
              >
                {isLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80">
                    <Loader size="medium" />
                  </div>
                )}
                <div className="mb-1 text-base font-semibold text-gray-900">
                  {u.name}
                </div>
                <div
                  className="mb-2 text-sm font-medium"
                  style={{ color: borderColor }}
                >
                  {ROLE_LABELS[u.role] ?? u.role}
                </div>
                <div className="text-xs text-gray-500">{u.department}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
