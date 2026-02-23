# Sikkerhetsrevisjon -- Funn og tiltak

**Dato:** 2026-02-23
**Revisor:** Automatisert kodegjennomgang (Claude)
**Scope:** Statsbudsjettportalen -- fullstack (backend .NET 8, frontend React, infrastruktur)

---

## Oppsummering

| Alvorlighet | Antall | Fikset | Krever manuell vurdering |
|---|---|---|---|
| KRITISK | 2 | 2 | 0 |
| HØY | 9 | 7 | 2 |
| MIDDELS | 8 | 4 | 4 |
| LAV | 4 | 1 | 3 |
| **Totalt** | **23** | **14** | **9** |

---

## KRITISK

### K-1: Standard JWT-nøkkel kan nå produksjon
**Fil:** `Middleware/MockAuthMiddleware.cs`, `Program.cs`
**Beskrivelse:** Standard POC-nøkkelen `poc-secret-key-not-for-production-use-only-minimum-32-chars` brukes som fallback uten kontroll av miljø. En angriper som kjenner denne nøkkelen kan generere vilkårlige JWT-tokens med enhver rolle og departementstilhørighet.
**Status:** FIKSET
**Tiltak:** Lagt til `MockAuth.ValidateProductionSecret()` som kaster `InvalidOperationException` ved oppstart dersom `ASPNETCORE_ENVIRONMENT=Production` og nøkkelen er standardverdien.

### K-2: Innlogging uten passord
**Fil:** `Controllers/AuthController.cs`
**Beskrivelse:** Login-endepunktet godtar kun e-post uten noen form for passjord eller annen autentisering. Enhver som kjenner en gyldig e-postadresse kan logge inn som den brukeren.
**Status:** FIKSET (merket `[Obsolete]` + logg-advarsel)
**Tiltak:** Lagt til `[Obsolete]`-attributt og `LogWarning` som tydeliggjør at dette MÅ erstattes med Entra ID. Akseptabelt for POC, men er en blokkerende sak for produksjon.

---

## HØY

### H-1: /api/auth/users var anonymt tilgjengelig
**Fil:** `Controllers/AuthController.cs`
**Beskrivelse:** Endepunktet var markert `[AllowAnonymous]` og returnerte alle aktive brukere med rolle, departement, og ledernivå. En uautentisert angriper kunne kartlegge organisasjonsstrukturen.
**Status:** FIKSET
**Tiltak:** Endret til `[Authorize]`. Krever nå gyldig JWT-token.

### H-2: IDOR-sårbarhet i CasesController.GetById
**Fil:** `Controllers/CasesController.cs` (GetById)
**Beskrivelse:** En autentisert FAG-bruker fra departement A kunne hente detaljer om en sak fra departement B ved å gjette eller inkrementere saks-IDen. Ingen departements-sjekk ble utført.
**Status:** FIKSET
**Tiltak:** Lagt til departements- og rollekontroll: FAG-brukere ser kun eget departement, FIN-brukere ser kun FIN-synlige statuser.

### H-3: IDOR-sårbarhet i ChangeStatus, SaveContent, SaveDocument
**Fil:** `Controllers/CasesController.cs`
**Beskrivelse:** Samme IDOR-problem som H-2, men for endring av status og lagring av innhold. En bruker fra et annet departement kunne endre status eller innhold på en sak de ikke hadde tilgang til.
**Status:** FIKSET
**Tiltak:** Lagt til departementsjekk i ChangeStatus, SaveContent og SaveDocument.

### H-4: Hardkodet "administrator"-rolle i History-endepunktet
**Fil:** `Controllers/CasesController.cs` (GetHistory)
**Beskrivelse:** `MapToDto` ble kalt med `userRole: "administrator"` hardkodet, noe som ga alle brukere full tilgang til FIN-felt i historiske saker uavhengig av rolle.
**Status:** FIKSET
**Tiltak:** Bruker nå faktisk brukerrolle fra JWT-token, og legger til departementfiltrering for FAG-brukere.

### H-5: CaseTypesController var delvis anonymt tilgjengelig
**Fil:** `Controllers/CaseTypesController.cs`
**Beskrivelse:** GET-endepunktene var markert `[AllowAnonymous]`. Sakstypedefinisjoner med feltkonfigurasjoner var tilgjengelige uten autentisering.
**Status:** FIKSET
**Tiltak:** Lagt til `[Authorize]` på kontroller-nivå.

### H-6: Informasjonslekkasje via AdminController.ResetDatabase
**Fil:** `Controllers/AdminController.cs`
**Beskrivelse:** `ex.Message` ble returnert i HTTP-responsen, noe som kan lekke intern databasestruktur, connection strings, eller annen sensitiv informasjon.
**Status:** FIKSET
**Tiltak:** Fjernet `ex.Message` fra respons. Logger nå kun server-side.

### H-7: Informasjonslekkasje via health-endepunkt
**Fil:** `Program.cs` (/api/health)
**Beskrivelse:** `ex.Message` fra databasefeil og Redis-feil ble eksponert til klienten, inkludert i produksjon. Environment-navn ble også eksponert.
**Status:** FIKSET
**Tiltak:** `ex.Message` vises nå kun i development-miljø. Miljønavn fjernet fra respons.

### H-8: Ingen input-lengdebegrensninger på DTOer
**Fil:** `DTOs/CaseDtos.cs`, `DTOs/CommentDtos.cs`, `DTOs/QuestionDtos.cs`
**Beskrivelse:** Ingen `[MaxLength]` eller `[Required]` attributter på inndata-felt. En angriper kunne sende ubegrensede strenger og potensielt forårsake minneproblemer eller databasefeil.
**Status:** FIKSET
**Tiltak:** Lagt til `[MaxLength]` og `[Required]` validering på alle relevante inndata-DTOer. ContentJson begrenset til 5 MB.

### H-9: Manglende departementstilgangskontroll i DepartmentListsController
**Fil:** `Controllers/DepartmentListsController.cs`
**Beskrivelse:** Ingen sjekk av om brukeren har tilgang til departementet en departementsliste tilhører. En FAG-bruker kan potensielt se og redigere departementslister for andre departementer.
**Status:** KREVER MANUELL VURDERING
**Anbefaling:** Legg til departementsjekk i GetById, Create, UpdateStatus, og ExportWord.

---

## MIDDELS

### M-1: JWT-token lagres i localStorage
**Fil:** `frontend/src/stores/authStore.ts`, `frontend/src/api/client.ts`
**Beskrivelse:** Auth-token lagres i localStorage som er sårbar for XSS-angrep. Dersom en XSS-sårbarhet utnyttes, kan angriperen stjele tokenet.
**Status:** KREVER ARKITEKTURENDRING
**Anbefaling:** Migrer til httpOnly secure cookies for token-lagring. Krever backend-endring for å sette cookie ved login og lese den automatisk.

### M-2: Manglende 401-interceptor i frontend
**Fil:** `frontend/src/api/client.ts`
**Beskrivelse:** API-klienten hadde ingen respons-interceptor for 401-feil, noe som betyr at utløpte tokens ikke ble håndtert -- brukeren ble ikke redirectet til innlogging.
**Status:** FIKSET
**Tiltak:** Lagt til respons-interceptor som rydder token og redirecter til /login ved 401.

### M-3: CORS tillater enhver origin i utvikling/Codespaces
**Fil:** `Program.cs`
**Beskrivelse:** `SetIsOriginAllowed(_ => true)` med `AllowCredentials()` i dev/Codespaces. I Codespaces kan dette potensielt utnyttes av ondsinnede nettsider.
**Status:** KREVER MANUELL VURDERING
**Anbefaling:** Begrens til eksplisitte Codespaces-URLer i stedet for wildcard. I produksjon er dette allerede korrekt konfigurert.

### M-4: Docker kjører som root
**Fil:** `Dockerfile`
**Beskrivelse:** Container kjørte som root-bruker, noe som øker skadeomfanget ved kompromittering.
**Status:** FIKSET
**Tiltak:** Lagt til non-root `appuser` (UID 1001) og `USER appuser` i Dockerfile.

### M-5: Manglende sikkerhets-headere
**Fil:** `Program.cs`
**Beskrivelse:** Ingen X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy eller Permissions-Policy headere.
**Status:** FIKSET
**Tiltak:** Lagt til middleware som setter alle anbefalte sikkerhets-headere. HSTS kun i produksjon.

### M-6: Race condition på versjonsnummer i SaveContent
**Fil:** `Controllers/CasesController.cs` (SaveContent)
**Beskrivelse:** `MAX(version) + 1` er ikke atomisk. To samtidige lagringer kan potensielt beregne samme versjonsnummer. Unique constraint `(CaseId, Version)` forhindrer datakorrumpsjon, men gir en kryptisk feilmelding.
**Status:** KREVER MANUELL VURDERING
**Anbefaling:** SaveDocument bruker allerede `ExpectedVersion` for optimistisk låsing. Utvid samme mønster til SaveContent, eller bruk en database-sekvens for atomisk versjonering.

### M-7: Synkron XHR i locks.ts (sendBeacon fallback)
**Fil:** `frontend/src/api/locks.ts`
**Beskrivelse:** Bruker `XMLHttpRequest` synkront (deprecated) for å frigi låser ved page unload.
**Status:** KREVER MANUELL VURDERING
**Anbefaling:** Bruk `navigator.sendBeacon()` konsekvent, eller godta at låsen utløper via server-side timeout.

### M-8: .gitignore dekket ikke alle sensitive filer
**Fil:** `.gitignore`
**Beskrivelse:** Manglende regler for `appsettings.Production.json`, `.env.*`, og andre konfigurasjonsfiler.
**Status:** FIKSET
**Tiltak:** Utvidet .gitignore med regler for produksjonskonfigurasjon, secrets.json og credentials.json.

---

## LAV

### L-1: Token-utløpstid er 24 timer
**Fil:** `Middleware/MockAuthMiddleware.cs`
**Beskrivelse:** Token utløper etter 24 timer. For en applikasjon med sensitiv budsjettinformasjon kan dette være for lenge.
**Status:** KREVER MANUELL VURDERING
**Anbefaling:** Reduser til 4-8 timer og implementer token-refresh mekanisme. Med Entra ID vil dette håndteres automatisk.

### L-2: Swagger tilgjengelig utenom Development
**Fil:** `Program.cs`
**Beskrivelse:** Swagger kan aktiveres via `EnableSwagger`-konfigurasjon i enhver tilstand. API-dokumentasjonen bør ikke være tilgjengelig i produksjon.
**Status:** KREVER MANUELL VURDERING
**Anbefaling:** Fjern `EnableSwagger`-opsjonen og begrens Swagger til kun development-miljøet.

### L-3: Manglende paginering i GetAll
**Fil:** `Controllers/CasesController.cs` (GetAll)
**Beskrivelse:** GetAll returnerer alle saker uten paginering. Med 600+ saker kan dette bli en ytelsesflaskehals og DoS-vektor.
**Status:** KREVER MANUELL VURDERING
**Anbefaling:** Implementer `offset`/`limit` parametere. GetList-endepunktet finnes allerede som lettere alternativ.

### L-4: npm-avhengigheter med kjente sårbarheter
**Fil:** `frontend/package.json`
**Beskrivelse:** `npm audit` rapporterer 11 sårbarheter (1 moderate, 10 high), hovedsakelig i eslint-relaterte dev-avhengigheter.
**Status:** KREVER MANUELL VURDERING
**Anbefaling:** Kjør `npm audit fix` for å oppgradere berørte pakker. Disse er kun dev-avhengigheter og påvirker ikke produksjonsbygg.

---

## Positive funn

Gjennomgangen avdekket også flere gode sikkerhetspraksiser:

1. **EF Core parameteriserte spørringer:** Ingen rå SQL med string-interpolering (kun `ExecuteSqlRawAsync("SELECT 1")` i health-check).
2. **Ingen `dangerouslySetInnerHTML`:** Frontend bruker React som automatisk escaper tekst.
3. **Rate limiting:** Allerede implementert med per-bruker-grenser på eksport (5/min), lagring (30/min) og generelle endepunkter (120/min).
4. **Optimistisk låsing i SaveDocument:** `ExpectedVersion`-sjekk forhindrer overskrivning.
5. **Ressurslåser:** Pessimistisk låsing med heartbeat og timeout.
6. **Audit trail:** Alle sikkerhetsrelevante hendelser logges i CaseEvents.
7. **Filnavn-sanitering:** `SanitizeFileName` bruker `Path.GetInvalidFileNameChars()`.
8. **Filopplastingsvalidering:** Kun PNG, SVG, JPG/JPEG tillatt for figurer, med 10 MB grense.
9. **JWT ValidateLifetime = true:** Token-utløp håndheves korrekt.
10. **Claims settes server-side:** Rolle og departement utledes fra databasen, ikke fra klientens input.
