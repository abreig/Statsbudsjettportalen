# Teknologivalg og Arkitektur

*Oppdatert mars 2026 – reflekterer faktisk implementert løsning.*

## Teknologistack

| Komponent | Teknologi | Begrunnelse |
|-----------|-----------|-------------|
| Frontend | React 19 + TypeScript + Vite | Modent økosystem, stor utviklerpool |
| Rich text | TipTap 3 (ProseMirror) | Dokumentmodell, spor endringer, kommentarer |
| State management | Zustand + TanStack Query 5 | Enklere enn Redux, god caching og servertilstandshåndtering |
| UI-bibliotek | Aksel (NAV) | Tilgjengelig, norsk offentlig sektor |
| Styling | Tailwind CSS 4 + Aksel CSS | Rask utvikling, konsistent design |
| Backend | .NET 8 (ASP.NET Core Web API, C#) | Typesikkerhet, SignalR-klar, enterprise-ready |
| ORM | Entity Framework Core 8 + Npgsql | Code-first migrasjoner, JSONB-støtte |
| Database | PostgreSQL 16 | Robust, JSONB-støtte, gratis |
| Connection pool | PgBouncer 1.22 (transaction mode) | Håndterer 100–500 samtidige brukere |
| Cache | Redis 7 (StackExchange.Redis) | Saksoversikt, låsestatus, bruker-/dept-oppslag |
| Dokumenteksport | DocumentFormat.OpenXml | Word-eksport for saker og departementsliste |
| Autentisering (dev) | Mock JWT | Entra ID integreres ved produksjonsdeploy |
| Hosting | Azure Web Apps for Containers | Støtter også Sopra Steria privat sky |

## Arkitekturprinsipper

- **Hendelsesdrevet:** Event sourcing for full sporbarhet (`case_events`)
- **Modulær monolitt:** Kan splittes til mikrotjenester senere
- **API-first:** REST API med klare endepunkter
- **Sikkerhet i dybden:** Mock-auth i dev, Entra ID i produksjon, RBAC, rate limiting
- **Ytelse:** PgBouncer + Redis-cache + asynkron eksport-køjobbing

## Frontend-struktur

```
src/
  pages/
    LoginPage.tsx            # Mock-innlogging (Entra ID i produksjon)
    BudgetRoundSelect.tsx    # Velg budsjettrunde (US-01)
    CaseOverview.tsx         # Saksoversikt med tabell (US-03, US-09)
    CaseDetail.tsx           # Dokumentredigering med TipTap (US-04, US-10, US-18, US-19)
    CaseCreate.tsx           # Opprett ny sak (US-02, US-14)
    SubmissionView.tsx       # Samlet innspill til FIN (US-06)
    DepartmentListEditor.tsx # WYSIWYG depliste-redigering (US-25–33)
    VersionHistory.tsx       # Versjonslogg (US-16)
  components/
    CaseTable/               # Filtrering, søk, sortering
    CaseForm/                # Dynamiske felt basert på sakstype
    RichTextEditor/          # TipTap-wrapper med spor endringer
    WorkflowBar/             # Statuslinje og handlinger
    CommentThread/           # Kommentarer og spørsmål/svar
    DepartmentList/          # WYSIWYG depliste-komponenter
  hooks/
    useCaseQuery.ts          # TanStack Query hooks for saker
    useResourceLock.ts       # Pessimistisk låsing for samtidsredigering
  stores/
    authStore.ts             # Bruker og rolle
    caseStore.ts             # Aktiv sak
    filterStore.ts           # Filtre og søk
```

## Backend-struktur

```
Statsbudsjettportalen.Api/
  Controllers/
    AuthController           # Mock JWT-auth
    CasesController          # Sak-CRUD, status, innhold, hendelser
    BudgetRoundsController   # Budsjettrunder
    SubmissionsController    # Innspill FAG → FIN
    QuestionsController      # Spørsmål/svar
    CommentsController       # Kommentarer
    DepartmentListsController        # Depliste-redigering
    DepartmentListTemplatesController
    ExportController         # Word-eksport (synkron)
    ExportJobsController     # Asynkrone eksportjobber
    CaseConclusionsController
    CaseTypesController
    LocksController          # Ressurslåsing
    AdminController          # Database-reset (kun dev)
  Services/
    WorkflowService          # Tilstandsmaskin for saksstatus
    WordExportService        # Word-eksport for enkeltssaker
    DepListWordExportService # Word-eksport for departementslister
    DepartmentListService    # Depliste-forretningslogikk
    ExportJobService         # Bakgrunnskø for eksport
    ResourceLockService      # Pessimistisk låsing (5-min lease)
    CacheService             # Redis/in-memory cache-wrapper
    RoleResolver             # RBAC og rollebestemmelse
  Models/                    # EF Core-entiteter
  Data/                      # DbContext og seed-data
  DTOs/                      # Request/Response-objekter
  Middleware/                # Mock-autentisering, rate limiting
```

## Database-skjema (PostgreSQL)

### Kjernetabeller

```sql
CREATE TABLE budget_rounds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL,       -- f.eks. 'AUG2026'
    type            VARCHAR(20) NOT NULL,       -- 'mars', 'august', 'rnb', 'nysaldering'
    year            INT NOT NULL,
    status          VARCHAR(20) DEFAULT 'open', -- 'open', 'closed', 'archived'
    deadline        TIMESTAMPTZ
);

CREATE TABLE cases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_round_id     UUID NOT NULL REFERENCES budget_rounds(id),
    department_id       UUID NOT NULL REFERENCES departments(id),
    case_name           VARCHAR(500) NOT NULL,
    chapter             VARCHAR(10),
    post                VARCHAR(10),
    amount              BIGINT,                 -- beløp i tusen kroner
    case_type           VARCHAR(30) NOT NULL,   -- 'satsingsforslag', 'budsjettiltak', 'teknisk_justering'
    status              VARCHAR(30) DEFAULT 'draft',
    assigned_to         UUID REFERENCES users(id),
    created_by          UUID NOT NULL REFERENCES users(id),
    origin              VARCHAR(10) DEFAULT 'fag',  -- 'fag' eller 'fin'
    fin_list_placement  VARCHAR(10),            -- 'a_list', 'b_list', null
    priority_number     INT,                    -- FINs prioritering i depliste
    latest_content_id   UUID,                   -- denormalisert for ytelse
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Statusverdier: draft → under_arbeid → til_avklaring → klarert → godkjent_pol
--               → sendt_til_fin → under_vurdering_fin → returnert_til_fag | ferdigbehandlet_fin
```

### Innhold og versjonering

```sql
CREATE TABLE case_content (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id                 UUID NOT NULL REFERENCES cases(id),
    version                 INT NOT NULL,
    content_json            JSONB,              -- ProseMirror/TipTap-dokument
    proposal_text           TEXT,               -- forslag til omtale (synkronisert fra JSON)
    justification           TEXT,               -- begrunnelse
    verbal_conclusion       TEXT,               -- FAGs verbalkonklusjon
    socioeconomic_analysis  TEXT,
    goal_indicator          TEXT,
    benefit_plan            TEXT,
    comment                 TEXT,
    fin_assessment          TEXT,               -- FINs vurdering
    fin_verbal              TEXT,               -- FINs verbalkonklusjon
    fin_r_conclusion        TEXT,
    created_by              UUID NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE case_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id     UUID NOT NULL REFERENCES cases(id),
    event_type  VARCHAR(30) NOT NULL,
    event_data  JSONB,                          -- full hendelse med diff
    user_id     UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT now()
);
-- Event types: created, updated, status_changed, sent_to_fin, returned_to_fag,
--              question_asked, question_answered, comment_added
```

### Saksflyt og kommunikasjon

```sql
CREATE TABLE clearances (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id      UUID NOT NULL REFERENCES cases(id),
    requested_by UUID NOT NULL REFERENCES users(id),
    assigned_to  UUID NOT NULL REFERENCES users(id),
    role_type    VARCHAR(30),       -- 'fagavdeling', 'pol', 'underdirektor', 'sbr'
    status       VARCHAR(20) DEFAULT 'pending',
    comment      TEXT,
    created_at   TIMESTAMPTZ DEFAULT now(),
    resolved_at  TIMESTAMPTZ
);

CREATE TABLE questions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id       UUID NOT NULL REFERENCES cases(id),
    asked_by      UUID NOT NULL REFERENCES users(id),
    question_text TEXT NOT NULL,
    answer_text   TEXT,
    answered_by   UUID REFERENCES users(id),
    created_at    TIMESTAMPTZ DEFAULT now(),
    answered_at   TIMESTAMPTZ
);

CREATE TABLE submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_round_id UUID NOT NULL REFERENCES budget_rounds(id),
    department_id   UUID NOT NULL REFERENCES departments(id),
    submitted_by    UUID NOT NULL REFERENCES users(id),
    is_supplement   BOOLEAN DEFAULT false,
    submitted_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE submission_cases (
    submission_id UUID REFERENCES submissions(id),
    case_id       UUID REFERENCES cases(id),
    PRIMARY KEY (submission_id, case_id)
);
```

### Departementsliste

```sql
CREATE TABLE department_list_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    config      JSONB NOT NULL,         -- seksjonsstruktur og malkonfigurasjon
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE department_list_template_sections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES department_list_templates(id),
    section_type VARCHAR(50) NOT NULL,  -- 'department_header', 'case_group', 'fixed_content', osv.
    config      JSONB NOT NULL,
    sort_order  INT NOT NULL
);

CREATE TABLE case_conclusions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id     UUID NOT NULL REFERENCES cases(id),
    content     TEXT NOT NULL,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT now()
);
```

### Infrastruktur og brukere

```sql
CREATE TABLE resource_locks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id  UUID NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    locked_by    UUID NOT NULL REFERENCES users(id),
    expires_at   TIMESTAMPTZ NOT NULL,   -- 5-minutters lease
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE departments (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL
);

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entra_id      VARCHAR(100) UNIQUE,
    email         VARCHAR(200) NOT NULL,
    full_name     VARCHAR(200) NOT NULL,
    department_id UUID REFERENCES departments(id),
    role          VARCHAR(30) NOT NULL,
    is_active     BOOLEAN DEFAULT true
);

CREATE TABLE attachments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id     UUID NOT NULL REFERENCES cases(id),
    file_name   VARCHAR(500) NOT NULL,
    file_path   VARCHAR(1000) NOT NULL,
    file_size   BIGINT,
    mime_type   VARCHAR(100),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT now()
);
```

### Ytelsesindekser

```sql
CREATE INDEX idx_case_content_latest      ON case_content (case_id, version DESC);
CREATE INDEX idx_cases_dept_round         ON cases (department_id, budget_round_id);
CREATE INDEX idx_case_events_case         ON case_events (case_id, created_at);
CREATE INDEX idx_resource_locks_resource  ON resource_locks (resource_id, resource_type);
```

## Versjoneringsstrategi

Hver gang en sak redigeres, opprettes en ny rad i `case_content` med økende versjonsnummer. `content_json` lagrer hele ProseMirror-dokumentet som JSONB; de individuelle tekstfeltene synkroniseres ved lagring for bakoverkompatibilitet med eksport. `case_events` logger diff og metadata for arkivkrav (US-16).

## API-design (REST)

```
# Auth
POST   /api/auth/login              # Mock innlogging
GET    /api/auth/me                 # Innlogget bruker
GET    /api/auth/users              # Alle brukere

# Budsjettrunder
GET    /api/budget-rounds
GET    /api/budget-rounds/:id

# Saker
GET    /api/cases
POST   /api/cases
GET    /api/cases/:id
PUT    /api/cases/:id
PATCH  /api/cases/:id/status
POST   /api/cases/:id/content
GET    /api/cases/:id/content
GET    /api/cases/:id/content/:ver
GET    /api/cases/:id/events

# Kommunikasjon
GET    /api/cases/:id/questions
POST   /api/cases/:id/questions
PATCH  /api/questions/:id/answer

# Innspill
POST   /api/submissions
GET    /api/submissions

# Departementsliste
GET    /api/department-lists
POST   /api/department-lists
GET    /api/department-lists/:id
PUT    /api/department-lists/:id

# Maler
GET    /api/department-list-templates
POST   /api/department-list-templates

# Eksport
POST   /api/export/case/:id         # Synkron Word-eksport
POST   /api/export-jobs             # Asynkron eksportjobb
GET    /api/export-jobs/:id

# Låsing
POST   /api/locks
DELETE /api/locks/:id
GET    /api/locks/:resourceId

# Admin
POST   /api/admin/reset-database    # Kun dev
```

## Ytelse og skalerbarhet

- **PgBouncer:** Transaction mode, pool_size=40, max_client_conn=300
- **Redis-cache:** Saksliste (15s TTL), låsestatus (5s), bruker/dept (5 min). In-memory fallback hvis Redis er nede.
- **Rate limiting:** 5 eksporter/min, 30 lagringer/min, 120 API-kall/min per bruker
- **Asynkron eksport:** Eksportjobber kjøres i bakgrunn, resultat hentes via polling
- **Response compression:** Brotli + gzip
- **Kubernetes:** HPA-manifest inkludert, graceful shutdown med connection draining
- **Lasttesting:** Locust-profiler for 20/100/300/500 samtidige brukere

## Prosjektstruktur

```
├── backend/
│   └── Statsbudsjettportalen.Api/
│       ├── Controllers/
│       ├── Models/
│       ├── Data/              # DbContext og seed-data (600 saker, 33 brukere)
│       ├── DTOs/
│       ├── Services/
│       └── Middleware/
├── frontend/
│   └── src/
│       ├── api/               # Axios-klient
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── pages/
│       ├── stores/
│       └── styles/
├── k8s/                       # Kubernetes-manifester
├── loadtest/                  # Locust-lasttestskript
├── .devcontainer/             # GitHub Codespaces-konfigurasjon
├── .github/workflows/         # CI/CD (Azure container + ZIP deploy)
├── docker-compose.yml         # Lokal utviklingsstack
└── Dockerfile                 # Flerstegs produksjonsbygg
```
