# Kodegjennomgang og sikkerhetsrevisjon -- Statsbudsjettportalen

Du er en erfaren sikkerhetsrevisor og kodekvalitetsekspert. Gjennomfør en systematisk gjennomgang av Statsbudsjettportalen-kodebasen med fokus på sikkerhet, dataintegritet og robusthet. Denne applikasjonen håndterer gradert budsjettinformasjon for den norske regjeringen og krever høy sikkerhet.

## Kontekst

Statsbudsjettportalen er en webapplikasjon for samarbeid mellom fagdepartementene (FAG) og Finansdepartementet (FIN) i statsbudsjettprosessen. Systemet er klassifisert i sikkerhetssone Begrenset (B) iht. NSMs rammeverk.

Teknisk stack: React + Vite (frontend), .NET / C# REST API (backend), PostgreSQL, Redis (planlagt), TipTap/ProseMirror (rik tekst-editor), OpenXML SDK (Word-eksport).

Rollemodell: 9 distinkte roller med RBAC + ABAC (departementtilhørighet). FAG-brukere skal kun se eget departement. FIN-brukere ser alle, men kan kun redigere tilordnede saker.

## Arbeidsmetode

For hver fil eller modul du gjennomgår:

1. Les og forstå formålet med koden
2. Identifiser problemer sortert etter alvorlighet: KRITISK, HØY, MIDDELS, LAV
3. Implementer fiksen direkte i koden
4. Legg igjen en kort kommentar i koden som forklarer endringen
5. Kjør relevante tester etter endring for å verifisere at fiksen ikke brekker noe

Skriv en oppsummering av alle funn til `docs/security-review-findings.md` når gjennomgangen er ferdig.

---

## Del 1: Autentisering og autorisasjon

### 1.1 MockAuth og JWT-håndtering

Gjennomgå `backend/Statsbudsjettportalen.Api/Middleware/MockAuthMiddleware.cs`:

- Verifiser at standard JWT-nøkkelen (`poc-secret-key-not-for-production-use-only-minimum-32-chars`) ALDRI kan nå produksjon. Legg til en oppstartsjekk som krasjer applikasjonen dersom `ASPNETCORE_ENVIRONMENT=Production` og nøkkelen fortsatt er standardverdien.
- Sjekk at token-utløpstid (nå 24 timer) er fornuftig. Vurder om den bør reduseres.
- Verifiser at `ValidateLifetime = true` faktisk håndheves og at utløpte tokens avvises.
- Sjekk at claims ikke kan manipuleres av klienten (f.eks. at `department_id` og `role` kun settes server-side).

### 1.2 Innlogging uten passord

Gjennomgå `backend/Statsbudsjettportalen.Api/Controllers/AuthController.cs`:

- Login-endepunktet godtar kun e-post uten passord. Dette er akseptabelt for POC, men legg til en tydelig `[Obsolete]`-markering og en logg-advarsel som tydeliggjør at dette MÅ erstattes med Entra ID-integrasjon før produksjon.
- `/api/auth/users`-endepunktet er markert `[AllowAnonymous]` og lister alle aktive brukere. Vurder om dette bør kreve autentisering, og om sensitiv informasjon som `department_id`, `role`, `leaderLevel` bør filtreres for ikke-admin-brukere.

### 1.3 Rollebasert tilgangskontroll

Gjennomgå alle controllers for konsekvent autorisasjon:

- Sjekk at ALLE endepunkter som endrer data har `[Authorize]`-attributt.
- Verifiser at FAG-brukere faktisk er begrenset til eget departement i alle spørringer, ikke bare i `CasesController.GetAll`.
- Sjekk at statusoverganger i `WorkflowService` validerer at brukeren har rett rolle for den aktuelle overgangen, ikke bare at brukeren er autentisert.
- Let etter IDOR-sårbarheter (Insecure Direct Object References): Kan en FAG-bruker fra KLD hente eller endre en sak som tilhører UD ved å gjette `caseId`?

### 1.4 Frontend autorisasjonslagring

Gjennomgå `frontend/src/stores/authStore.ts`:

- Token lagres i `localStorage`. Sjekk at dette er tilstrekkelig beskyttet mot XSS. Vurder om `httpOnly`-cookies er mer passende for denne applikasjonen.
- Sjekk at `persist`-middleware i Zustand ikke lekker sensitiv informasjon.
- Verifiser at `logout` faktisk rydder all tilstandsinformasjon.

---

## Del 2: Input-validering og injeksjonssikkerhet

### 2.1 API-endepunkter

Gjennomgå alle controller-metoder som tar imot brukerinput:

- Sjekk at alle `[FromBody]`-parametre valideres med DataAnnotations eller FluentValidation. Let spesielt etter manglende lengdebegrensninger på strengfelt som `case_name`, `proposal_text`, `comment_text`, `question_text` osv.
- Verifiser at `[FromQuery]`-parametre saniteres (f.eks. `search`-parameteren i `CasesController.GetAll`). Er den sårbar for SQL-injeksjon via Entity Framework?
- Sjekk at GUID-parametre i URL-ruter faktisk valideres som gyldige UUID-er.

### 2.2 TipTap/ProseMirror-innhold

Gjennomgå håndteringen av rik tekst-innhold:

- `ContentJson` lagres som JSONB i PostgreSQL. Sjekk at JSON-strukturen valideres mot ProseMirror-skjemaet på serversiden, ikke bare i frontend.
- Let etter muligheter for lagret XSS: Kan en bruker injisere `<script>`-tagger eller `on*`-attributter via ProseMirror JSON som rendres ukritisk i andre brukeres nettlesere?
- Sjekk at `marks` og `attrs` i ProseMirror-noder valideres (f.eks. at `href` i lenker ikke kan være `javascript:`-URLer).

### 2.3 Filnavn og filstier

Gjennomgå `ExportController.SanitizeFileName`:

- Sjekk at sanitiseringen er tilstrekkelig. Kan path-traversal-angrep (`../../etc/passwd`) omgå den?
- Verifiser at `Content-Disposition`-headeren settes korrekt for å hindre responsplitting.
- Sjekk vedleggshåndteringen (attachments-tabellen): Valideres `file_path` og `mime_type` på serversiden?

---

## Del 3: Samtidig redigering og dataintegritet

### 3.1 Race conditions

Gjennomgå alle endepunkter som oppdaterer saker:

- Sjekk om det finnes noen form for optimistisk låsing (versjonskontroll) ved oppdatering av `case_content`. Kan to brukere overskrive hverandres arbeid?
- Verifiser at versjonsnummeret inkrementeres atomisk. Er `MAX(version) + 1`-mønsteret trygt under samtidig tilgang, eller kan det oppstå duplikate versjonsnumre?
- Sjekk om statusoverganger i saksflyt er beskyttet mot race conditions (f.eks. at to brukere sender inn samme sak samtidig).

### 3.2 Transaksjonsbruk

- Verifiser at operasjoner som involverer flere tabeller (f.eks. oppretting av sak + første versjon i `case_content` + hendelse i `case_events`) kjøres innenfor en transaksjon.
- Sjekk at `SaveChangesAsync` kalles på riktig tidspunkt og at feilhåndtering ruller tilbake korrekt.

---

## Del 4: Word-eksport og dokumenthåndtering

### 4.1 WordExportService

Gjennomgå `backend/Statsbudsjettportalen.Api/Services/WordExportService.cs`:

- Sjekk at brukerinput som skrives inn i Word-dokumentet (saksnavn, omtaletekst, kommentarer) saniteres for OpenXML-injeksjon. Kan spesialtegn i brukerinput korruptere dokumentstrukturen?
- Verifiser at `ParseTimestamp` håndterer ugyldige tidsstempler uten å krasje.
- Sjekk at det er minnehåndtering: Genereres store dokumenter i minnet uten begrensninger? Kan en ondsinnet bruker utløse OutOfMemoryException?
- Verifiser at midlertidige filer ryddes opp etter eksport.

### 4.2 Departementsliste-generering

Når denne funksjonaliteten implementeres:

- Sjekk at Word-maler fra blob storage valideres før bruk. Kan en manipulert mal utnyttes?
- Verifiser at tilgangskontroll håndheves: Kan en FAG-bruker generere departementslisten til et annet departement?

---

## Del 5: Feilhåndtering og informasjonslekkasje

### 5.1 Feilresponser

Gjennomgå alle controller-metoder:

- Sjekk at stack traces og interne feilmeldinger ALDRI eksponeres til klienten i produksjon. Let etter `ex.Message` i HTTP-responser.
- Verifiser at `AdminController.ResetDatabase` returnerer `ex.Message` til klienten -- dette lekker intern databaseinformasjon.
- Sjekk at alle 500-feil logger tilstrekkelig kontekst for feilsøking uten å eksponere sensitiv informasjon.

### 5.2 Logging

- Verifiser at sensitiv informasjon (tokens, passord, persondata) ikke logges.
- Sjekk at alle sikkerhetsrelevante hendelser logges: innlogging, statusendringer, eksporter, feilede autorisasjonsforsøk.
- Vurder om audit-logging er tilstrekkelig for arkivkravene.

---

## Del 6: Frontend-sikkerhet

### 6.1 XSS-forebygging

Gjennomgå alle React-komponenter:

- Let etter bruk av `dangerouslySetInnerHTML`. Hvis det brukes, verifiser at innholdet saniteres.
- Sjekk at TipTap-editorens rendering av brukerinnhold er sikker mot XSS.
- Verifiser at URL-parametre og query strings saniteres før bruk.

### 6.2 CORS-konfigurasjon

Gjennomgå CORS-oppsettet i `Program.cs`:

- Sjekk at `AllowedOrigins` er restriktivt nok. Er wildcard (`*`) brukt noe sted?
- Verifiser at `AllowCredentials` kun er aktivert for kjente origins.
- Sjekk Codespaces-logikken: Kan den dynamiske origin-genereringen utnyttes?

### 6.3 API-klient

Gjennomgå frontend API-klienten:

- Sjekk at alle API-kall inkluderer Authorization-headeren.
- Verifiser at 401-responser håndteres korrekt (redirect til innlogging, rydde opp tilstand).
- Sjekk at API-base-URL ikke er hardkodet til localhost i produksjonsbygg.

---

## Del 7: Database og infrastruktur

### 7.1 Entity Framework og PostgreSQL

- Sjekk at alle spørringer bruker parameteriserte queries (EF Core gjør dette som standard, men verifiser at det ikke finnes rå SQL med string-interpolering).
- Verifiser at `case_content.content_json` har en rimelig størrelsesbegrensning.
- Sjekk at database-migreringer kjøres trygt (idempotent, med rollback-plan).
- Vurder om Row-Level Security (RLS) i PostgreSQL er implementert som planlagt, eller om det er en sikkerhetshull at all filtrering skjer i applikasjonslaget.

### 7.2 Connection strings og hemmeligheter

- Sjekk at connection strings ikke er hardkodet i kildekoden.
- Verifiser at `appsettings.json` (med standardverdier) ikke inneholder produksjonshemmeligheter.
- Sjekk at `.gitignore` dekker alle konfigurasjonsfiler med hemmeligheter.

---

## Del 8: Avhengigheter og forsyningskjede

### 8.1 NuGet-pakker (backend)

Kjør `dotnet list package --vulnerable --include-transitive` og rapporter alle kjente sårbarheter. Oppgrader pakker med kjente sikkerhetshull.

### 8.2 npm-pakker (frontend)

Kjør `npm audit` i frontend-mappen og rapporter alle kjente sårbarheter. Oppgrader pakker med kjente sikkerhetshull med `npm audit fix`.

### 8.3 Docker og deployment

- Sjekk at Dockerfile (om den finnes) bruker et minimalt base-image og ikke kjører som root.
- Verifiser at health-check-endepunkter ikke lekker systeminformasjon.

---

## Del 9: Ytelsesrelatert sikkerhet

### 9.1 Denial of Service

- Sjekk at det finnes rate limiting på API-endepunkter, spesielt innlogging og eksport.
- Verifiser at store spørringer pagineres (f.eks. `GetAll` i CasesController med 600+ saker).
- Sjekk at Word-eksport har timeout og minnebegrensninger.
- Verifiser at TipTap-dokumenter har en maksimal størrelsesbegrensning.

### 9.2 N+1-spørringer

- Let etter N+1-spørringsproblemer i Entity Framework (manglende `.Include()` eller overdreven lazy loading).
- Sjekk at `ContentVersions`-inkluderingen i `CasesController.GetAll` ikke laster all historikk for alle saker.

---

## Leveranser

Når gjennomgangen er ferdig, produser følgende:

1. `docs/security-review-findings.md` -- Komplett liste over alle funn med alvorlighet, beskrivelse, og status (fikset / krever manuell vurdering / krever arkitekturendring).

2. `docs/security-checklist-prod.md` -- Sjekkliste for produksjonsklar sikkerhet som MÅ gjennomføres før deployment utenfor POC-miljøet. Inkluder:
   - Erstatt MockAuth med Entra ID
   - Implementer RLS i PostgreSQL
   - Sett opp rate limiting
   - Konfigurer sikre headers (CSP, HSTS, X-Frame-Options)
   - Sett opp virusskanning for vedlegg
   - Implementer samtidige redigeringslåser
   - Konfigurer audit-logging

3. Alle fikser implementert direkte i koden med forklarende kommentarer.

---

## Viktige prinsipper

- Anta at angriperen er en autentisert bruker fra et annet departement (insider threat). Budsjettinformasjon er sensitiv og departementsisolering er kritisk.
- Vær spesielt oppmerksom på grensesnittet mellom FAG og FIN -- det er her mest data flyter og mest potensiale for lekkasje.
- Husk at dette er en POC som skal modnes til produksjon. Marker tydelig hva som er akseptable POC-kompromisser vs. reelle sikkerhetshull.
- Bruk norske kommentarer i koden der det er naturlig, spesielt for domene-spesifikke begreper.
