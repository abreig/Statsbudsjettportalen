# Statsbudsjettportalen

Digital løsning for budsjettprosessen mellom fagdepartementene (FAG) og Finansdepartementet (FIN) i Norge.

## POC-fokus

FAG-FIN datautveksling med 10 P0/P1 brukerhistorier:
- **FAG:** Opprette, redigere, sende saker til FIN (US-01, 02, 03, 04, 06)
- **FIN:** Motta, vurdere, returnere saker til FAG (US-09, 10, 11, 12)
- **Felles:** Versjonering og historikk (US-16)

## Teknologivalg

| Komponent | Teknologi |
|-----------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI-bibliotek | Aksel (NAV) |
| State Management | Zustand + TanStack Query |
| Styling | Tailwind CSS + Aksel CSS |
| Backend | .NET 8 (ASP.NET Core Web API) |
| ORM | Entity Framework Core + Npgsql |
| Database | PostgreSQL 16 |
| Autentisering | Mock JWT (Entra ID i produksjon) |

## Forutsetninger

- Node.js 18+ (`node --version`)
- .NET 8 SDK (`dotnet --version`)
- PostgreSQL 16 (lokal installasjon eller Docker)

## Komme i gang

### 1. Database

```bash
# Start PostgreSQL og opprett database
psql -U postgres -c "CREATE ROLE statsbudsjett WITH LOGIN PASSWORD 'localdev' CREATEDB SUPERUSER;"
psql -U postgres -c "CREATE DATABASE statsbudsjett OWNER statsbudsjett;"
```

Eller med Docker:
```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend/Statsbudsjettportalen.Api
dotnet restore
dotnet ef database update   # Kjør migrasjoner og seed data
dotnet run --urls="http://localhost:5000"
```

API-dokumentasjon: http://localhost:5000/swagger

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Applikasjonen: http://localhost:5173

## Testbrukere

| Bruker | E-post | Rolle | Departement |
|--------|--------|-------|-------------|
| Kari Nordmann | fag.kld@test.no | Saksbehandler FAG | KLD |
| Ole Hansen | budsjett.kld@test.no | Budsjettenhet FAG | KLD |
| Eva Johansen | fin.kld@test.no | Saksbehandler FIN | FIN |
| Per Olsen | undirdir.fin@test.no | Underdirektør FIN | FIN |
| Admin Bruker | admin@test.no | Administrator | FIN |

## Statusflyt

```
FAG: draft → under_arbeid → til_avklaring → klarert → sendt_til_fin
FIN: under_vurdering_fin → returnert_til_fag | ferdigbehandlet_fin
```

## API-endepunkter

```
POST   /api/auth/login              # Mock innlogging
GET    /api/auth/me                 # Hent innlogget bruker
GET    /api/auth/users              # Liste alle brukere

GET    /api/budget-rounds           # Budsjettrunder
GET    /api/budget-rounds/:id

GET    /api/cases                   # Saker (filtrering med query params)
POST   /api/cases                   # Opprett sak
GET    /api/cases/:id               # Hent sak med innhold
PUT    /api/cases/:id               # Oppdater metadata
PATCH  /api/cases/:id/status        # Endre status
POST   /api/cases/:id/content       # Lagre ny innholdsversjon
GET    /api/cases/:id/content       # Alle versjoner
GET    /api/cases/:id/content/:ver  # Spesifikk versjon
GET    /api/cases/:id/events        # Hendelseslogg

GET    /api/cases/:id/questions     # Spørsmål
POST   /api/cases/:id/questions     # Still spørsmål
PATCH  /api/questions/:id/answer    # Svar på spørsmål

GET    /api/submissions             # Innleveringer
POST   /api/submissions             # Send innspill til FIN
```

## Prosjektstruktur

```
├── backend/
│   └── Statsbudsjettportalen.Api/
│       ├── Controllers/     # API-kontrollere
│       ├── Models/          # EF Core entiteter
│       ├── Data/            # DbContext og seed-data
│       ├── DTOs/            # Request/Response DTOs
│       ├── Services/        # Forretningslogikk
│       └── Middleware/      # Mock-autentisering
└── frontend/
    └── src/
        ├── api/             # API-klient (Axios)
        ├── components/      # React-komponenter
        ├── hooks/           # TanStack Query hooks
        ├── lib/             # Hjelpefunksjoner og typer
        ├── pages/           # Sidekomponenter
        ├── stores/          # Zustand stores
        └── styles/          # CSS (Tailwind + Aksel)
```

## Dokumentasjon

- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Prosjektoversikt
- [POC_SCOPE.md](POC_SCOPE.md) - POC-scope og brukerhistorier
- [TECHNICAL_STACK.md](TECHNICAL_STACK.md) - Teknologivalg og arkitektur
- [USER_STORIES.md](USER_STORIES.md) - Brukerhistorier
- [UX_STRATEGY.md](UX_STRATEGY.md) - UX-strategi og designtokens
- [TEST_DATA.md](TEST_DATA.md) - Syntetisk testdata
- [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - Utviklingsplan
