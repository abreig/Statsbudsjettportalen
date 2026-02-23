# Sjekkliste for produksjonsklar sikkerhet -- Statsbudsjettportalen

**Formål:** Denne sjekklisten MÅ gjennomføres før deployment utenfor POC-miljøet.
**Sist oppdatert:** 2026-02-23

---

## Autentisering og autorisasjon

- [ ] **Erstatt MockAuth med Entra ID (Microsoft.Identity.Web)**
  - Fjern `MockAuthMiddleware.cs` og `AuthController.Login`
  - Konfigurer `Microsoft.Identity.Web` med tenant-ID og klient-ID
  - Implementer token-refresh med MSAL
  - Sett opp gruppetilhørighet for rollemapping
  - Verifiser at `ValidateLifetime`, `ValidateIssuer`, `ValidateAudience` er aktive

- [ ] **Reduser token-utløpstid**
  - Med Entra ID: bruk standard OAuth2-levetider (1 time access token, refresh token)
  - Implementer silent token refresh i frontend

- [ ] **Migrer token-lagring til httpOnly cookies**
  - Fjern `localStorage.setItem('auth_token', ...)`
  - Sett cookie med `HttpOnly`, `Secure`, `SameSite=Strict`
  - Oppdater API-klient til å bruke cookie automatisk (fjern Authorization-header)
  - Implementer CSRF-beskyttelse (double submit cookie eller synchronizer token)

- [ ] **Legg til departementstilgangskontroll i alle kontrollere**
  - DepartmentListsController: Sjekk departement i GetById, Create, Update, ExportWord
  - SubmissionsController: Sjekk at bruker kun sender saker fra eget departement
  - QuestionsController: Sjekk at bruker har tilgang til saken spørsmålet tilhører
  - CommentsController: Sjekk at bruker har tilgang til saken kommentaren tilhører
  - CaseConclusionsController: Sjekk at bruker har tilgang

---

## Nettverkssikkerhet

- [ ] **Konfigurer Content Security Policy (CSP)**
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';
  ```

- [ ] **Aktiver HSTS preloading**
  - Verifiser at `Strict-Transport-Security` er satt (allerede implementert for produksjon)
  - Vurder preload-registrering

- [ ] **Fjern Swagger i produksjon**
  - Fjern `EnableSwagger`-konfigurasjon
  - Begrens Swagger til kun `IsDevelopment()`

- [ ] **Stram inn CORS-konfigurasjon**
  - Fjern `SetIsOriginAllowed(_ => true)` for Codespaces
  - Bruk eksplisitte origins for alle miljøer
  - Vurder om `AllowCredentials()` er nødvendig

---

## Database og dataintegritet

- [ ] **Implementer Row-Level Security (RLS) i PostgreSQL**
  - Opprett policies som filtrerer på departement
  - Sett opp `app.current_setting('app.department_id')` via EF Core connection interceptor
  - RLS er et ekstra sikkerhetslag utover applikasjonslaget

- [ ] **Aktiver TLS for databaseforbindelser**
  - Legg til `SslMode=Require` i connection string
  - Konfigurer sertifikater

- [ ] **Implementer database-backup og point-in-time recovery**
  - Konfigurer automated backups i Azure
  - Test restore-prosedyre

- [ ] **Legg til størrelsesbegrensning på content_json i databasen**
  - Bruk `CHECK (pg_column_size(content_json) < 5242880)` (5 MB)
  - Allerede begrenset i DTO, men bør også håndheves i database

---

## Filhåndtering og eksport

- [ ] **Sett opp virusskanning for vedlegg**
  - Integrer med ClamAV eller Azure Defender for Storage
  - Skann alle opplastede filer (figurer) før lagring
  - Blokker kjørbare filtyper

- [ ] **Flytt filopplasting til Azure Blob Storage**
  - Fjern lokal fillagring i `wwwroot/uploads/`
  - Bruk SAS-tokens for tidsbegrenset tilgang
  - Aktiver soft delete og versjonering

- [ ] **Begrens Word-eksport minnebruk**
  - Sett maksgrense for antall saker per eksport
  - Implementer timeout for eksport-operasjoner
  - Overvåk minnebruk i export job service

---

## Logging og overvåking

- [ ] **Konfigurer strukturert logging**
  - Bruk Serilog eller Application Insights
  - Logg alle innloggingsforsøk (vellykkede og mislykkede)
  - Logg alle statusendringer med bruker-ID og departement
  - Logg alle eksportoperasjoner
  - Logg mislykkede autorisasjonsforsøk

- [ ] **Sett opp alerting**
  - Varsle ved mange mislykkede innloggingsforsøk
  - Varsle ved uvanlig mange API-kall fra samme bruker
  - Varsle ved feil i databasemigrering

- [ ] **Implementer audit trail for compliance**
  - Verifiser at CaseEvents dekker alle sikkerhetsrelevante hendelser
  - Implementer retention policy (arkivkrav)
  - Beskytt audit-loggen mot sletting (write-once)

---

## Infrastruktur

- [ ] **Verifiser at Docker kjører som non-root** (allerede implementert)
  - Test at `USER appuser` fungerer i Azure Web Apps

- [ ] **Konfigurer nettverkssegmentering**
  - Plasser database i privat subnet (Private Endpoint)
  - Begrens inbound til kun applikasjonen
  - Plasser Redis i privat subnet

- [ ] **Sett opp Key Vault for hemmeligheter**
  - Flytt JWT-secret til Azure Key Vault
  - Flytt database connection string til Key Vault
  - Bruk Managed Identity for tilgang

- [ ] **Aktiver Azure DDoS Protection**
  - Standard-plan for produksjon

---

## Avhengigheter

- [ ] **Oppgrader npm-avhengigheter med kjente sårbarheter**
  - Kjør `npm audit fix` (11 sårbarheter, primært i dev-avhengigheter)
  - Oppgrader eslint og typescript-eslint

- [ ] **Sett opp automatisk sårbarhetsskanning**
  - Aktiver GitHub Dependabot for NuGet og npm
  - Konfigurer Snyk eller Azure Defender for DevOps

- [ ] **Pin Docker base images til spesifikke versjoner**
  - Bruk `mcr.microsoft.com/dotnet/aspnet:8.0.x` i stedet for `8.0`
  - Sett opp image scanning i CI/CD

---

## Testing

- [ ] **Gjennomfør penetrasjonstest**
  - Test IDOR-scenarioer med brukere fra ulike departementer
  - Test rollehierarkiet (FAG kan ikke utføre FIN-operasjoner)
  - Test JWT-manipulering
  - Test SQL-injeksjon (bør være dekket av EF Core)
  - Test XSS via ProseMirror-innhold

- [ ] **Implementer automatiserte sikkerhetstester**
  - Test at alle muterende endepunkter krever `[Authorize]`
  - Test departementstilgangskontroll for hvert endepunkt
  - Test at FIN-felt er skjult for FAG-brukere

---

## Prioritering

| Prioritet | Tiltak | Tidsestimat |
|---|---|---|
| P0 (blokkerende) | Erstatt MockAuth med Entra ID | - |
| P0 (blokkerende) | Migrer token til httpOnly cookies | - |
| P0 (blokkerende) | Departementstilgang i alle kontrollere | - |
| P1 (før lansering) | CSP-headere | - |
| P1 (før lansering) | Key Vault for hemmeligheter | - |
| P1 (før lansering) | RLS i PostgreSQL | - |
| P1 (før lansering) | Virusskanning for vedlegg | - |
| P1 (før lansering) | Penetrasjonstest | - |
| P2 (etter lansering) | Azure Blob Storage for filer | - |
| P2 (etter lansering) | Automatisert sårbarhetsskanning | - |
| P2 (etter lansering) | Strukturert logging med alerting | - |
