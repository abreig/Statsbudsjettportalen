# Teknologivalg og Arkitektur

## Anbefalt Stack

| Komponent | Teknologi | Begrunnelse |
|-----------|-----------|-------------|
| Frontend | React 18 + TypeScript + Vite | Modent økosystem, stor utviklerpool |
| State Management | Zustand + React Query | Enklere enn Redux, god caching |
| UI-bibliotek | Aksel (NAV) eller Radix UI | Tilgjengelig, norsk offentlig sektor |
| Styling | Tailwind CSS + CSS Modules | Rask utvikling, konsistent design |
| Backend | .NET 8 / Python FastAPI | .NET: typesikkerhet. FastAPI: raskere prototyping |
| Database | PostgreSQL 16 | Robust, JSONB-støtte, gratis |
| Cache | Redis | Sesjoner, sanntidsdata (senere) |
| Autentisering (POC) | Mock med roller | Entra ID integreres ved deploy |
| Hosting | Sopra Steria privat sky | Bedriftskrav |

## Arkitekturprinsipper

- **Hendelsesdrevet:** Event sourcing for full sporbarhet
- **Modulær monolitt:** Kan splittes til mikrotjenester senere
- **API-first:** REST API med klare endepunkter
- **Sikkerhet i dybden:** Mock autentisering i POC, Entra ID i produksjon, RBAC, RLS i database

## Kritiske beslutninger

### Backend-språk

| Alternativ | Fordeler | Ulemper | Anbefaling |
|------------|----------|---------|------------|
| .NET 8 (C#) | Typesikkerhet, SignalR, enterprise-ready | Større utviklingstid | Hvis team kan C# |
| Python FastAPI | Raskere prototyping, enklere for POC | Svakere typing | Hvis rask POC prioriteres |

**Beslutning:** Velg basert på teamets kompetanse. Begge fungerer.

### Database-hosting i POC

| Alternativ | Fordeler | Ulemper | Anbefaling |
|------------|----------|---------|------------|
| Lokal PostgreSQL (Docker) | Enkel oppsett, full kontroll, gratis | Hver utvikler må sette opp | For POC |
| Sopra Steria cloud database | Delt database, backup, produksjonslikt | Krever tilgang og oppsett | For Fase 1+ |

**Beslutning:** Lokal Docker for POC. Cloud i Fase 1.

### Designsystem

| Alternativ | Fordeler | Ulemper | Anbefaling |
|------------|----------|---------|------------|
| Aksel (NAV) | Ferdig norsk offentlig designsystem | Krever tilpasning til FIN profil | Anbefalt |
| Radix UI + egen styling | Full fleksibilitet | Mer arbeid | Hvis Aksel ikke passer |

**Beslutning:** Start med Aksel, tilpass farger til FIN.

## Frontend-struktur

```
src/
  pages/
    LoginPage.tsx            # AD-innlogging
    BudgetRoundSelect.tsx    # Velg budsjettrunde (US-01)
    CaseOverview.tsx         # Saksoversikt med tabell (US-03, US-09)
    CaseDetail.tsx           # Detaljvisning/redigering (US-04, US-10)
    CaseCreate.tsx           # Opprett ny sak (US-02, US-14)
    SubmissionView.tsx       # Samlet innspill til FIN (US-06)
    DepartmentListExport.tsx # Generer departementsliste (US-15, US-21)
    VersionHistory.tsx       # Versjonslogg (US-16)
  components/
    CaseTable/               # Filtrering, søk, sortering
    CaseForm/                # Dynamiske felt basert på sakstype
    RichTextEditor/          # TipTap-wrapper med spor endringer
    WorkflowBar/             # Statuslinje og handlinger
    CommentThread/           # Kommentarer og spørsmål/svar
    Notifications/           # Varsler
  hooks/
    useCaseQuery.ts          # React Query hooks for saker
    useWebSocket.ts          # Sanntidstilkobling
    useCollaboration.ts      # Yjs-integrasjon (Fase 2)
  stores/
    authStore.ts             # Bruker og rolle
    caseStore.ts             # Aktiv sak
    filterStore.ts           # Filtre og søk
```

## Backend-struktur

```
Modules/
  Cases/                     # Sakshåndtering
    CaseService              # Opprett, rediger, hent saker
    CaseRepository           # Databasetilgang
    CaseEvents               # Hendelser: Created, Updated, StatusChanged
    CaseExportService        # Word/Excel-eksport

  Workflow/                  # Saksflyt og godkjenning
    WorkflowEngine           # Tilstandsmaskin for saksstatus
    ClearanceService         # Avklaring og godkjenning (US-05, US-13)
    SubmissionService        # Samlet innspill til FIN (US-06)

  Communication/             # Spørsmål, svar, kommentarer
    QuestionService          # Spørsmål/svar mellom FAG og FIN
    CommentService           # Tekstkommentarer (Fase 2)
    NotificationService      # Varsler

  Export/                    # Dokumentgenerering
    DepartmentListGenerator  # Departementsliste fra mal (US-15)
    ExcelExporter            # Saksoversikt til Excel (US-07)
    WordExporter             # Saksoversikt til Word (US-07)

  Archive/                   # Arkivering og logging
    VersioningService        # Versjonering av alle endringer
    AuditLogService          # Sporbar endringslogg
    ArchivePointService      # Arkivpunkter (US-16)

  Auth/                      # Autentisering og autorisasjon
    AuthService              # AD/Entra ID-integrasjon
    RoleService              # Rollebasert tilgang
    DepartmentService        # Departementtilhørighet

  Collaboration/             # Sanntidsredigering (Fase 2)
    YjsProvider              # WebSocket-server for Yjs
    TrackChangesService      # Spor endringer-logikk
```

## Database-skjema (PostgreSQL)

### Budget Rounds (Budsjettrunder)

```sql
CREATE TABLE budget_rounds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL,       -- f.eks. 'AUG2026'
    type            VARCHAR(20) NOT NULL,       -- 'mars', 'august', 'rnb', 'nysaldering'
    year            INT NOT NULL,
    status          VARCHAR(20) DEFAULT 'open', -- 'open', 'closed', 'archived'
    deadline        TIMESTAMPTZ
);
```

### Cases (Saker)

```sql
CREATE TABLE cases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_round_id UUID NOT NULL REFERENCES budget_rounds(id),
    department_id   UUID NOT NULL REFERENCES departments(id),
    case_name       VARCHAR(500) NOT NULL,
    chapter         VARCHAR(10),                -- kapittel, f.eks. '1428'
    post            VARCHAR(10),                -- post, f.eks. '50'
    amount          BIGINT,                     -- beløp i tusen kroner
    case_type       VARCHAR(30) NOT NULL,       -- 'satsingsforslag', 'budsjettiltak', 'teknisk_justering'
    status          VARCHAR(30) DEFAULT 'draft',
    assigned_to     UUID REFERENCES users(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    version         INT DEFAULT 1,
    origin          VARCHAR(10) DEFAULT 'fag',  -- 'fag' eller 'fin'
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

**Statusverdier:** `draft`, `under_arbeid`, `til_avklaring`, `klarert`, `sendt_til_fin`, `under_vurdering_fin`, `returnert_til_fag`, `ferdigbehandlet_fin`

### Case Content (Saksinnhold - versjonert)

```sql
CREATE TABLE case_content (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id                 UUID NOT NULL REFERENCES cases(id),
    version                 INT NOT NULL,
    proposal_text           TEXT,               -- forslag til omtale
    justification           TEXT,               -- begrunnelse
    verbal_conclusion       TEXT,               -- FAGs verbalkonklusjon
    socioeconomic_analysis  TEXT,               -- samfunnsøkonomisk analyse
    goal_indicator          TEXT,               -- mål og resultatindikator
    benefit_plan            TEXT,               -- gevinstrealiseringsplan
    comment                 TEXT,               -- intern kommentar
    fin_assessment          TEXT,               -- FINs vurdering
    fin_verbal              TEXT,               -- FINs verbalkonklusjon
    fin_r_conclusion        TEXT,               -- FINs r-konklusjon
    created_by              UUID NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ DEFAULT now()
);
```

### Case Events (Hendelseslogg)

```sql
CREATE TABLE case_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         UUID NOT NULL REFERENCES cases(id),
    event_type      VARCHAR(30) NOT NULL,
    event_data      JSONB,                      -- full hendelse med diff
    user_id         UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

**Event types:** `created`, `updated`, `status_changed`, `sent_to_fin`, `returned_to_fag`, `question_asked`, `question_answered`

### Clearances (Avklaringer)

```sql
CREATE TABLE clearances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         UUID NOT NULL REFERENCES cases(id),
    requested_by    UUID NOT NULL REFERENCES users(id),
    assigned_to     UUID NOT NULL REFERENCES users(id),
    role_type       VARCHAR(30),                -- 'fagavdeling', 'pol', 'underdirektor', 'sbr'
    status          VARCHAR(20) DEFAULT 'pending',
    comment         TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);
```

### Questions (Spørsmål/svar)

```sql
CREATE TABLE questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         UUID NOT NULL REFERENCES cases(id),
    asked_by        UUID NOT NULL REFERENCES users(id),
    question_text   TEXT NOT NULL,
    answer_text     TEXT,
    answered_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    answered_at     TIMESTAMPTZ
);
```

### Submissions (Samlet innspill)

```sql
CREATE TABLE submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_round_id UUID NOT NULL REFERENCES budget_rounds(id),
    department_id   UUID NOT NULL REFERENCES departments(id),
    submitted_by    UUID NOT NULL REFERENCES users(id),
    is_supplement   BOOLEAN DEFAULT false,
    submitted_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE submission_cases (
    submission_id   UUID REFERENCES submissions(id),
    case_id         UUID REFERENCES cases(id),
    PRIMARY KEY (submission_id, case_id)
);
```

### Departments og Users

```sql
CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(10) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entra_id        VARCHAR(100) UNIQUE,
    email           VARCHAR(200) NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    department_id   UUID REFERENCES departments(id),
    role            VARCHAR(30) NOT NULL,
    is_active       BOOLEAN DEFAULT true
);
```

### Attachments (Vedlegg)

```sql
CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         UUID NOT NULL REFERENCES cases(id),
    file_name       VARCHAR(500) NOT NULL,
    file_path       VARCHAR(1000) NOT NULL,
    file_size       BIGINT,
    mime_type       VARCHAR(100),
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    uploaded_at     TIMESTAMPTZ DEFAULT now()
);
```

## Versjoneringsstrategi

Hver gang en sak redigeres, opprettes en ny rad i `case_content` med økende versjonsnummer. Samtidig logges en hendelse i `case_events` med detaljert diff (JSONB). Dette gir både snapshot-basert tilgang til historiske versjoner og hendelsesbasert sporbarhet for arkivkrav (JTBD-11, US-16).

## API-design (REST)

```
# Budsjettrunder
GET    /api/budget-rounds
GET    /api/budget-rounds/:id

# Saker
GET    /api/cases?budget_round_id=&department_id=&status=
POST   /api/cases
GET    /api/cases/:id
PUT    /api/cases/:id
PATCH  /api/cases/:id/status

# Saksinnhold (versjonert)
GET    /api/cases/:id/content
GET    /api/cases/:id/content/:version
POST   /api/cases/:id/content

# Hendelser
GET    /api/cases/:id/events

# Avklaringer
POST   /api/cases/:id/clearances
PATCH  /api/clearances/:id

# Spørsmål
GET    /api/cases/:id/questions
POST   /api/cases/:id/questions
PATCH  /api/questions/:id/answer

# Innspill
POST   /api/submissions
GET    /api/submissions?budget_round_id=&department_id=

# Autentisering (mock)
POST   /api/auth/login
GET    /api/auth/me
```

## Prosjektstruktur

```
statsbudsjettportal/
├── docs/                    # Denne mappen - prosjektdokumentasjon
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── styles/
│   │   └── utils/
│   ├── public/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── cases/
│   │   │   ├── workflow/
│   │   │   ├── communication/
│   │   │   └── auth/
│   │   ├── models/
│   │   └── api/
│   └── requirements.txt (eller .csproj)
├── database/
│   ├── migrations/
│   └── seed/
├── testdata/
└── README.md
```
