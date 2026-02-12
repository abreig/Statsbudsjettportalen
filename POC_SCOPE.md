# POC Scope: FAG-FIN Utveksling

> **POC Hovedfokus:** POC skal primært teste den kritiske datautvekslingen mellom FAG og FIN. Dette innebærer at begge sider av løsningen må implementeres, med fokus på saksflyt, kommunikasjon og tilbakemelding mellom departementene og Finansdepartementet.

## Varighet

3-4 uker (2 sprinter à 2 uker)

## Must Have (Kritisk for POC)

### FAG-side (Fagdepartementene)

| ID | Brukerhistorie | Prioritet | FAG-FIN fokus |
|----|----------------|-----------|---------------|
| US-01 | Velge budsjettrunde etter innlogging | P0 | Grunnlag |
| US-02 | Opprette ny sak med forhåndsdefinerte felt | P0 | Grunnlag |
| US-03 | Se saksoversikt med filtrering og søk | P0 | Oversikt |
| US-04 | Redigere og lagre sak med versjonering | P0 | Grunnlag |
| US-06 | Sende samlet innspill til FIN | P0 | KRITISK utveksling |

### FIN-side (Finansdepartementet)

| ID | Brukerhistorie | Prioritet | FAG-FIN fokus |
|----|----------------|-----------|---------------|
| US-09 | Se innspill fra fagdepartementene | P0 | KRITISK mottak |
| US-10 | Legge til FINs vurdering og verbalkonklusjon | P0 | KRITISK vurdering |
| US-11 | Returnere saker til FAG med begrunnelse | P0 | KRITISK tilbakemelding |
| US-12 | Stille spørsmål til FAG om enkeltsaker | P1 | Kommunikasjon |

### Felles funksjonalitet

- US-16: Versjonslogg og historikk (forenklet for POC)
- Varsling ved statusendringer (FAG mottar varsel når FIN returnerer sak)
- Statusflyt som viser hvor i prosessen hver sak er

## Nice to Have (Hvis tid)

- US-05: Intern avklaring i FAG (politisk ledelse)
- US-07: Eksportere saksoversikt til Word/Excel
- US-13: Intern avklaring i FIN (underdirektør, avdelingsdirektør)
- US-15: Generere departementsliste (forenklet Word-eksport)

## Out of Scope for POC

- Kompleks godkjenningsflyt med alle roller
- Avansert søk og filtrering på tvers av departementer
- Samtidig redigering (Fase 2)
- Integrasjon med FIA Budsys (bruker syntetisk data)
- Integrasjon med Entra ID (mock autentisering i POC)

## Viktige tekniske forutsetninger for POC

POC vil **IKKE** ha tilgang til Entra ID eller FIA Budsys:
- Autentisering mockes med forhåndsdefinerte brukere og roller
- Kapittel/post-data er syntetisk
- Ved overgang til produksjon integreres Entra ID og FIA Budsys av Sopra Steria

## Statusflyt i POC

```
FAG: draft → under_arbeid → til_avklaring → klarert → sendt_til_fin
FIN: under_vurdering_fin → returnert_til_fag | ferdigbehandlet_fin
```

## Testoppgaver for brukere

1. **FAG:** Opprett en ny sak, rediger den, send til FIN
2. **FIN:** Se innspill, legg til vurdering, returner en sak til FAG med begrunnelse
3. **FAG:** Motta returnert sak, gjør endringer, send på nytt
4. **Begge:** Bruk søk og filtrering til å finne en spesifikk sak

## Suksesskriterier for POC

| Metrikk | Mål | Hvordan måles |
|---------|-----|---------------|
| Task completion rate | 90%+ | Andel brukere som fullfører testoppgaver uten hjelp |
| Tid per oppgave | < 3 min | Gjennomsnittlig tid for å opprette og sende en sak |
| Antall feil | < 2 per bruker | Antall ganger bruker klikker feil eller blir forvirret |
| SUS-score | > 70 | System Usability Scale spørreskjema (0-100) |
| Subjektiv tilfredshet | 4/5 | "Jeg foretrekker dette fremfor Word" (1-5) |
