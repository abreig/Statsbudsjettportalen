# Oppsummering: Statsbudsjettportalen

> Sist oppdatert: februar 2026

## 1. Hva er Statsbudsjettportalen?

Statsbudsjettportalen er en digital løsning for budsjettprosessen mellom fagdepartementene (FAG) og Finansdepartementet (FIN) i Norge. Applikasjonen digitaliserer arbeidsflyten der FAG oppretter, redigerer og sender budsjettsaker til FIN, som deretter mottar, vurderer og behandler sakene videre frem til regjeringsbehandling.

Løsningen er utviklet som en **Proof of Concept (POC)** og dekker kjernefunksjonaliteten i FAG-FIN-datautvekslingen.

---

## 2. Tech stack

### Frontend

| Komponent | Teknologi | Versjon |
|---|---|---|
| Rammeverk | React | 19.x |
| Språk | TypeScript | 5.9 |
| Byggverktøy | Vite | 7.x |
| UI-bibliotek | Aksel (NAVs designsystem) | 8.x |
| Styling | Tailwind CSS | 4.x |
| State management | Zustand | 5.x |
| Server state / datahenting | TanStack Query (React Query) | 5.x |
| Tabellhåndtering | TanStack Table | 8.x |
| Rik tekst-editor | Tiptap (ProseMirror-basert) | 3.x |
| Skjemahåndtering | React Hook Form + Zod | 7.x / 4.x |
| Routing | React Router | 7.x |
| HTTP-klient | Axios | 1.x |
| Ikoner | Lucide React | 0.563 |
| Utility | clsx, tailwind-merge | - |

### Backend

| Komponent | Teknologi | Versjon |
|---|---|---|
| Rammeverk | ASP.NET Core Web API | .NET 8.0 |
| ORM | Entity Framework Core + Npgsql | 8.x |
| Autentisering | JWT Bearer (mock i POC, Entra ID i prod) | - |
| API-dokumentasjon | Swagger / Swashbuckle | 10.x |
| Dokumenteksport | DocumentFormat.OpenXml | 3.2 |
| Caching | Redis (StackExchange.Redis) med fallback til in-memory | 8.x |

### Infrastruktur og drift

| Komponent | Teknologi |
|---|---|
| Database | PostgreSQL 16 |
| Connection pooling | PgBouncer 1.22 (transaksjonsmodus) |
| Cache | Redis 7 (LRU-policy, 256 MB) |
| Containerisering | Docker (multi-stage build) |
| Orkestrering | Kubernetes-manifester (deployment, pgbouncer, redis) |
| CI/CD | GitHub Actions (container deploy via ACR + ZIP deploy) |
| Skyplattform | Klargjort for Azure Web Apps for Containers |
| Lasttesting | Locust (Python) |

---

## 3. Arkitektur

Applikasjonen følger en klassisk **SPA + REST API**-arkitektur:

```
┌──────────────────────────────┐
│        React Frontend        │
│   (Vite SPA, Aksel UI)      │
└──────────┬───────────────────┘
           │  HTTP / REST (JSON)
┌──────────▼───────────────────┐
│     ASP.NET Core Web API     │
│  (Controllers → Services)    │
└──────────┬──────┬────────────┘
           │      │
    ┌──────▼──┐ ┌─▼──────┐
    │PostgreSQL│ │  Redis  │
    │(via PgB.)│ │ (cache) │
    └─────────┘ └─────────┘
```

I produksjon serverer .NET-backend React-frontenden som statiske filer fra `wwwroot/`, slik at hele applikasjonen kjører som **én enkelt container**.

### Responsytelse

- **Brotli- og gzip-komprimering** på alle HTTP-responser
- **Rate limiting** per bruker: 120 req/min (generelt), 30 req/min (lagring), 5 req/min (eksport)
- **Redis-cache** for hyppige oppslag med JSON-serialisering
- **Connection pooling** via PgBouncer (40 pool, max 300 klienter)
- Auto-migrering og seeding ved oppstart

---

## 4. Funksjonalitet

### 4.1 Brukerroller og tilgangsstyring

Systemet har et rollebasert tilgangssystem med **12 ulike roller** fordelt på tre kategorier:

**FAG-roller (fagdepartement):**
- Saksbehandler FAG
- Budsjettenhet FAG
- Underdirektør FAG
- Avdelingsdirektør FAG
- Ekspedisjonssjef FAG
- Departementsråd FAG

**FIN-roller (Finansdepartementet):**
- Saksbehandler FIN
- Underdirektør FIN
- Avdelingsdirektør FIN
- Ekspedisjonssjef FIN
- Departementsråd FIN

**System:**
- Administrator (full tilgang)

Hver rolle har spesifikke rettigheter for hvilke statusoverganger de kan utføre, hvem som kan opprette saker, stille spørsmål, tildele saksbehandlere, osv.

### 4.2 Budsjettrunder

Saker organiseres i budsjettrunder med:
- Navn, type og budsjettår
- Status (åpen/lukket)
- Frist (deadline)
- Feltoverstyringsmuligheter per runde

### 4.3 Saker (Cases) -- kjernefunksjonalitet

**Oppretting og redigering:**
- FAG-brukere oppretter budsjettsaker med metadata (saksnavn, kapittel, post, beløp, sakstype, ansvarlig avdeling)
- Fire sakstyper med tilpassede skjema:
  - **Satsingsforslag** -- nytt initiativ, flest felt (forslag, begrunnelse, verbalkonklusjon, samfunnsøkonomisk analyse, mål/indikator, gevinstrealiseringsplan)
  - **Budsjettiltak** -- endring i eksisterende bevilgning (forlag, begrunnelse, kommentar)
  - **Teknisk justering** -- minimalt skjema (begrunnelse, kommentar)
  - **Andre saker** -- forslag uten bevilgningsendring (beskrivelse, begrunnelse, verbal omtale)
- Rik tekst-editor (Tiptap/ProseMirror) med formattering (bold, italic, underline, overskrifter, lister)

**Endringshistorikk (Track Changes):**
- Sporingssystem for endringer i dokumentinnhold med visuell markering av innlegg, slettinger og formateringsendringer
- Tre moduser: redigering, sporing og visning
- Kommentarfunksjon med markering direkte i dokumentteksten

**Statusflyt med rollekontroll:**
```
FAG:   Utkast → Under arbeid → Til avklaring → Klarert → Godkjent POL → Sendt til FIN
FIN:   Under vurdering → Ferdigbehandlet → Sendt til regjeringen → Regjeringsbehandlet
       └→ Returnert til FAG / Avvist av FIN
```
- Hver rolle har definerte tillatelser for hvilke overganger de kan gjøre
- Både fremover- og bakoveroverganger støttes
- FIN-felt (vurdering, tilråding, verbalkonklusjon) skjules fra FAG-brukere under FINs behandling

**Versjonering:**
- Hver lagring oppretter en ny innholdsversjon
- Full versjonshistorikk med mulighet for å se og sammenligne tidligere versjoner
- Denormalisert peker til siste versjon for ytelse

### 4.4 Spørsmål og svar (FIN ↔ FAG)

- FIN kan stille spørsmål knyttet til en sak
- FAG kan svare (med rik tekst)
- Trådet samtalevisning per sak

### 4.5 Kommentarer

- Kommentarer med tråder (svar/replies) direkte på saker
- Mulighet for å løse (resolve) og gjenåpne kommentarer
- Sletting av egne kommentarer

### 4.6 Innleveringer (Submissions)

- FAG samler og sender saker til FIN som innleveringer
- Sporbarhet på hvem som sendte inn og når

### 4.7 Departementslister

- Strukturerte lister per departement basert på maler (templates)
- Automatisk plassering av saker i riktige seksjoner basert på sakstype
- Administrasjon av maler med konfigurerbare seksjoner
- FIN-brukere kan redigere og ferdigstille departementslister
- Talldata (figures) per seksjon

### 4.8 Dokumenteksport

- **Word-eksport (.docx):** Konverterer ProseMirror-dokumentinnhold til Word med bevarede sporede endringer (som Word revision marks) og kommentarer
- **Departementsliste-eksport** til Word
- **Asynkron eksportjobb-system** med køhåndtering (maks 3 samtidige), statuspolling og filnedlasting

### 4.9 Ressurslåsing (Optimistic Locking)

- Forhindrer samtidige redigeringskonflikter
- Låser utløper automatisk etter 5 minutter
- Heartbeat-mekanisme for å forlenge låser ved aktiv bruk
- Visuell indikator (banner) når en annen bruker redigerer
- Idle-varsling og automatisk utkasting ved inaktivitet
- Konfliktdialog ved lagringskonflikter

### 4.10 Meningsutveksling og godkjenning (Opinions)

- Mulighet for å sende sak til meningsutveksling (opinions)
- Saker kan låses av ventende underprosesser
- Videresending til godkjenning (forward approval)

### 4.11 Administrasjon

- Administrasjon av sakstyper (CRUD)
- Administrasjon av departementsliste-maler (templates)
- Database-nullstilling (kun dev/admin) via miljøvariabel eller API-kall

---

## 5. Sidestruktur (frontend)

| Side | Rute | Beskrivelse |
|---|---|---|
| Innlogging | `/login` | Velg testbruker per departement og rolle |
| Budsjettrunder | `/budget-rounds` | Velg aktiv budsjettrunde |
| Saksoversikt | `/cases` | Filtrerbar tabell over alle saker med søk, status-, type- og avdelingsfilter |
| Mine saker | `/my-cases` | Saker tildelt innlogget bruker |
| Opprett sak | `/cases/new` | Skjema for ny sak med typevalg |
| Saksdetalj | `/cases/:id` | Dokumenteditor, metadata, statusflyt, spørsmål, kommentarer, eksport |
| Versjonshistorikk | `/cases/:id/history` | Oversikt over alle innholdsversjoner |
| Versjonsdetalj | `/cases/:id/history/:version` | Vis spesifikk versjon |
| Innleveringer | `/submissions` | Oversikt over innleveringer til FIN |
| Hos FIN | `/at-fin` | FAG-visning av saker som er til behandling hos FIN |
| Historikk | `/history` | Global hendelseslogg |
| Departementslister | `/department-lists` | Oversikt over departementslister |
| Rediger dep.liste | `/department-lists/:id` | Rediger departementsliste med låsing |
| Admin: Sakstyper | `/admin/case-types` | Administrer sakstyper |
| Admin: Maler | `/admin/templates` | Administrer departementsliste-maler |

---

## 6. API-endepunkter

Backenden eksponerer følgende REST API (alle under `/api`):

**Autentisering:**
- `POST /auth/login` -- Mock innlogging
- `GET /auth/me` -- Hent innlogget bruker
- `GET /auth/users` -- Liste alle brukere

**Budsjettrunder:**
- `GET /budget-rounds` -- Liste budsjettrunder
- `GET /budget-rounds/:id` -- Hent budsjettrunde

**Saker:**
- `GET /cases` -- Filtrer og list saker
- `POST /cases` -- Opprett sak
- `GET /cases/:id` -- Hent sak med innhold
- `PUT /cases/:id` -- Oppdater metadata
- `PATCH /cases/:id/status` -- Endre status

**Saksinnhold (versjonering):**
- `POST /cases/:id/content` -- Lagre ny innholdsversjon
- `GET /cases/:id/content` -- Alle versjoner
- `GET /cases/:id/content/:ver` -- Spesifikk versjon

**Hendelseslogg:**
- `GET /cases/:id/events` -- Hendelser for sak

**Spørsmål:**
- `GET /cases/:id/questions` -- Hent spørsmål
- `POST /cases/:id/questions` -- Still spørsmål
- `PATCH /questions/:id/answer` -- Svar på spørsmål

**Kommentarer:**
- `GET /cases/:id/comments` -- Hent kommentarer
- `POST /cases/:id/comments` -- Opprett kommentar
- Svar, resolve, gjenåpning, sletting

**Konklusjoner:**
- CRUD for sakskonklusjoner

**Innleveringer:**
- `GET /submissions` -- Liste innleveringer
- `POST /submissions` -- Send innspill til FIN

**Eksport:**
- `GET /cases/:id/export/word` -- Eksporter sak til Word
- Asynkrone eksportjobber med status-polling

**Ressurslåser:**
- Acquire, heartbeat, release av redigeringslåser

**Departementslister:**
- CRUD for departementslister, seksjoner, talldata, saksoppføringer
- Auto-plassering av saker
- Word-eksport av departementslister

**Sakstyper:**
- `GET /case-types` -- Alle sakstyper
- `POST /case-types` -- Opprett (admin)
- `PUT /case-types/:id` -- Oppdater (admin)
- `DELETE /case-types/:id` -- Slett (admin)

**Departementsliste-maler:**
- CRUD for maler og malseksjoner

**Admin:**
- `POST /admin/reset-database` -- Nullstill database (admin, kun dev)

**Helsekontroll:**
- `GET /health` -- Sjekker database- og Redis-tilkobling med responstider

---

## 7. Datamodell (hovedentiteter)

| Entitet | Beskrivelse |
|---|---|
| `User` | Bruker med rolle, avdeling og departementstilknytning |
| `Department` | Departement (16 stk. + FIN) |
| `BudgetRound` | Budsjettrunde med type, år og status |
| `Case` | Budsjettsak med metadata, status, beløp og tildelinger |
| `CaseContent` | Versjonert dokumentinnhold (ProseMirror JSON) |
| `CaseEvent` | Hendelseslogg per sak |
| `CaseComment` | Kommentarer med tråder |
| `CaseConclusion` | Konklusjoner på saker |
| `CaseOpinion` | Meningsutvekslinger |
| `Question` | Spørsmål fra FIN med svar fra FAG |
| `Submission` | Innleveringer av saker til FIN |
| `CaseTypeDefinition` | Konfigurerbare sakstyper |
| `DepartmentList` | Departementsliste med seksjoner og saksoppføringer |
| `DepartmentListTemplate` | Maler for departementslister |
| `DepartmentListSection` | Seksjoner i departementsliste |
| `DepartmentListCaseEntry` | Saker plassert i departementsliste |
| `DepartmentListFigure` | Talldata i departementsliste |
| `ResourceLock` | Redigeringslåser med heartbeat og utløpstid |
| `ExportJob` | Asynkrone eksportjobber |
| `Clearance` | Klareringer/godkjenninger |
| `Attachment` | Vedlegg |
| `RoundFieldOverride` | Feltoverstyringer per budsjettrunde |

---

## 8. Testdata og utviklingsmiljø

- **33 testbrukere**: 2 per fagdepartement (15 dept.) + 3 FIN-brukere
- **16 departementer**: AID, BFD, DFD, ED, FIN, FD, HOD, JD, KLD, KDD, KUD, KD, LMD, NFD, SD, UD
- **600 testsaker** generert ved seeding
- Støtte for **GitHub Codespaces** med automatisk oppsett (devcontainer)
- Swagger UI tilgjengelig i utviklingsmodus
- Database kan nullstilles via miljøvariabel eller admin-API
- Lasttesting med Locust (Python) for ytelsesvalidering

---

## 9. Deployment og drift

- **Multi-stage Docker build**: Node.js (frontend) → .NET SDK (backend) → .NET runtime (produksjon)
- Klargjort for **Azure Web App for Containers** med Azure Database for PostgreSQL
- **To CI/CD-workflows** via GitHub Actions:
  - Container deploy via Azure Container Registry
  - ZIP deploy (enklere oppsett)
- **Kubernetes-manifester** for deployment, PgBouncer og Redis
- Helsekontroll-endepunkt med database- og Redis-sjekker
- CORS konfigurert for lokal utvikling, Codespaces og produksjon

---

## 10. Oppsummering av nåværende status

Statsbudsjettportalen er en fungerende POC som demonstrerer digitalisering av budsjettprosessen mellom fagdepartementene og Finansdepartementet. Applikasjonen dekker den komplette arbeidsflyten fra sakoppretting via intern klarering i fagdepartementet, til innsending og behandling hos FIN, og videre til regjeringsbehandling.

Sentrale styrker i nåværende implementasjon:
- **Komplett arbeidsflyt** med rollebasert tilgangsstyring og statusoverganger
- **Rik tekst-redigering** med endringshistorikk (track changes) og kommentarer
- **Dokumenteksport** til Word med bevarede sporede endringer
- **Flerbrukerstøtte** med ressurslåsing og konfliktløsning
- **Departementslister** med malbasert struktur og automatisk saksplassering
- **Moderne tech stack** med god ytelse (caching, komprimering, connection pooling)
- **Driftsklargjort** med Docker, Kubernetes-manifester og CI/CD-pipelines for Azure
