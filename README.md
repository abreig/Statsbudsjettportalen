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
| Frontend | React 19 + TypeScript + Vite |
| UI-bibliotek | Aksel (NAV) |
| State Management | Zustand + TanStack Query |
| Styling | Tailwind CSS + Aksel CSS |
| Backend | .NET 8 (ASP.NET Core Web API) |
| ORM | Entity Framework Core + Npgsql |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Autentisering | Mock JWT (Entra ID i produksjon) |

## VS Code-oppgaver

Alle vanlige operasjoner er tilgjengelige via **Ctrl+Shift+P → Tasks: Run Task**. Standardoppgaven (Ctrl+Shift+B) starter backend og frontend parallelt.

| Oppgave | Beskrivelse |
|---------|-------------|
| **Oppsett: installer alle avhengigheter** | Første gangs oppsett — kjør `npm install` og `dotnet restore` parallelt |
| **Oppsett: npm install (frontend)** | Installer npm-pakker i `frontend/` |
| **Oppsett: dotnet restore (backend)** | Gjenopprett NuGet-pakker |
| **Start hele appen (backend + frontend)** | Start begge dev-servere parallelt *(standard, Ctrl+Shift+B)* |
| **Backend: dotnet run** | Kun backend på port 5000 |
| **Frontend: npm run dev** | Kun frontend på port 5173 |
| **Backend: dotnet watch (hot reload)** | Backend med automatisk reload ved kodeendringer |
| **Bygg: frontend (produksjon)** | `npm run build` — produksjonsbygd frontend |
| **Bygg: backend (produksjon)** | `dotnet build -c Release` |
| **Lint: frontend** | Kjør ESLint på frontend-koden |
| **Docker: start tjenester (postgres + redis)** | Start PostgreSQL og Redis i bakgrunnen med Docker Compose |
| **Docker: stopp tjenester** | Stopp Docker-tjenestene |
| **Docker: bygg og start hele appen** | Bygg og start hele stacken via Docker Compose |
| **Database: nullstill (ved oppstart)** | Wipe og re-seed database ved backend-oppstart |
| **Database: nullstill via API** | Nullstill uten omstart (backend må kjøre, logger inn som admin automatisk) |

## Komme i gang

### Alternativ A: GitHub Codespaces (anbefalt)

Raskeste måte å komme i gang — ingen lokal installasjon nødvendig.

1. Gå til repositoriet på GitHub
2. Klikk **Code** → **Codespaces** → **Create codespace on main**
3. Vent til devcontainer bygges ferdig (ca. 2-3 min). PostgreSQL, .NET 8 og Node 22 installeres automatisk.
4. Start backend og frontend via VS Code: **Ctrl+Shift+B** (eller **Ctrl+Shift+P → Tasks: Run Build Task → Start hele appen**).

   Alternativt i to terminaler:

```bash
# Terminal 1 – Backend
dotnet run --project backend/Statsbudsjettportalen.Api
```

```bash
# Terminal 2 – Frontend
npm run dev --prefix frontend
```

5. Codespaces åpner automatisk frontend-URLen (port 5173) i nettleseren. API-kall proxies automatisk til backend via Vite.

> **Merk:** Dersom port 5173 ikke åpnes automatisk, gå til **Ports**-panelet (nederst i VS Code), høyreklikk port 5173, velg **Open in Browser**.

### Alternativ B: Lokal utvikling

#### Forutsetninger

- Node.js 18+ (`node --version`)
- .NET 8 SDK (`dotnet --version`)
- Docker Desktop

> **Merk om porter:** Prosjektet bruker PostgreSQL på port **5433** (ikke standard 5432) for å unngå konflikt med andre prosjekter du måtte ha kjørende lokalt.

#### 1. Første gangs oppsett

```bash
# Via VS Code (anbefalt):
#   Ctrl+Shift+P → Tasks: Run Task → Oppsett: installer alle avhengigheter

# Eller manuelt:
npm install --prefix frontend
dotnet restore backend/Statsbudsjettportalen.Api
```

#### 2. Start database-tjenester

```bash
# Via VS Code:
#   Ctrl+Shift+P → Tasks: Run Task → Docker: start tjenester (postgres + redis)

# Eller manuelt (starter kun infrastruktur — ikke app-containeren):
docker compose up -d db pgbouncer redis
```

PostgreSQL er tilgjengelig på `localhost:5433`, Redis på `localhost:6379`.

#### 3. Start appen

```bash
# Via VS Code (anbefalt):
#   Ctrl+Shift+B  — starter backend og frontend parallelt

# Eller to terminaler:
dotnet run --project backend/Statsbudsjettportalen.Api   # http://localhost:5000/swagger
npm run dev --prefix frontend                            # http://localhost:5173
```

Databasemigreringer og seed-data kjøres automatisk ved første oppstart.

#### Debugging

Åpne **Run and Debug** (Ctrl+Shift+D) og velg **«Backend: Start og debug»** for å starte backend med breakpoint-støtte. Krever C# DevKit-extension.

## Testbrukere

Appen har 33 testbrukere: 2 per fagdepartement (15 dept.) + 3 FIN-brukere.

**FIN / Admin:**

| Bruker | E-post | Rolle |
|--------|--------|-------|
| Eva Johansen | saksbehandler.fin@test.no | Saksbehandler FIN |
| Per Olsen | undirdir.fin@test.no | Underdirektør FIN |
| Admin Bruker | admin@test.no | Administrator |

**FAG-departement (eksempel KLD):**

| Bruker | E-post | Rolle |
|--------|--------|-------|
| Berit Bakken | fag.kld@test.no | Saksbehandler FAG |
| Jon Solberg | budsjett.kld@test.no | Budsjettenhet FAG |

Alle 16 departementer (AID, BFD, DFD, ED, FIN, FD, HOD, JD, KLD, KDD, KUD, KD, LMD, NFD, SD, UD) følger mønsteret `fag.{kode}@test.no` og `budsjett.{kode}@test.no`.

## Statusflyt

```
FAG: draft → under_arbeid → til_avklaring → klarert → godkjent_pol → sendt_til_fin
FIN: under_vurdering_fin → returnert_til_fag | ferdigbehandlet_fin
```

## Nullstille databasen

Hvis databasen havner i en ugyldig tilstand etter testing, kan den nullstilles til opprinnelig seed-data:

**Alternativ 1: Miljøvariabel (ved oppstart)**
```bash
# Stopp backend, sett variabel, start på nytt
RESET_DATABASE=true dotnet run --project backend/Statsbudsjettportalen.Api
# Deretter kan du starte normalt igjen uten variabelen
```

**Alternativ 2: API-kall (uten omstart, krever admin-innlogging)**
```bash
# Først logg inn som admin og hent JWT-token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@test.no"}' | jq -r .token)

# Nullstill databasen
curl -X POST http://localhost:5000/api/admin/reset-database \
  -H "Authorization: Bearer $TOKEN"
```

> Nullstilling sletter all data (inkl. endringer gjort via frontend) og gjenskaper 600 testsaker, 33 brukere og 16 departementer.

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

GET    /api/case-types              # Sakstyper (alle)
POST   /api/case-types              # Opprett sakstype (admin)
PUT    /api/case-types/:id          # Oppdater sakstype (admin)
DELETE /api/case-types/:id          # Slett sakstype (admin)

POST   /api/admin/reset-database   # Nullstill database (admin, kun dev)
```

## Deployment (Azure Web Apps)

Appen er klargjort for Azure Web Apps som en enkelt container der .NET-backend serverer React-frontend som statiske filer.

### Forutsetninger i Azure

1. **Azure Database for PostgreSQL** (Flexible Server)
2. **Azure Web App for Containers** (Linux, B1 eller høyere)
3. **Azure Container Registry** (for container-basert deploy)

### Alternativ A: Container deploy (anbefalt)

```bash
# Bygg og test lokalt
docker compose up --build

# Push image til Azure Container Registry
az acr login --name <din-acr>
docker build -t <din-acr>.azurecr.io/statsbudsjettportalen:latest .
docker push <din-acr>.azurecr.io/statsbudsjettportalen:latest

# Oppdater Web App
az webapp config container set \
  --name <webapp-navn> \
  --resource-group <rg> \
  --container-image-name <din-acr>.azurecr.io/statsbudsjettportalen:latest
```

### Alternativ B: ZIP deploy

```bash
# Bygg frontend
cd frontend && npm ci && npm run build && cd ..

# Publiser backend
cd backend/Statsbudsjettportalen.Api
dotnet publish -c Release -o ../../publish

# Kopier frontend til wwwroot
cp -r ../../frontend/dist/* ../../publish/wwwroot/

# Deploy
cd ../../publish && zip -r ../deploy.zip .
az webapp deploy --name <webapp-navn> --resource-group <rg> --src-path ../deploy.zip
```

### Azure App Settings (konfigurer i Azure Portal)

| Setting | Verdi |
|---------|-------|
| `ConnectionStrings__DefaultConnection` | `Host=<pg-server>.postgres.database.azure.com;Database=statsbudsjett;Username=<user>;Password=<pass>;SSL Mode=Require` |
| `JwtSettings__Secret` | `<tilfeldig-streng-minst-32-tegn>` |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `WEBSITES_PORT` | `8080` |
| `EnableSwagger` | `false` |

### CI/CD

To GitHub Actions-workflows er inkludert:
- `.github/workflows/deploy.yml` - Container deploy via ACR
- `.github/workflows/deploy-zip.yml` - ZIP deploy (enklere oppsett)

Legg til disse GitHub Secrets:
- `AZURE_WEBAPP_PUBLISH_PROFILE` - Last ned fra Azure Portal > Web App > Deployment Center
- For container: `ACR_LOGIN_SERVER`, `ACR_USERNAME`, `ACR_PASSWORD`

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

- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Prosjektoversikt og fasestatus
- [USER_STORIES.md](USER_STORIES.md) - Brukerhistorier og implementeringsstatus
- [TECHNICAL_STACK.md](TECHNICAL_STACK.md) - Teknologivalg, arkitektur og databaseskjema
- [UX_STRATEGY.md](UX_STRATEGY.md) - UX-strategi og designsystem
- [Statsbudsjettportalen_Fase2_Utviklingsplan.md](Statsbudsjettportalen_Fase2_Utviklingsplan.md) - Fase 2: Word-funksjonalitet (✅ fullført)
- [Utviklingsplan_Departementsliste_v2.md](Utviklingsplan_Departementsliste_v2.md) - Fase A: Departementsliste (✅ fullført)
- [Utviklingsplan_Ytelse_og_Skalerbarhet.md](Utviklingsplan_Ytelse_og_Skalerbarhet.md) - Fase Y: Ytelse og skalerbarhet (✅ fullført)
