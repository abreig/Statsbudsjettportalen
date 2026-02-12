# Utviklingsplan for POC

## Forutsetninger

### Sjekkliste før oppstart

- [ ] Node.js installert (versjon 18 eller høyere)
- [ ] Python installert hvis FastAPI (versjon 3.10+)
- [ ] PostgreSQL installert lokalt eller Docker
- [ ] Git installert og konfigurert
- [ ] Docker installert (anbefalt for database)
- [ ] Claude Code installert og konfigurert
- [ ] Figma-tilgang (for design)
- [ ] VS Code eller annen IDE

## Sprint 1 (Uke 1-2)

### Sprint-mål

- Sette opp komplett utviklingsmiljø (frontend + backend + database)
- Lage wireframes og mockups for FAG og FIN
- Implementere mock-innlogging
- Implementere US-01: Velge budsjettrunde
- Implementere US-02: Opprette sak (FAG)
- Implementere US-09: Se innspill (FIN)
- Teste grunnleggende FAG-FIN utveksling

### Utviklingsrekkefølge

| Dag | Oppgave | Eier |
|-----|---------|------|
| 1 | Wireframes for FAG og FIN + designsystem-oppsett | UX/UI designer |
| 1-2 | Prosjektstruktur, Git, database-skjema | Backend |
| 2-3 | Mock autentisering + brukerroller + testdata | Backend |
| 3 | High-fidelity mockups ferdigstilles | UX/UI designer |
| 3-4 | React-oppsett + designsystem-implementering | Frontend |
| 4-5 | US-01: Velg budsjettrunde (API + UI) | Full-stack |
| 5-6 | US-02: Opprette sak (API + UI) | Full-stack |
| 6-7 | US-09: FIN ser innspill fra FAG | Full-stack |
| 8 | Prototype-testing med 2-3 brukere | UX designer + team |
| 9-10 | Iterasjon basert på feedback + dokumentasjon | Team |

## Sprint 2 (Uke 3-4)

### Sprint-mål

- Fullføre FAG-FIN datautveksling
- Implementere kommunikasjon (spørsmål/svar, retur)
- Implementere versjonering
- Usability testing med 5-8 brukere
- Dokumentere funn og forbedringer

### Utviklingsrekkefølge

| Dag | Oppgave | Eier |
|-----|---------|------|
| 11-12 | US-03/US-04: Saksoversikt + redigering (FAG) | Full-stack |
| 12-13 | US-06: Send innspill til FIN | Full-stack |
| 13-14 | US-10: FIN legger til vurdering | Full-stack |
| 14-15 | US-11: Returner sak til FAG + US-12: Spørsmål/svar | Full-stack |
| 15-16 | US-16: Versjonslogg og historikk | Full-stack |
| 17 | Usability testing (5-8 brukere) | UX designer + team |
| 18-19 | Iterasjoner basert på testing | Team |
| 20 | Dokumentasjon, SUS-spørreskjema, rapport | Team |

## Oppstart i Claude Code

### Første prompt

```
Jeg skal utvikle POC for Statsbudsjettportalen.

Prosjektmål: Digital løsning for budsjettprosessen mellom
fagdepartementene og Finansdepartementet i Norge.

POC fokuserer på:
1. FAG-FIN datautveksling (kritisk)
2. FAG-siden: Opprette, redigere, sende saker (US-01, 02, 03, 04, 06)
3. FIN-siden: Motta, vurdere, returnere saker (US-09, 10, 11, 12)
4. Kommunikasjon: Spørsmål/svar, versjonering
5. UX-testing med ekte brukere

Teknologivalg:
- Frontend: React 18 + TypeScript + Vite + Aksel/Radix UI
- Backend: [.NET 8 / Python FastAPI] (avgjøres nå)
- Database: PostgreSQL 16 (lokal Docker for POC)
- Autentisering: Mock (Entra ID integreres senere av Sopra Steria)
- Data: Syntetisk testdata (FIA Budsys integreres senere)
- Hosting: Sopra Steria privat sky (produksjon)

Se docs/-mappen for komplett dokumentasjon:
- PROJECT_OVERVIEW.md - Overordnet prosjektbeskrivelse
- POC_SCOPE.md - POC-scope og brukerhistorier
- TECHNICAL_STACK.md - Arkitektur og database-skjema
- UX_STRATEGY.md - Designprinsipper og designtokens
- USER_STORIES.md - Alle brukerhistorier med akseptansekriterier
- TEST_DATA.md - Syntetisk testdata (JSON)
- DEVELOPMENT_PLAN.md - Sprint-plan

Kan du hjelpe meg sette opp prosjektstrukturen og starte med:
1. Database-skjema for FAG-FIN utveksling
2. Mock autentisering med roller
3. US-01: Velge budsjettrunde (FAG og FIN)
4. US-02: Opprette sak (FAG)
```

### Forventet output fra Claude Code

- Komplett prosjektstruktur med frontend og backend
- Database-skjema (SQL-filer) med fokus på FAG-FIN datautveksling
- Mock autentisering med 5 testbrukere (FAG og FIN)
- API-endepunkter for budsjettrunder og saker
- React-app med routing og designsystem-oppsett
- README med installasjonsinstruksjoner

## Funksjonelle krav (POC)

- [ ] FAG kan opprette, redigere og sende saker til FIN
- [ ] FIN kan motta, vurdere, returnere saker til FAG
- [ ] Spørsmål/svar-kommunikasjon mellom FAG og FIN fungerer
- [ ] Versjonering viser historikk for alle endringer
- [ ] Statuser oppdateres automatisk gjennom saksflyten

## Ikke-funksjonelle krav

- UX: SUS-score > 70, task completion rate > 90%
- Ytelse: Sider laster på < 2 sekunder
- Tilgjengelighet: WCAG 2.1 AA-standard
- Kode: Dokumentert, følger beste praksis, 50%+ test-dekning
- Design: Konsistent med designsystem, responsiv

## Nyttige lenker

- React: https://react.dev
- Vite: https://vitejs.dev
- Aksel (NAV): https://aksel.nav.no
- Radix UI: https://www.radix-ui.com
- PostgreSQL: https://www.postgresql.org/docs/
- .NET: https://learn.microsoft.com/dotnet/
- FastAPI: https://fastapi.tiangolo.com
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
