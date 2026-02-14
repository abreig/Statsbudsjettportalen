import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, BodyShort, Heading, Loader, Select, Tabs } from '@navikt/ds-react';
import { useAuthStore } from '../stores/authStore.ts';
import { isFagRole, isFinRole, ROLE_LABELS } from '../lib/roles.ts';

interface TestUser {
  email: string;
  name: string;
  role: string;
  jobTitle?: string;
  departmentCode: string;
  departmentName: string;
  section?: string;
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

// FIN users organized by hierarchy
const FIN_LEADERSHIP: TestUser[] = [
  { email: 'depraad.fin@test.no', name: 'Elisabeth Torp', role: 'departementsraad_fin', jobTitle: 'Departementsråd', departmentCode: 'FIN', departmentName: 'Finansdepartementet' },
  { email: 'ekspsjef.fin@test.no', name: 'Arne Lindgren', role: 'ekspedisjonssjef_fin', jobTitle: 'Ekspedisjonssjef', departmentCode: 'FIN', departmentName: 'Finansdepartementet' },
  { email: 'admin@test.no', name: 'Admin Bruker', role: 'administrator', departmentCode: 'FIN', departmentName: 'Finansdepartementet' },
];

interface FinSection {
  name: string;
  depts: string;
  avdDir: TestUser;
  undDirs: TestUser[];
  saksbehandlere: TestUser[];
}

const FIN_SECTIONS: FinSection[] = [
  {
    name: 'Næringseksjonen',
    depts: 'KLD, ED, LMD, NFD, UD',
    avdDir: { email: 'avddir.naering@fin.test.no', name: 'Morten Vik', role: 'avdelingsdirektor_fin', jobTitle: 'Avdelingsdirektør', departmentCode: 'FIN', departmentName: 'Finansdepartementet', section: 'Næringseksjonen' },
    undDirs: [
      { email: 'unddir.naering1@fin.test.no', name: 'Silje Haugen', role: 'underdirektor_fin', jobTitle: 'Underdirektør', departmentCode: 'FIN', departmentName: 'Finansdepartementet', section: 'Næringseksjonen' },
      { email: 'unddir.naering2@fin.test.no', name: 'Tor Berge', role: 'underdirektor_fin', jobTitle: 'Underdirektør', departmentCode: 'FIN', departmentName: 'Finansdepartementet', section: 'Næringseksjonen' },
    ],
    saksbehandlere: [
      { email: 'fin.kld@test.no', name: 'Eva Johansen', role: 'saksbehandler_fin', jobTitle: 'Seniorrådgiver', departmentCode: 'FIN', departmentName: 'Finansdepartementet', section: 'Næringseksjonen' },
      { email: 'fin.ed@test.no', name: 'Lars Bakken', role: 'saksbehandler_fin', jobTitle: 'Rådgiver', departmentCode: 'FIN', departmentName: 'Finansdepartementet', section: 'Næringseksjonen' },
    ],
  },
  {
    name: 'Statsforvaltningsseksjonen',
    depts: 'KUD, FIN, SD, DFD, JD, FD',
    avdDir: { email: 'avddir.statsforv@fin.test.no', name: 'Kristin Aas', role: 'avdelingsdirektor_fin', jobTitle: 'Avdelingsdirektør', departmentCode: 'FIN', departmentName: 'Finansdepartementet', section: 'Statsforvaltningsseksjonen' },
    undDirs: [
      { email: 'unddir.statsforv1@fin.test.no', name: 'Hans Dahl', role: 'underdirektor_fin', jobTitle: 'Underdirektør', departmentCode: 'FIN', departmentName: 'Finansdepartementet', section: 'Statsforvaltningsseksjonen' },
    ],
    saksbehandlere: [
      { email: 'fin.sd1@test.no', name: 'Dag Solberg', role: 'saksbehandler_fin', jobTitle: 'Seniorrådgiver', departmentCode: 'FIN', departmentName: 'Finansdepartementet', section: 'Statsforvaltningsseksjonen' },
      { email: 'fin.jd1@test.no', name: 'Siri Jensen', role: 'saksbehandler_fin', jobTitle: 'Seniorrådgiver', departmentCode: 'FIN', departmentName: 'Finansdepartementet', section: 'Statsforvaltningsseksjonen' },
    ],
  },
  {
    name: 'Overføringsseksjonen',
    depts: 'HOD, BFD, KDD, KD, AID',
    avdDir: { email: 'avddir.overf@fin.test.no', name: 'Per Olsen', role: 'avdelingsdirektor_fin', jobTitle: 'Avdelingsdirektør', departmentCode: 'FIN', departmentName: 'Finansdepartementet', section: 'Overføringsseksjonen' },
    undDirs: [
      { email: 'unddir.overf1@fin.test.no', name: 'Marit Berg', role: 'underdirektor_fin', jobTitle: 'Underdirektør', departmentCode: 'FIN', departmentName: 'Finansdepartementet', section: 'Overføringsseksjonen' },
    ],
    saksbehandlere: [
      { email: 'fin.hod1@test.no', name: 'Anna Pedersen', role: 'saksbehandler_fin', jobTitle: 'Seniorrådgiver', departmentCode: 'FIN', departmentName: 'Finansdepartementet', section: 'Overføringsseksjonen' },
      { email: 'fin.aid1@test.no', name: 'Kari Hansen', role: 'saksbehandler_fin', jobTitle: 'Seniorrådgiver', departmentCode: 'FIN', departmentName: 'Finansdepartementet', section: 'Overføringsseksjonen' },
    ],
  },
];

const FAG_USER_NAMES: [string, string, string, string, string, string][] = [
  ['Kari Nordmann', 'Ole Hansen', 'Marte Moen', 'Gro Aas', 'Randi Dahl', 'Odd Lund'],
  ['Eva Johansen', 'Per Olsen', 'Turid Svendsen', 'Dag Aasen', 'Liv Brekke', 'Alf Fjeld'],
  ['Anna Larsen', 'Bjørn Andersen', 'Siri Vik', 'Nils Rønning', 'Kristin Hauge', 'Svein Bye'],
  ['Ingrid Pedersen', 'Erik Nilsen', 'Else Tangen', 'Trond Borge', 'Hege Ås', 'Leif Sten'],
  ['Marit Kristiansen', 'Lars Jensen', 'Solveig Ryen', 'Pål Ness', 'Anita Vang', 'Øyvind Eid'],
  ['Hilde Berg', 'Tor Haugen', 'Wenche Krog', 'Helge Rud', 'Bente Foss', 'Arve Hol'],
  ['Silje Hagen', 'Hans Eriksen', 'Trine Ask', 'Gunnar Sæther', 'Tonje Bø', 'Ivar Rud'],
  ['Berit Bakken', 'Jon Solberg', 'Kirsten Lien', 'Atle Rø', 'Guri Sand', 'Magne Eng'],
  ['Marte Moen', 'Stein Strand', 'Åse Dybdahl', 'Rolf Bjørk', 'Inger Nes', 'Kåre Furu'],
  ['Gro Aas', 'Geir Lie', 'Ellen Lund', 'Vidar Mo', 'Nina Ås', 'Terje Vik'],
  ['Randi Dahl', 'Odd Lund', 'Frøydis Hem', 'Tore Li', 'Heidi Dal', 'Arne Ås'],
  ['Turid Svendsen', 'Dag Aasen', 'Sigrid Nes', 'Knut Hol', 'Tone Rud', 'Jan Eid'],
  ['Liv Brekke', 'Alf Fjeld', 'Astrid Mo', 'Olav Foss', 'Gerd Sand', 'Roar Eng'],
  ['Siri Vik', 'Nils Rønning', 'Jorunn Bø', 'Erlend Nes', 'Karin Rud', 'Bjarne Li'],
  ['Kristin Hauge', 'Svein Bye', 'Ragnhild Ask', 'Harald Hol', 'Anne Furu', 'Einar Eid'],
];

function getFagUsers(deptIndex: number): TestUser[] {
  const dept = FAG_DEPARTMENTS[deptIndex];
  const names = FAG_USER_NAMES[deptIndex];
  const code = dept.code.toLowerCase();
  return [
    { email: `fag.${code}@test.no`, name: names[0], role: 'saksbehandler_fag', jobTitle: 'Seniorrådgiver', departmentCode: dept.code, departmentName: dept.name },
    { email: `budsjett.${code}@test.no`, name: names[1], role: 'budsjettenhet_fag', jobTitle: 'Rådgiver', departmentCode: dept.code, departmentName: dept.name },
    { email: `unddir.${code}@test.no`, name: names[2], role: 'underdirektor_fag', jobTitle: 'Underdirektør', departmentCode: dept.code, departmentName: dept.name },
    { email: `avddir.${code}@test.no`, name: names[3], role: 'avdelingsdirektor_fag', jobTitle: 'Avdelingsdirektør', departmentCode: dept.code, departmentName: dept.name },
    { email: `ekspsjef.${code}@test.no`, name: names[4], role: 'ekspedisjonssjef_fag', jobTitle: 'Ekspedisjonssjef', departmentCode: dept.code, departmentName: dept.name },
    { email: `depraad.${code}@test.no`, name: names[5], role: 'departementsraad_fag', jobTitle: 'Departementsråd', departmentCode: dept.code, departmentName: dept.name },
  ];
}

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<number>(7); // Default KLD
  const [finSection, setFinSection] = useState<string>('leadership');

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

  const renderUserCard = (u: TestUser, compact = false) => {
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
        className={`relative cursor-pointer rounded-lg border-2 bg-white text-left shadow-sm transition-all hover:shadow-md disabled:opacity-60 ${compact ? 'p-3' : 'p-5'}`}
        style={{ borderColor }}
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80">
            <Loader size="medium" />
          </div>
        )}
        <div className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'mb-1 text-base'}`}>
          {u.name}
        </div>
        <div className={`font-medium ${compact ? 'text-xs' : 'mb-1 text-sm'}`} style={{ color: borderColor }}>
          {ROLE_LABELS[u.role] ?? u.role}
        </div>
        {u.jobTitle && (
          <div className="text-xs text-gray-500">{u.jobTitle}</div>
        )}
        {u.section && (
          <div className="text-xs text-gray-400">{u.section}</div>
        )}
        {!compact && (
          <div className="mt-1 font-mono text-xs text-gray-400">{u.email}</div>
        )}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-4xl">
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

        {/* FIN section */}
        <div className="mb-6">
          <Heading size="small" level="2" className="mb-3">
            <span style={{ color: 'var(--color-fin)' }}>FIN</span> Budsjettavdelingen
          </Heading>

          <Tabs defaultValue="leadership" size="small" onChange={setFinSection} value={finSection}>
            <Tabs.List>
              <Tabs.Tab value="leadership" label="Ledelse / Admin" />
              {FIN_SECTIONS.map((sec) => (
                <Tabs.Tab key={sec.name} value={sec.name} label={sec.name} />
              ))}
            </Tabs.List>

            <Tabs.Panel value="leadership" className="pt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {FIN_LEADERSHIP.map((u) => renderUserCard(u))}
              </div>
            </Tabs.Panel>

            {FIN_SECTIONS.map((sec) => (
              <Tabs.Panel key={sec.name} value={sec.name} className="pt-4">
                <BodyShort size="small" className="mb-3 text-gray-500">
                  Ansvar: {sec.depts}
                </BodyShort>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase text-gray-400">Avdelingsdirektør</div>
                    <div className="grid gap-3 sm:grid-cols-1" style={{ maxWidth: '300px' }}>
                      {renderUserCard(sec.avdDir, true)}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase text-gray-400">Underdirektører</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {sec.undDirs.map((u) => renderUserCard(u, true))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase text-gray-400">Saksbehandlere</div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {sec.saksbehandlere.map((u) => renderUserCard(u, true))}
                    </div>
                  </div>
                </div>
              </Tabs.Panel>
            ))}
          </Tabs>
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

          <div className="grid gap-3 sm:grid-cols-3">
            {fagUsers.map((u) => renderUserCard(u, true))}
          </div>
        </div>
      </div>
    </div>
  );
}
