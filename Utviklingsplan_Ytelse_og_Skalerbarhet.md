# Utviklingsplan: Ytelsesoptimalisering og lasttesting

*Statsbudsjettportalen -- Februar 2026*
*Gjennomfores etter at departementsliste-modulen (Sprint 0 + A.1-A.6, B og C) er ferdigstilt.*

---

## 1. Bakgrunn og malsetting

Portalen er i dag utviklet og testet med et lavt antall samtidige brukere (seed-data med 33 testbrukere). For produksjon ma losningen tale 100-500 samtidige brukere pa tvers av 15 fagdepartementer og Finansdepartementet. Det er ingen kjente ytelsesproblemer i dag, men flere arkitekturmessige svakheter gjor at systemet ikke er lasttestet og mangler tiltak som erfaringsmessig er nodvendige ved denne skalaen.

De viktigste identifiserte risikoene er: PostgreSQL connection pool er ikke konfigurert eksplisitt og bruker EF Cores standardverdier, saksoversikten joiner mot `case_content` uten optimalisert indeks for siste versjon, `content_json` (store JSONB-dokumenter) returneres i list-endepunkter der det ikke trengs, Word/PDF-eksport kjores synkront og kan blokkere API-treaader, det finnes ingen caching-lag mellom API og database, og det er ingen monitorering av responstider eller ressursbruk.

Malet med denne planen er at portalen skal handtere 100 samtidige brukere komfortabelt (responstid < 200ms for vanlige sporringer, < 500ms for p95) og 300-500 samtidige brukere uten degradering av kjerneoperasjoner.

---

## 2. Sprint Y.1: Database og backend-optimalisering (1.5 uke)

Denne sprinten gjor de endringene som har storst effekt med minst risiko. Ingen av tiltakene endrer funksjonalitet -- de endrer kun hvordan eksisterende funksjonalitet utfores.

### 2.1 PgBouncer som connection pooler

Dagens oppsett: EF Core apner databasetilkoblinger direkte mot PostgreSQL med standardkonfigurasjon (typisk `MaxPoolSize = 100` i Npgsql, men uten noen ekstern pooler). Ved 100+ brukere med heartbeats, autosave og sporringer kan antall samtidige tilkoblinger overstige PostgreSQL sin `max_connections`.

Tiltak: Legg til PgBouncer som sidecar-container i `docker-compose.yml` og Kubernetes-deploymenten. PgBouncer settes i `transaction`-modus med `pool_size = 40` og `max_client_conn = 300`. PostgreSQL sin `max_connections` settes til 60 (noe buffer for admin-tilkoblinger og bakgrunnsjobber). Backend-applikasjonens connection string peker pa PgBouncer i stedet for direkte pa PostgreSQL.

Endringer i `docker-compose.yml`:

```yaml
services:
  pgbouncer:
    image: edoburu/pgbouncer:1.22.0
    environment:
      DATABASE_URL: postgres://statsbudsjett:localdev@db:5432/statsbudsjett
      POOL_MODE: transaction
      DEFAULT_POOL_SIZE: 40
      MAX_CLIENT_CONN: 300
      MAX_DB_CONNECTIONS: 50
    ports:
      - "6432:6432"
    depends_on:
      db:
        condition: service_healthy

  app:
    environment:
      ConnectionStrings__DefaultConnection: "Host=pgbouncer;Port=6432;Database=statsbudsjett;Username=statsbudsjett;Password=localdev"
```

Viktig detalj for EF Core + PgBouncer: Npgsql ma konfigureres med `Multiplexing=false` og `No Reset On Close=true` i connection string fordi PgBouncer i transaction mode ikke stoetter session-level features som prepared statements. Alternativt kan `Enlist=false` legges til.

### 2.2 Indekser for tunge sporringer

Folgende indekser legges til via en EF Core-migrering:

```sql
-- Rask oppslag av siste versjon per sak (brukes i saksoversikt og depliste)
CREATE INDEX idx_case_content_latest
    ON case_contents (case_id, version DESC);

-- Saksoversikt filtrert pa departement og budsjettrunde (mest beskte sporing)
CREATE INDEX idx_cases_dept_round
    ON cases (department_id, budget_round_id)
    INCLUDE (case_name, chapter, post, amount, status, case_type, assigned_to);

-- Hendelseslogg per sak (versjonshistorikk)
CREATE INDEX idx_case_events_case_time
    ON case_events (case_id, created_at DESC);

-- Resource locks: rask oppslag og opprydding av utlopte laser
CREATE INDEX idx_resource_locks_resource
    ON resource_locks (resource_type, resource_id);

-- Departementsliste: saker per seksjon
CREATE INDEX idx_deplist_entries_section
    ON department_list_case_entries (department_list_id, section_id, sort_order);
```

Den forste indeksen (`idx_case_content_latest`) er den viktigste. Den gjor at sporringen for a hente siste versjon av alle saker i en budsjettrunde gar fra en full scan av `case_contents` til et indeks-oppslag per sak. Med 2000 saker og 50 versjoner per sak er forskjellen mellom 100 000 rader scannet og 2000 indeks-oppslag -- fra sekunder til millisekunder.

### 2.3 Denormalisering av siste versjon

I tillegg til indeksen legges et felt `latest_content_id` pa `cases`-tabellen som peker direkte pa den nyeste `case_content`-raden. Dette oppdateres ved hver lagring (allerede en del av save-flyten) og eliminerer behovet for `MAX(version)` i saksoversikten fullstendig.

```sql
ALTER TABLE cases ADD COLUMN latest_content_id UUID REFERENCES case_contents(id);

-- Populer for eksisterende data
UPDATE cases c SET latest_content_id = (
    SELECT id FROM case_contents cc
    WHERE cc.case_id = c.id
    ORDER BY cc.version DESC
    LIMIT 1
);
```

Saksoversikt-sporringen endres fra:

```sql
-- Gammel (treg): subquery per rad
SELECT c.*, cc.* FROM cases c
JOIN case_contents cc ON cc.case_id = c.id
WHERE cc.version = (SELECT MAX(version) FROM case_contents WHERE case_id = c.id)
AND c.budget_round_id = @roundId;
```

Til:

```sql
-- Ny (rask): direkte join
SELECT c.*, cc.* FROM cases c
JOIN case_contents cc ON cc.id = c.latest_content_id
WHERE c.budget_round_id = @roundId;
```

### 2.4 Fjern content_json fra list-endepunkter

`GET /api/cases` returnerer i dag hele `CaseContentDto` inkludert `content_json` (det fulle TipTap-dokumentet, potensielt 5-50 KB per sak). For saksoversikten trengs bare de flate feltene (saksnavn, kapittel, post, belop, status, sakstype, tilordnet). `content_json` trengs kun nar brukeren apner en enkelt sak.

Tiltak: Lag en `CaseListItemDto` uten `content_json` og bruk den i list-endepunktet. `GET /api/cases/{id}` fortsetter a returnere `CaseContentDto` med alt inkludert. Dette reduserer overfrt datamengde fra potensielt 2.5 MB per saksoversikt-kall (50 saker * 50 KB) til ca. 50 KB (50 saker * 1 KB).

### 2.5 Oppgaver og estimat

| # | Oppgave | Eier | Estimat |
|---|---------|------|---------|
| 1 | PgBouncer: docker-compose, k8s-manifest, connection string-justering | DevOps/Backend | 0.5d |
| 2 | PgBouncer: teste EF Core-kompatibilitet (prepared statements, Enlist) | Backend | 0.5d |
| 3 | Databasemigrering: alle indekser + `latest_content_id` + populering | Backend | 0.5d |
| 4 | Oppdater save-logikk til a sette `latest_content_id` ved lagring | Backend | 0.5d |
| 5 | Oppdater saksoversikt-sporing til a bruke `latest_content_id` | Backend | 0.5d |
| 6 | `CaseListItemDto` uten `content_json`, oppdater list-endepunkt | Backend | 0.5d |
| 7 | Frontend: tilpass `useCases`-hook til ny DTO (bor vaere bakoverkompatibel) | Frontend | 0.5d |
| 8 | Kjor EXPLAIN ANALYZE pa de 5 tyngste sporringene, verifiser indeksbruk | Backend | 0.5d |
| 9 | PostgreSQL-tuning: `shared_buffers`, `work_mem`, `effective_cache_size` | DevOps | 0.5d |

**Totalt: ~4.5 dager**

---

## 3. Sprint Y.2: Redis-caching og asynkron eksport (1.5 uke)

### 3.1 Redis som cache-lag

Redis er allerede planlagt i arkitekturen men ikke tatt i bruk. I denne sprinten innfores Redis som cache for de mest beskte sporringene.

Endringer i `docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

Backend-integrasjon via `IDistributedCache` (innebygd i .NET) eller `StackExchange.Redis` for mer kontroll.

**Hva caches:**

Saksoversikten (nokkelmoenster: `cases:list:{budgetRoundId}:{departmentId}`) caches med 15 sekunders TTL. Ved lagring av en sak invalideres den tilhorende cache-nokkelen. Dette betyr at 500 brukere som ser pa saksoversikten genererer maksimalt 4 databasesporringer per minutt per departement (60s / 15s TTL) i stedet for potensielt hundrevis.

Lasstatus for ressurser (nokkelmoenster: `lock:{resourceType}:{resourceId}`) caches med 5 sekunders TTL. Polling-sporringer fra brukere som venter pa a ta over en last sak treffer Redis i stedet for PostgreSQL.

Bruker- og departementdata (nokkelmoenster: `user:{id}`, `dept:{id}`) caches med 5 minutters TTL. Disse endres sjelden men slas opp ved nesten hvert API-kall for autorisasjon.

**Hva caches IKKE:** Enkelt-sak-detaljer (`GET /api/cases/{id}`) caches ikke fordi de endres hyppig og det er viktig at brukeren ser siste versjon. Depliste-dokumentet caches ikke av samme grunn.

### 3.2 Asynkron Word/PDF-eksport

Eksport av departementslister og sakslister er CPU- og minneintensivt (XML-manipulering, bildehantdtering, evt. LibreOffice-konvertering til PDF). Med 500 brukere vil flere samtidige eksportforesprrsler konkurrere om ressurser og kan blokkere API-treaader for vanlige CRUD-operasjoner.

Tiltak: Eksport flyttes til en bakgrunnsjobb-koe.

Flyten blir:

1. Frontend kaller `POST /api/export/department-list/word` (eller tilsvarende).
2. Backend oppretter en jobb i `export_jobs`-tabellen med status `queued` og returnerer umiddelbart med jobb-ID.
3. En bakgrunnsarbeider (Hangfire i .NET) plukker opp jobben, genererer dokumentet, lagrer det i blob storage, og setter status til `completed` med en `download_url`.
4. Frontend poller `GET /api/export/jobs/{id}` hvert 2. sekund (eller bruker SignalR/WebSocket for push-varsling).
5. Nar jobben er ferdig, viser frontend en nedlastingslenke.

Samtidige eksporter begrenses via Hangfire sin `MaxConcurrentJobs`-innstilling (anbefalt: 3 per pod) for a hindre at eksportjobber spiser alt tilgjengelig minne.

Databasemodell:

```sql
CREATE TABLE export_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type        VARCHAR(30) NOT NULL,   -- 'department_list_word', 'case_list_excel', etc.
    status          VARCHAR(20) NOT NULL DEFAULT 'queued',  -- 'queued', 'processing', 'completed', 'failed'
    requested_by    UUID NOT NULL REFERENCES users(id),
    parameters      JSONB NOT NULL,         -- Filtre, felt, mal-ID, etc.
    result_url      VARCHAR(500),           -- Blob storage URL nar ferdig
    error_message   TEXT,                   -- Ved feil
    created_at      TIMESTAMPTZ DEFAULT now(),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);
```

Frontend-komponenten `ExportStatusDialog` viser en fremgangslinje og handterer polling. Ved feil vises feilmeldingen med mulighet for a prove pa nytt.

### 3.3 Response compression

Legg til gzip/brotli-komprimering pa alle API-responser. For JSON-data (som utgjor nesten all trafikk) gir dette typisk 70-80% reduksjon i overfrt datamengde. I .NET:

```csharp
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});
```

### 3.4 Oppgaver og estimat

| # | Oppgave | Eier | Estimat |
|---|---------|------|---------|
| 1 | Redis: docker-compose, k8s-manifest, DI-registrering i .NET | DevOps/Backend | 0.5d |
| 2 | `CaseListCacheService`: cache saksoversikt med TTL + invalidering | Backend | 1d |
| 3 | `ResourceLockCacheService`: cache lasstatus i Redis | Backend | 0.5d |
| 4 | Cache bruker/departement-oppslag | Backend | 0.5d |
| 5 | `export_jobs`-tabell + migrering | Backend | 0.5d |
| 6 | `ExportJobService` med Hangfire-integrasjon | Backend | 1.5d |
| 7 | Flytt eksisterende Word/Excel/PDF-eksport til bakgrunnsjobb | Backend | 1d |
| 8 | Frontend: `ExportStatusDialog` med polling | Frontend | 1d |
| 9 | Response compression middleware | Backend | 0.25d |
| 10 | Integrasjonstest: cache-invalidering, eksportkoe, komprimering | Full-stack | 0.75d |

**Totalt: ~7.5 dager**

---

## 4. Sprint Y.3: Lasttesting og monitorering (1.5 uke)

Denne sprinten validerer at tiltakene fra Y.1 og Y.2 faktisk virker, og setter opp permanent monitorering.

### 4.1 Lasttestoppsett med Locust

Locust velges fordi det er Python-basert (matcher eksisterende analysekompetanse), har et web-UI for sanntidsovervaking, og stoetter distribuert testing for hoyere belastning.

Testscenarioene modellerer realistisk brukeratferd fordelt pa roller:

**FAG-bruker (70% av brukerne):** Ser pa saksoversikt (40% av handlingene), apner enkelt sak (25%), redigerer og lagrer sak (15%), sender innspill til FIN (5%), eksporterer saksliste (5%), heartbeat for lasing (10% -- automatisk bakgrunnstrafikk).

**FIN-bruker (30% av brukerne):** Ser pa saksoversikt pa tvers av departementer (30%), apner enkelt sak (20%), skriver FINs vurdering og lagrer (20%), apner departementsliste (10%), redigerer departementsliste (10%), eksporterer departementsliste (5%), heartbeat (5%).

```python
# locust/budget_user.py

from locust import HttpUser, task, between, tag
import random
import json

DEPARTMENTS = ["kld", "ud", "jd", "hod", "kd", "sd", "nfd", "bfd",
               "aid", "lmd", "kud", "fd", "ofd", "eid", "did"]

class FAGUser(HttpUser):
    weight = 7  # 70% av brukerne
    wait_time = between(3, 12)  # Realistisk tenketid

    def on_start(self):
        dept = random.choice(DEPARTMENTS)
        self.dept = dept
        resp = self.client.post("/api/auth/login", json={
            "email": f"budsjett1@{dept}.dep.no",
            "password": "Test1234!"
        })
        self.token = resp.json().get("token", "")
        self.client.headers.update({"Authorization": f"Bearer {self.token}"})
        self.round_id = None
        self.case_ids = []

    @task(40)
    @tag("read")
    def view_case_list(self):
        resp = self.client.get(
            f"/api/cases?departmentId={self.dept}&budgetRoundId={self.round_id}",
            name="/api/cases [list]"
        )
        if resp.status_code == 200:
            cases = resp.json()
            self.case_ids = [c["id"] for c in cases[:20]]

    @task(25)
    @tag("read")
    def view_case_detail(self):
        if not self.case_ids:
            return
        case_id = random.choice(self.case_ids)
        self.client.get(f"/api/cases/{case_id}", name="/api/cases/[id]")

    @task(15)
    @tag("write")
    def save_case(self):
        if not self.case_ids:
            return
        case_id = random.choice(self.case_ids)
        self.client.put(f"/api/cases/{case_id}/content", json={
            "proposalText": f"Lasttestdata {random.randint(1,9999)}",
            "expectedVersion": 1
        }, name="/api/cases/[id]/content [save]")

    @task(5)
    @tag("export")
    def export_case_list(self):
        self.client.post("/api/export/cases/excel", json={
            "filters": {"departmentId": self.dept},
            "fields": ["caseName", "chapter", "post", "amount", "status"]
        }, name="/api/export/cases/excel")

    @task(10)
    @tag("background")
    def heartbeat(self):
        # Simulerer heartbeat for lasing (hvis bruker har en las)
        pass


class FINUser(HttpUser):
    weight = 3  # 30% av brukerne
    wait_time = between(3, 15)

    def on_start(self):
        resp = self.client.post("/api/auth/login", json={
            "email": "saksbehandler1@fin.dep.no",
            "password": "Test1234!"
        })
        self.token = resp.json().get("token", "")
        self.client.headers.update({"Authorization": f"Bearer {self.token}"})

    @task(30)
    @tag("read")
    def view_cross_dept_cases(self):
        dept = random.choice(DEPARTMENTS)
        self.client.get(
            f"/api/cases?departmentId={dept}",
            name="/api/cases [FIN cross-dept]"
        )

    @task(20)
    @tag("read")
    def view_case_detail(self):
        self.client.get(f"/api/cases/{random.choice(['...'])}", name="/api/cases/[id] [FIN]")

    @task(20)
    @tag("write")
    def save_fin_assessment(self):
        pass  # PUT /api/cases/{id}/content med finAssessment

    @task(10)
    @tag("read")
    def view_department_list(self):
        self.client.get("/api/department-lists?budgetRoundId=...&departmentId=kld",
                       name="/api/department-lists [view]")

    @task(5)
    @tag("export")
    def export_department_list(self):
        self.client.post("/api/export/department-list/word",
                        json={"departmentListId": "..."},
                        name="/api/export/department-list/word")
```

### 4.2 Testscenarier

Lasttesten kjores i fire trinn med okende belastning:

**Trinn 1: Baseline (20 brukere).** 5 minutters varighet. Etablerer baseline-metrikker for responstider og throughput. Alle endepunkter bor ligge under 100ms p95.

**Trinn 2: Normal last (100 brukere).** 15 minutters varighet. Simulerer normal drift med 15 FAG-departementer og FIN-brukere. Saksoversikten bor ligge under 200ms p95. Enkelt-sak-oppslag under 100ms. Lagring under 300ms.

**Trinn 3: Hoy last (300 brukere).** 15 minutters varighet. Simulerer toppbelastning (fristdag for innspill). Akseptable terskler: saksoversikt under 500ms p95, enkelt-sak under 200ms, lagring under 500ms. Eksport kan ta lengre tid (asynkron koe).

**Trinn 4: Stresstest (500 brukere).** 10 minutters varighet. Forventet a avdekke flaskehalser. Malet er ikke at alt skal vaere raskt, men at systemet ikke krasjer og at kjerneoperasjoner (les, skriv) fortsatt fungerer -- om enn tregere.

**Spesialscenario: Eksportstorm.** 50 brukere som alle klikker "Generer departementsliste" innenfor et 30-sekunders vindu. Validerer at eksportkoen fungerer og at vanlige API-kall ikke degraderes.

**Spesialscenario: Lasstorm.** 30 brukere som samtidig forsker a apne samme sak for redigering. Validerer at lasingmekanismen handterer race conditions korrekt (kun en far lasen, resten far 409).

### 4.3 Testdata-generering

Lasttesten krever realistisk datamengde. Et Python-script genererer:

500 saker fordelt pa 15 departementer (ca. 33 per departement) med 10-30 versjoner per sak (5 000-15 000 rader i `case_content`). `content_json` fylles med realistisk TipTap-JSON (3-20 KB per versjon). 15 departementsliste-instanser med 20-40 saker per liste. 1000 hendelser i `case_events`.

### 4.4 Monitorering

For a fange ytelsesproblemer permanent (ikke bare under lasttest) settes opp monitorering som kjorer i produksjon.

**Application Insights / Prometheus + Grafana:** Registrer responstid per endepunkt (p50, p95, p99), feilrate (HTTP 5xx), aktive databasetilkoblinger (via PgBouncer-metrikker), Redis hit/miss-rate, antall aktive laser, og eksportkoe-dybde.

**PostgreSQL-monitorering:** `pg_stat_statements` aktiveres for a identifisere de tregeste sporringene. `pg_stat_user_tables` overvakes for a se tabellvekst og index usage.

**Helsesjekk-endepunkt:** `GET /api/health` som sjekker PostgreSQL-tilkobling, Redis-tilkobling og returner responstid for begge. Brukes av Kubernetes liveness/readiness-probes.

**Alerting:** Varsling ved p95 responstid > 1 sekund, feilrate > 5%, databasetilkoblinger > 80% av pool, eller Redis-minne > 80%.

### 4.5 Oppgaver og estimat

| # | Oppgave | Eier | Estimat |
|---|---------|------|---------|
| 1 | Locust-prosjekt: brukerklasser, testscenarier, docker-compose-integrasjon | Backend/Test | 1.5d |
| 2 | Testdata-genereringscript (500 saker, 15K versjoner, deplister) | Backend | 1d |
| 3 | Kjor trinn 1-4 lasttester, identifiser flaskehalser | Full-stack | 1d |
| 4 | Fiks identifiserte flaskehalser (erfaringsmessig 2-4 issues) | Backend | 1.5d |
| 5 | Kjor lasttester pa nytt, verifiser forbedringer | Full-stack | 0.5d |
| 6 | Application Insights / Prometheus + Grafana-oppsett | DevOps | 1d |
| 7 | `pg_stat_statements`-oppsett + dashboard | DevOps/Backend | 0.5d |
| 8 | Helsesjekk-endepunkt + Kubernetes-probes | Backend | 0.5d |
| 9 | Alerting-regler (responstid, feilrate, pool, minne) | DevOps | 0.5d |

**Totalt: ~8 dager**

---

## 5. Sprint Y.4: Horisontal skalering og hardening (1 uke)

Denne sprinten gjor systemet klart for produksjon med mulighet for a skalere horisontalt.

### 5.1 Flere API-pods

Backend-applikasjonen ma vaere stateless for a kunne kjores i flere instanser bak en load balancer. I dag lagres ingenting i minnet pa poden som ikke ogsa finnes i databasen, med unntak av eventuelle TipTap-dokumenter i minne under redigering (som uansett er per-bruker).

Konkrete sjekker og tiltak: Sesjoner/JWT-tokens valideres stateless (allerede OK med JWT). Cache bruker Redis (innfort i Y.2, ikke in-memory). SignalR (for fremtidig WebSocket-bruk) konfigureres med Redis backplane slik at meldinger fanges pa tvers av pods. Hangfire konfigureres med PostgreSQL som backing store (ikke in-memory) slik at bakgrunnsjobber fordeles pa tvers av pods.

Kubernetes-manifest for horisontal skalering:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: statsbudsjettportalen-api
spec:
  replicas: 2  # Minimum 2 pods for redundans
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: statsbudsjettportalen-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: statsbudsjettportalen-api
  minReplicas: 2
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### 5.2 Graceful shutdown og draining

Nar en pod skaleres ned eller restarter, ma den fa fullfort pagaende requests og frigi alle laser for den termineres. .NET sin `IHostApplicationLifetime` brukes til a lytte pa shutdown-signaler. Ved shutdown: slutt a akseptere nye requests, vent pa at pagaende requests fullfores (maks 30 sekunder), frigi alle `resource_locks` som er tatt av denne pod-instansen, la Hangfire fullfe pagaende jobb (eller re-koe den).

### 5.3 Rate limiting

For a beskytte mot utilsiktet overbelastning (en feilkonfigurert klient som looper, eller en bruker som spam-klikker eksport) innfores rate limiting pa de tyngste endepunktene.

Eksport-endepunkter: maks 5 requests per bruker per minutt. Lagring: maks 30 requests per bruker per minutt (beskytter mot autosave-loop). Saksoversikt: maks 60 requests per bruker per minutt. Rate limiting implementeres via .NET sitt innebygde `RateLimiter`-middleware med Redis-basert distribuert teller (slik at grensene gjelder pa tvers av pods).

### 5.4 Oppgaver og estimat

| # | Oppgave | Eier | Estimat |
|---|---------|------|---------|
| 1 | Verifiser statelessness: sett opp 2 pods, test all funksjonalitet | Full-stack | 0.5d |
| 2 | SignalR Redis backplane-konfigurasjon | Backend | 0.5d |
| 3 | Hangfire med PostgreSQL backing store | Backend | 0.5d |
| 4 | Graceful shutdown: las-frigiving, request draining | Backend | 0.5d |
| 5 | Kubernetes-manifester: Deployment, HPA, liveness/readiness | DevOps | 0.5d |
| 6 | Rate limiting middleware med Redis-basert teller | Backend | 1d |
| 7 | Lasttest med 2+ pods: verifiser at alt fungerer distribuert | Full-stack | 0.5d |
| 8 | Dokumentasjon: driftshandbok, skalerings-runbook, monitorerings-guide | Team | 1d |

**Totalt: ~5 dager**

---

## 6. Samlet estimat og avhengigheter

| Sprint | Fokus | Varighet | Forutsetning |
|--------|-------|----------|-------------|
| Y.1 | Database og backend-optimalisering | 1.5 uke | Departementsliste-modulen ferdig |
| Y.2 | Redis-caching og asynkron eksport | 1.5 uke | Y.1 ferdig |
| Y.3 | Lasttesting og monitorering | 1.5 uke | Y.2 ferdig (trenger alle optimaliseringer pa plass for baseline) |
| Y.4 | Horisontal skalering og hardening | 1 uke | Y.3 ferdig (lasttest avdekker evt. ekstra behov) |
| **Totalt** | | **5.5 uker** | |

Y.1 og Y.2 kan til en viss grad parallelliseres (Redis-oppsettet er uavhengig av indekseringsarbeidet), men det er oversiktligst a kjore dem sekvensielt. Y.3 ma komme etter Y.1+Y.2 fordi lasttesten skal validere at tiltakene virker. Y.4 bygger pa funnene fra Y.3.

---

## 7. Risikoer

**PgBouncer + EF Core-kompatibilitet.** EF Core bruker som standard prepared statements og session-level innstillinger som ikke fungerer med PgBouncer i transaction mode. Npgsql har innebygd stotte for dette via konfigurasjonsparametre, men det ma testes grundig. Tiltak: dediker 0.5 dager i Y.1 til a verifisere alle sporringer med PgBouncer. Fallback: kjor PgBouncer i session mode (mindre effektivt men fullt kompatibelt).

**Cache-invalidering.** Saksoversikt-cachen med 15s TTL betyr at en nylig lagret sak kan ta opptil 15 sekunder for a vises i oversikten for andre brukere. I de fleste tilfeller er dette akseptabelt, men det kan forvirre brukere som nettopp har lagret og lurer pa om lagringen virket. Tiltak: etter vellykket lagring oppdaterer frontend sin lokale React Query-cache umiddelbart (optimistic update), uavhengig av server-cachen.

**Lasttestens realisme.** Syntetisk lasttest fanger ikke all reell brukeratferd (f.eks. brukere som holder fanen apen i timer uten a gjore noe, brukere som apner 10 faner samtidig). Tiltak: suppler med pilottest med 20-30 ekte brukere for observere faktisk atferd.

**Asynkron eksport og brukeropplevelse.** Brukere er vant til at eksport skjer umiddelbart (klikk -> fil). Overgang til asynkron koe kan oppleves som tregere, selv om det er raskere for systemet som helhet. Tiltak: for enkle eksporter (f.eks. Excel med 50 saker) som fullfores pa under 3 sekunder, vurder a beholde synkron eksport. Bruk asynkron koe kun for tunge operasjoner (departementsliste-Word, PDF).

---

## 8. Suksesskriterier

| Metrikk | Mal (100 brukere) | Mal (500 brukere) |
|---------|-------------------|--------------------|
| Saksoversikt p95 | < 200ms | < 500ms |
| Enkelt-sak p95 | < 100ms | < 200ms |
| Lagring p95 | < 300ms | < 500ms |
| Eksport (koe-tid) | < 5s | < 30s |
| Feilrate (5xx) | < 0.1% | < 1% |
| DB connections (PgBouncer) | < 30 av 50 | < 45 av 50 |
| Redis hit rate | > 80% | > 90% |
| CPU per pod | < 50% | < 80% |

---

## 9. Nye brukerhistorier

| ID | Brukerhistorie | Akseptansekriterier |
|----|---------------|---------------------|
| US-37 | Som driftsansvarlig onsker jeg at portalen handterer 100-500 samtidige brukere uten ytelsesforringelse, slik at budsjettprosessen ikke stopper opp ved toppbelastning. | Lasttestresultater innenfor tersklene i suksesskriteriene. |
| US-38 | Som saksbehandler onsker jeg at saksoversikten laster raskt (< 200ms) ogsa nar mange brukere er palogget, slik at jeg kan jobbe effektivt. | Redis-cache, optimaliserte indekser, denormalisert siste versjon. |
| US-39 | Som saksbehandler onsker jeg at eksport av departementslister og sakslister kjorer i bakgrunnen med statusvisning, slik at jeg kan fortsette a jobbe mens dokumentet genereres. | Asynkron koe, fremgangsdialog, nedlastingslenke nar ferdig. |
| US-40 | Som driftsansvarlig onsker jeg monitorering og varsling av responstider, feilrater og ressursbruk, slik at problemer oppdages for brukerne merker dem. | Dashboards i Grafana/Application Insights. Alerting ved terskelverdier. |
