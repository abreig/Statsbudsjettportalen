import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, BodyShort, Heading, Loader, Select } from '@navikt/ds-react';
import { useAuthStore } from '../stores/authStore.ts';
import { isFagRole, isFinRole, ROLE_LABELS } from '../lib/roles.ts';

interface TestUser {
  email: string;
  name: string;
  role: string;
  departmentCode: string;
  departmentName: string;
}

const FAG_DEPARTMENTS: { code: string; name: string }[] = [
  { code: 'AID', name: 'Arbeids- og inkluderingsdepartementet' },
  { code: 'BFD', name: 'Barne- og familiedepartementet' },
  { code: 'DFD', name: 'Digitaliserings- og forvaltningsdepartementet' },
  { code: 'ED', name: 'Energidepartementet' },
  { code: 'FD', name: 'Forsvarsdepartementet' },
  { code: 'HOD', name: 'Helse- og omsorgsdepartementet' },
  { code: 'JD', name: 'Justis- og beredskapsdepartementet' },
  { code: 'KLD', name: 'Klima- og miljødepartementet' },
  { code: 'KDD', name: 'Kommunal- og distriktsdepartementet' },
  { code: 'KUD', name: 'Kultur- og likestillingsdepartementet' },
  { code: 'KD', name: 'Kunnskapsdepartementet' },
  { code: 'LMD', name: 'Landbruks- og matdepartementet' },
  { code: 'NFD', name: 'Nærings- og fiskeridepartementet' },
  { code: 'SD', name: 'Samferdselsdepartementet' },
  { code: 'UD', name: 'Utenriksdepartementet' },
];

const FAG_NAMES: [string, string][] = [
  ['Kari Nordmann', 'Ole Hansen'],
  ['Eva Johansen', 'Per Olsen'],
  ['Anna Larsen', 'Bjørn Andersen'],
  ['Ingrid Pedersen', 'Erik Nilsen'],
  ['Marit Kristiansen', 'Lars Jensen'],
  ['Hilde Berg', 'Tor Haugen'],
  ['Silje Hagen', 'Hans Eriksen'],
  ['Berit Bakken', 'Jon Solberg'],
  ['Marte Moen', 'Stein Strand'],
  ['Gro Aas', 'Geir Lie'],
  ['Randi Dahl', 'Odd Lund'],
  ['Turid Svendsen', 'Dag Aasen'],
  ['Liv Brekke', 'Alf Fjeld'],
  ['Siri Vik', 'Nils Rønning'],
  ['Kristin Hauge', 'Svein Bye'],
];

const FIN_USERS: TestUser[] = [
  {
    email: 'saksbehandler.fin@test.no',
    name: 'Eva Johansen',
    role: 'saksbehandler_fin',
    departmentCode: 'FIN',
    departmentName: 'Finansdepartementet',
  },
  {
    email: 'undirdir.fin@test.no',
    name: 'Per Olsen',
    role: 'underdirektor_fin',
    departmentCode: 'FIN',
    departmentName: 'Finansdepartementet',
  },
  {
    email: 'admin@test.no',
    name: 'Admin Bruker',
    role: 'administrator',
    departmentCode: 'FIN',
    departmentName: 'Finansdepartementet',
  },
];

function getFagUsers(deptIndex: number): TestUser[] {
  const dept = FAG_DEPARTMENTS[deptIndex];
  const [fagName, budsjettName] = FAG_NAMES[deptIndex];
  const code = dept.code.toLowerCase();
  return [
    {
      email: `fag.${code}@test.no`,
      name: fagName,
      role: 'saksbehandler_fag',
      departmentCode: dept.code,
      departmentName: dept.name,
    },
    {
      email: `budsjett.${code}@test.no`,
      name: budsjettName,
      role: 'budsjettenhet_fag',
      departmentCode: dept.code,
      departmentName: dept.name,
    },
  ];
}

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<number>(7); // Default KLD

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

  const fagUsers = getFagUsers(selectedDept);

  const renderUserCard = (u: TestUser) => {
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
        <div className="mb-1 text-sm font-medium" style={{ color: borderColor }}>
          {ROLE_LABELS[u.role] ?? u.role}
        </div>
        <div className="text-xs text-gray-500">{u.departmentName}</div>
        <div className="mt-1 font-mono text-xs text-gray-400">{u.email}</div>
      </button>
    );
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-3xl">
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

        {/* FIN / Admin section */}
        <div className="mb-6">
          <Heading size="small" level="2" className="mb-3">
            <span style={{ color: 'var(--color-fin)' }}>FIN</span> / Admin
          </Heading>
          <div className="grid gap-4 sm:grid-cols-3">
            {FIN_USERS.map(renderUserCard)}
          </div>
        </div>

        {/* FAG section */}
        <div>
          <Heading size="small" level="2" className="mb-3">
            <span style={{ color: 'var(--color-fag)' }}>FAG</span>-departement
          </Heading>

          <div className="mb-4">
            <Select
              label="Velg departement"
              size="small"
              value={String(selectedDept)}
              onChange={(e) => setSelectedDept(Number(e.target.value))}
            >
              {FAG_DEPARTMENTS.map((dept, i) => (
                <option key={dept.code} value={i}>
                  {dept.code} - {dept.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {fagUsers.map(renderUserCard)}
          </div>
        </div>
      </div>
    </div>
  );
}
