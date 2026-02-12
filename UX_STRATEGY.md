# UX/UI Strategi og Designprinsipper

> **Hvorfor UX/UI er kritisk:** Brukerne (saksbehandlere i FAG og FIN) er vant til Word-arbeidsflyt. Hvis den nye løsningen ikke oppleves som enklere og mer intuitiv, vil adopsjon feile. Brukeropplevelsen er derfor like viktig som teknisk funksjonalitet.

## Designprinsipper

| Prinsipp | Beskrivelse | Konkret i løsningen |
|----------|-------------|---------------------|
| **Enkelhet først** | Brukere skal kunne utføre oppgaver uten opplæring | Tydelige handlingsknapper, selvforklarende labels, minimal klikkdybde |
| **Progresjon og oversikt** | Brukere skal alltid vite hvor de er i prosessen | Visuell statusindikator, fremdriftslinje, tydelig saksflyt |
| **Forutsigbarhet** | Systemet skal oppføre seg konsekvent | Samme designmønstre, ensartet terminologi, konsistent plassering |
| **Tilbakemelding** | Brukere skal få umiddelbar respons på handlinger | Bekreftelsesmeldinger, feilhåndtering, loading-indikatorer |
| **Trygghet** | Brukere skal føle kontroll og kunne angre | Versjonering synlig, "Lagre"-knapp tydelig, bekreftelse før sletting |

## Designsystem og Konsistens

**Primærvalg:** Aksel (NAVs designsystem) - godt tilpasset norsk offentlig sektor.
**Alternativ:** Radix UI for headless komponenter med egen styling.
**Tilpasning:** Farger til Finansdepartementets visuelle profil.

### Designtokens

| Element | Verdi | Bruksområde |
|---------|-------|-------------|
| Primærfarge | `#1B5E99` (FIN blå) | Primærknapper, aktive elementer |
| Sekundærfarge | `#2E75B6` (lys blå) | Hover-states, sekundære elementer |
| FAG-farge | `#4A7C59` (grønn) | FAG-spesifikke elementer |
| FIN-farge | `#C65911` (oransje) | FIN-spesifikke elementer |
| Suksess | `#06893A` | Godkjente saker, positive meldinger |
| Advarsel | `#FF9100` | Advarsler, saker til avklaring |
| Feil | `#C30000` | Feilmeldinger, returnerte saker |
| Grå 50 | `#F5F5F5` | Bakgrunn |
| Grå 200 | `#E0E0E0` | Skillelinjer, borders |
| Spacing base | `8px` | Grunnenheten for all spacing (8, 16, 24, 32, 48) |

## Informasjonsarkitektur

### Navigasjonsstruktur for FAG

1. **Velg budsjettrunde** (inngang) → viser tilgjengelige runder
2. **Saksoversikt** (hovedskjerm) → tabellarisk liste med alle saker
3. **Saksdetaljer** (modal eller egen side) → redigering av enkelt sak
4. **Innspill til FIN** (samlevisning) → oversikt over alle klarerte saker før sending

### Navigasjonsstruktur for FIN

1. **Velg budsjettrunde** → samme som FAG
2. **Innspill fra FAG** (hovedskjerm) → tabellarisk liste med alle mottatte saker
3. **Saksdetaljer med FINs vurdering** → redigering av FINs felt + FAGs originale innspill
4. **Departementsliste** (samlevisning) → alle saker per departement

## Interaksjonsdesign

### Sakslistevisning (US-03, US-09)

- Tabell med sorterbare kolonner (klikk på header for å sortere)
- Filtre over tabellen (sakstype, status, tilordnet til)
- Søkefelt øverst til høyre
- Fargekodet status (grønn = klarert, oransje = til avklaring, rød = returnert)
- Hover-effekt på rader for å indikere klikkbarhet
- Klikk på rad åpner saksdetaljer

### Saksdetaljvisning (US-04, US-10)

- Feltbasert skjema, ikke Word-lignende dokument (Fase 1)
- Feltene varierer basert på sakstype (satsingsforslag har flere felt enn budsjettiltak)
- Tydelig "Lagre"-knapp nederst til høyre
- Versjonsdropdown øverst til høyre ("Vis versjon 1", "Vis versjon 2", etc.)
- Statusindikator øverst ("Under arbeid → Til avklaring → Klarert → Sendt til FIN")
- **For FIN:** FAGs felt vises som read-only øverst, FINs felt er redigerbare nedenfor

### Kommunikasjon FAG-FIN (US-11, US-12)

- Spørsmål/svar-seksjon nederst i saksdetaljvisningen
- Tråd-basert visning (chat-lignende) med tidsstempel og avsender
- Tekstfelt for å skrive nytt spørsmål/svar
- Varsel i toppen av siden når ny melding er mottatt
- Returknapp (FIN) åpner modal med påkrevd begrunnelsesfelt

## Responsivitet og Tilgjengelighet

- Desktop-first design (primær bruk på PC), men skal fungere på tablet
- WCAG 2.1 AA-standard for tilgjengelighet
- Tastaturnavigasjon (Tab, Enter, Escape fungerer som forventet)
- Skjermleser-vennlig (ARIA-labels på alle interaktive elementer)
- Kontrastforhold minimum 4.5:1 for tekst
- Fokusindikatorer synlige og tydelige

## UX-testing i POC

### Testmetodikk

1. **Tidlig prototype-testing** (uke 2): Test wireframes med 2-3 brukere fra FAG
2. **Usability testing** (uke 3): Observer mens brukere utfører oppgaver i POC
3. **Heuristisk evaluering** (uke 4): Ekspert-gjennomgang av UX-prinsipper
4. **SUS-spørreskjema** ved slutten av POC

### Suksesskriterier for UX

| Metrikk | Mål | Hvordan måles |
|---------|-----|---------------|
| Task completion rate | 90%+ | Andel brukere som fullfører testoppgaver uten hjelp |
| Tid per oppgave | < 3 min | Gjennomsnittlig tid for å opprette og sende en sak |
| Antall feil | < 2 per bruker | Antall ganger bruker klikker feil eller blir forvirret |
| SUS-score | > 70 | System Usability Scale spørreskjema (0-100) |
| Subjektiv tilfredshet | 4/5 | "Jeg foretrekker dette fremfor Word" (1-5) |

## Design Deliverables for POC

| Deliverable | Format | Tidspunkt | Ansvarlig |
|-------------|--------|-----------|-----------|
| Wireframes (low-fi) | Figma/Sketch | Uke 1 | UX designer |
| Designsystem (tokens) | CSS/JSON | Uke 1-2 | Frontend lead |
| High-fidelity mockups | Figma | Uke 2 | UX/UI designer |
| Interaktiv prototype | Figma/React | Uke 2-3 | Frontend team |
| Usability test rapport | PDF | Uke 4 | UX designer |
| Design guidelines | Markdown | Uke 4 | UX/UI designer |
