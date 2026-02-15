# Statsbudsjettportalen – Utviklingsplan for Fase 2: Word-funksjonalitet

*Sammenhengende dokumentmodell med egenutviklet spor endringer*

*Februar 2026 – Finansdepartementet*

---

## 1. Sammendrag og kontekst

Denne utviklingsplanen dekker Fase 2 av Statsbudsjettportalen: **Word-funksjonalitet**. Fasen bygger videre på POC og Fase 1, som har etablert grunnleggende saksflyt mellom fagdepartementene (FAG) og Finansdepartementet (FIN). Fase 2 skal transformere portalens saksvisning fra et skjemabasert grensesnitt til en **sammenhengende dokumentopplevelse** med spor endringer og kommentarer, slik at brukerne opplever noe som ligner på Word, men integrert i portalen.

### 1.1 Arkitekturbeslutninger

Følgende to nøkkelbeslutninger er tatt og danner grunnlaget for hele utviklingsplanen:

**Sammenhengende dokument:** Hele saken rendres som ett TipTap-dokument med seksjoner (overskrifter som «Forslag til omtale i materialet», «Begrunnelse for forslaget» osv.), i stedet for separate TipTap-instanser per felt. Strukturert metadata (kapittel, post, beløp) presenteres i en header/sidebar, mens faginnholdet flyter som et sammenhengende dokument.

**Egenutviklet spor endringer:** Spor endringer bygges basert på ProseMirror-transaksjoner, uten avhengighet til TipTap Pro. Hver endring (innsetting, sletting, formatering) fanges som ProseMirror-steps, berikes med bruker- og tidsstempelmetadata, og lagres for godkjenning/avvisning. Dette gir full kontroll, men krever betydelig utviklingsarbeid.

### 1.2 Avhengigheter fra Fase 1

Følgende må være på plass før Fase 2 starter:

- **Fungerende saksflyt:** FAG kan opprette, redigere og sende saker til FIN. FIN kan vurdere og returnere.
- **Versjonering (US-16):** Versjonslogg med hvem, hva og når for alle endringer.
- **Database med case_content-tabell:** Inkludert content_json (JSONB) som allerede er designet for TipTap-innhold.
- **Testbrukere og testdata:** Minimum 5 saker med realistisk faginnhold for KLD.

---

## 2. Overordnet fasestruktur

Fase 2 er estimert til 2–3 måneder og deles i fire delsprinter. Hver delsprint bygger på den forrige og leverer testbar funksjonalitet.

| Sprint | Fokus | Leveranse | Varighet |
|--------|-------|-----------|----------|
| Sprint 2.1 | ProseMirror dokumentmodell | Sak rendres som dokument med rik tekst | 3 uker |
| Sprint 2.2 | Spor endringer (kjerne) | Visuell diff med godta/avvis per endring | 3–4 uker |
| Sprint 2.3 | Kommentarer og UI-polish | Inline-kommentarer med tråder + polert UX | 2–3 uker |
| Sprint 2.4 | Integrasjon, testing og hardening | Komplett løsning klar for brukertest | 2 uker |

*Samtidig redigering (US-17) er bevisst utelatt fra planen.* Arkitekturen legger til rette for det gjennom Yjs/CRDT, men implementeringen skyves til etter at spor endringer og kommentarer er stabile. Dokumentmodellen og datalagringen designes slik at Yjs kan «boltes på» uten refaktorering.

---

## 3. Sprint 2.1 – ProseMirror dokumentmodell (3 uker)

Denne sprinten transformerer saksvisningen fra skjema til dokument. Det er den mest synlige endringen for brukerne og legger det tekniske grunnlaget for alt som følger.

### 3.1 ProseMirror-skjema

Det sentrale tekniske arbeidet er å definere et ProseMirror-skjema (schema) som representerer en sak som et strukturert dokument. Skjemaet må balansere to behov: brukeren skal oppleve fri tekstflyt, men systemet må kunne mappe innholdet tilbake til spesifikke databasefelt.

Skjemaet definerer følgende hovednoder:

- **caseDocument (toppnode):** Wrapper for hele dokumentet. Inneholder metadata-attributter (case_id, version) og en ordnet sekvens av seksjoner.
- **caseSection:** Representerer ett faginnholdsfelt (f.eks. «Forslag til omtale i materialet»). Har et field_key-attributt (f.eks. «proposal_text») som mapper til databasefeltet. Inneholder en seksjonstittel og rik tekst-innhold.
- **sectionTitle:** Ikke-redigerbar overskrift for seksjonen. Rendres visuelt som en dokumentoverskrift, men brukeren kan ikke endre den.
- **sectionContent:** Redigerbar rik tekst-blokk. Støtter avsnitt, bold, kursiv, understreking og lister.

Denne strukturen gjør at dokumentet *føles* sammenhengende (brukeren scroller gjennom seksjoner som i et Word-dokument), men *teknisk* er det mulig å trekke ut innholdet per seksjon og lagre det i de eksisterende databasefeltene (proposal_text, justification, verbal_conclusion osv.).

### 3.2 Frontend-layout

Saksvisningen redesignes med følgende oppsett:

- **Venstre hovedpanel (70%):** TipTap-dokumentet. Viser faginnholdet som et sammenhengende dokument med seksjonsoverskrifter, formatert tekst og en verktøylinje øverst (bold, kursiv, liste, angre/gjør om).
- **Høyre sidepanel (30%):** Strukturert metadata (saksnavn, kapittel, post, beløp, sakstype, status), saksflyt-handlinger, og senere kommentarpanel.

Layouten er inspirert av Google Docs / Notion der dokumentet har fokus, men kontekstuell informasjon er tilgjengelig i sidepanelet. Verktøylinjen følger Word-konvensjoner og skal føles umiddelbart gjenkjennelig.

### 3.3 Backend-endringer

case_content-tabellen utvides. Feltet **content_json** (JSONB) tar over som primær lagring for faginnhold. De eksisterende tekstfeltene (proposal_text, justification osv.) beholdes og synkroniseres ved lagring – dette sikrer bakoverkompatibilitet med Fase 1-eksport og eventuell fallback. Et nytt API-endepunkt PUT /api/cases/{id}/document tar imot hele ProseMirror-dokumentet som JSON, validerer det mot skjemaet, splitter innholdet per seksjon, og lagrer både content_json og de individuelle tekstfeltene.

### 3.4 Oppgaver og estimater

| # | Oppgave | Eier | Estimat | Dag |
|---|---------|------|---------|-----|
| 1 | Definere ProseMirror-skjema med caseDocument, caseSection, sectionTitle, sectionContent | Frontend | 3d | 1–3 |
| 2 | Bygge TipTap-editor-komponent med custom schema og verktøylinje | Frontend | 3d | 2–4 |
| 3 | Redesigne CaseDetail.tsx: dokumentlayout med sidepanel for metadata | Frontend + UX | 3d | 4–6 |
| 4 | Bygge seksjonsnavigasjon (innholdsfortegnelse i sidepanel) | Frontend | 1d | 6 |
| 5 | Backend: PUT /api/cases/{id}/document med skjemavalidering og feltsplitting | Backend | 2d | 5–6 |
| 6 | Migrere eksisterende case_content til content_json-format (migreringsskript) | Backend | 2d | 7–8 |
| 7 | Automatisk lagring (debounced, 2 sek etter siste endring) | Full-stack | 1d | 8 |
| 8 | Enhetstester for skjema, serialisering/deserialisering, API | Full-stack | 2d | 9–10 |
| 9 | UX-gjennomgang: test med 2–3 brukere, juster layout | UX + Frontend | 2d | 11–12 |

### 3.5 Akseptansekriterier for Sprint 2.1

- En sak åpnes som et sammenhengende, scrollbart dokument med seksjonsoverskrifter.
- Brukeren kan redigere rik tekst (bold, kursiv, lister) i hver seksjon.
- Strukturert metadata (kapittel, post, beløp) vises i sidepanel, ikke inline i dokumentet.
- Endringer lagres automatisk og kan hentes opp igjen ved å åpne saken på nytt.
- Eksisterende eksportfunksjonalitet (Word/Excel) fungerer uåndret.

---

## 4. Sprint 2.2 – Spor endringer (3–4 uker)

Dette er den teknisk mest krevende sprinten. Her bygges kjernen i spor endringer-funksjonaliteten basert på ProseMirror-transaksjoner.

### 4.1 Arkitektur for spor endringer

Løsningen bygger på ProseMirrors transaksjonssystem. Hver gang en bruker gjør en endring i editoren, genererer ProseMirror en Transaction bestående av en eller flere Steps. Vi intercepter disse transaksjonene via et custom TipTap-plugin og gjør følgende:

- **Fange:** Pluginen fanger hver transaksjon før den appliseres på dokumentet.
- **Annotere:** Transaksjonens steps berikes med metadata: bruker-ID, brukernavn, tidsstempel og en unik endring-ID.
- **Lagre:** I stedet for å applisere endringen direkte på dokumentet, lagres den som en «pending change» – en endring som venter på godkjenning.
- **Vise:** En dekorasjonslayer (ProseMirror Decorations) rendrer endringene visuelt: innsettinger med farget bakgrunn og brukermarkering, slettinger med gjennomstreking.
- **Godkjenne/avvise:** Brukeren kan klikke på en endring og velge «Godta» eller «Avvis». Godta appliserer steppen permanent. Avvis fjerner den.

**Spor endringer er en toggle.** Brukeren kan slå funksjonen av og på via en knapp i verktøylinjen. Når togglen er av, fungerer editoren som en vanlig rik tekst-editor der endringer appliseres direkte. Når togglen er på, intercepter pluginen transaksjoner og lagrer dem som pending changes. Saksflyten kan sette en fornuftig standard (f.eks. automatisk på når FIN redigerer FAGs tekst), men brukeren kan alltid overstyre manuelt.

### 4.2 Datamodell for endringer

Endringer lagres i en ny tabell som kobles til case_content:

| Felt | Type | Beskrivelse |
|------|------|-------------|
| id | UUID | Unik identifikator for endringen |
| case_id | UUID (FK) | Referanse til saken |
| version | INT | Versjonen endringen tilhører |
| user_id | UUID (FK) | Brukeren som gjorde endringen |
| change_type | VARCHAR(20) | insert, delete, replace, format |
| section_key | VARCHAR(50) | Hvilken seksjon endringen gjelder (f.eks. proposal_text) |
| step_json | JSONB | ProseMirror step serialisert som JSON |
| decoration_json | JSONB | Dekorasjonsinformasjon for visuell rendering |
| status | VARCHAR(20) | pending, accepted, rejected |
| reviewed_by | UUID (FK) | Brukeren som godkjente/avviste |
| reviewed_at | TIMESTAMPTZ | Tidspunkt for godkjenning/avvisning |
| created_at | TIMESTAMPTZ | Når endringen ble gjort |

### 4.3 Visuell rendering

Endringer vises med konvensjoner kjent fra Word:

- **Innsettinger:** Farget bakgrunn (blå/grønn avhengig av bruker) med brukerens initialer i margen.
- **Slettinger:** Rød gjennomstreking med brukerens initialer.
- **Formatendringer:** Markert med en tynn stiplet linje og tooltip som viser hva som ble endret.
- **Endringspanel:** Et panel (i sidepanelet eller som overlay) som lister alle ventende endringer med mulighet for «Godta alle», «Avvis alle», eller enkeltvise valg.

Hver endring viser **hvem** som gjorde den, **hva** som ble endret, og **når**. Fargepaletten tildeles per bruker for å visuelt skille ulike bidragsytere.

### 4.4 Moduser

Editoren støtter tre moduser, tilsvarende Words Review-fane:

- **Redigering (standard):** Brukeren redigerer fritt. Hvis spor endringer er aktivert, spores alle endringer automatisk som «pending».
- **Gjennomgang:** Dokumentet er skrivebeskyttet, men endringer er synlige og kan godtas/avvises.
- **Endelig visning:** Viser dokumentet som om alle ventende endringer er godtatt. Nyttig for å se «sluttresultatet».

Modusbyttet styres av en toggle i verktøylinjen og kan også styres av saksstatusen (f.eks. etter at saken er sendt til FIN, går FAGs redigering automatisk over i gjennomgangsmodus).

### 4.5 Oppgaver og estimater

| # | Oppgave | Eier | Estimat | Dag |
|---|---------|------|---------|-----|
| 1 | Designe og implementere TrackChangesPlugin (ProseMirror-plugin som intercepter transaksjoner) | Frontend | 5d | 1–5 |
| 2 | Bygge DecorationLayer for visuell rendering av innsettinger og slettinger | Frontend | 3d | 3–5 |
| 3 | Implementere godta/avvis-logikk per endring og i batch | Frontend | 3d | 6–8 |
| 4 | Backend: tracked_changes-tabell, API for CRUD på endringer | Backend | 2d | 4–5 |
| 5 | Backend: Logikk for å applisere godtatte endringer på content_json | Backend | 2d | 6–7 |
| 6 | Implementere tre moduser (redigering, gjennomgang, endelig visning) | Frontend | 2d | 8–9 |
| 7 | Brukerfarger: tildel farge per bruker, vis initialer i margen | Frontend | 1d | 9 |
| 8 | Endringspanel i sidepanel med «Godta alle» / «Avvis alle» | Frontend | 2d | 10–11 |
| 9 | Integrasjonstester: opprett endring → lagre → godta → verifiser dokument | Full-stack | 2d | 12–13 |
| 10 | Edge cases: overlappende endringer, sletting av seksjon, store endringer | Frontend | 2d | 13–14 |
| 11 | UX-gjennomgang med 3–5 brukere | UX + Frontend | 2d | 15–16 |

### 4.6 Akseptansekriterier for Sprint 2.2

- Når spor endringer er aktivert og en bruker redigerer tekst, vises endringene visuelt (farge for innsettinger, gjennomstreking for slettinger).
- Endringer kan godtas eller avvises enkeltvis, og resultatet reflekteres i dokumentet.
- Bruker og tidspunkt vises for hver endring.
- Tre moduser (redigering, gjennomgang, endelig visning) fungerer og kan byttes mellom.
- Endringer persisteres i databasen og overlever sideoppdatering.
- Spor endringer kan slås av og på via toggle i verktøylinjen.

---

## 5. Sprint 2.3 – Kommentarer og UI-polish (2–3 uker)

Med dokumentmodellen og spor endringer på plass, legges kommentarfunksjonalitet til. Denne sprinten er teknisk mindre krevende enn Sprint 2.2, men krever gjennomtenkt UX.

### 5.1 Kommentarmodell

Kommentarer knyttes til tekstpassasjer gjennom ProseMirror marks. Når en bruker markerer tekst og legger til en kommentar, skjer følgende:

- **Markering:** En «commentMark» med en unik comment_id legges på den markerte teksten i ProseMirror-dokumentet.
- **Lagring:** Kommentarens innhold, bruker og tidspunkt lagres i en egen tabell (case_comments).
- **Visning:** Den markerte teksten får en gul/oransje bakgrunn. Når brukeren klikker på den, åpnes kommentartråden i sidepanelet.

### 5.2 Kommentartråder

Hver kommentar kan besvares, og tråder kan løses/lukkes:

- **Svar:** Andre brukere kan svare på en kommentar. Svar lagres med parent_comment_id og rendres kronologisk under opprinnelig kommentar.
- **Løse:** En kommentartråd kan markeres som «løst». Den markerte teksten går tilbake til normal farge, og tråden flyttes til en «løste kommentarer»-seksjon.
- **Ankring:** Når teksten som en kommentar peker på endres eller slettes, må kommentaren håndteres. ProseMirror marks følger teksten gjennom redigeringer. Hvis all markert tekst slettes, flyttes kommentaren til «orløse kommentarer».

### 5.3 UI-polish

Denne sprinten inkluderer også overordnet polering av hele dokumentopplevelsen:

- Responsiv sidebar som kan kollapse.
- Tastatursnarveistøtte (Ctrl+B for bold, Ctrl+I for kursiv, Ctrl+Shift+C for kommentar).
- Forbedret verktøylinje med tydelige ikoner og tooltips.
- Tilgjengelighetstesting (WCAG 2.1 AA) for hele dokumentvisningen.
- Print-vennlig visning av dokumentet.

### 5.4 Oppgaver og estimater

| # | Oppgave | Eier | Estimat | Dag |
|---|---------|------|---------|-----|
| 1 | Definere commentMark i ProseMirror-skjema | Frontend | 1d | 1 |
| 2 | Bygge kommentarpanel i sidebar med trådvisning | Frontend | 3d | 1–3 |
| 3 | Implementere opprett kommentar (marker tekst → skriv kommentar) | Frontend | 2d | 3–4 |
| 4 | Svar på kommentarer og løs/lukk-funksjonalitet | Frontend | 2d | 4–5 |
| 5 | Backend: case_comments-tabell med API (CRUD + tråder) | Backend | 2d | 2–3 |
| 6 | Ankringslogikk: håndtere redigering/sletting av kommentert tekst | Frontend | 2d | 5–6 |
| 7 | Tastatursnarveistøtte og verktøylinje-forbedringer | Frontend | 1d | 7 |
| 8 | Responsiv sidebar, print-visning, generell polish | Frontend + UX | 2d | 7–8 |
| 9 | Tilgjengelighetstesting (WCAG 2.1 AA) | UX | 1d | 9 |
| 10 | Enhetstester og integrasjonstester for kommentarer | Full-stack | 2d | 9–10 |

### 5.5 Akseptansekriterier for Sprint 2.3

- Bruker kan markere tekst og legge til en kommentar som vises i sidepanelet.
- Kommentarer kan besvares (tråder) og løses/lukkes.
- Kommentert tekst er visuelt markert og klikking navigerer til riktig kommentar.
- WCAG 2.1 AA er oppfylt for dokumentvisningen.

---

## 6. Sprint 2.4 – Integrasjon, testing og hardening (2 uker)

Den siste sprinten handler om å sy alt sammen og sikre at løsningen er robust nok for brukertesting og eventuell pilotering.

### 6.1 Integrasjon med saksflyt

Spor endringer og kommentarer må integreres med den eksisterende saksflyten fra Fase 1:

- **Retur med spor endringer (US-24):** Når FIN returnerer en sak til FAG, skal FINs endringer og kommentarer være synlige for FAG. FAG kan deretter godta/avvise FINs endringer og svare på kommentarer.
- **Statusbasert modus:** Saksstatusen styrer hvilken editormodus som er aktiv. F.eks. «Sendt til FIN» = skrivebeskyttet for FAG, redigerbar for FIN.
- **Versjonering:** Spor endringer integreres med versjonsloggen. Hver versjon lagrer et snapshot av dokumentet inkludert ventende endringer, slik at man kan se historikken.

### 6.2 Word-eksport med spor endringer

Eksportfunksjonaliteten fra Fase 1 utvides til å inkludere spor endringer i det eksporterte Word-dokumentet. Dette betyr at content_json med tracked changes må konverteres til *ekte Word-XML tracked changes* (w:ins/w:del-elementer). Kommentarer eksporteres som Word-kommentarer. Dette er viktig både for arkivering og for brukere som ønsker å jobbe videre med dokumentet i Word.

### 6.3 Ytelse og robusthet

- Lastetesting: simuler 20 samtidige brukere per departement (SK-5).
- Store dokumenter: test med saker som har 10+ sider innhold.
- Feilhåndtering: autosave-feil, nettverksbrudd under lagring, konflikthåndtering.
- E2E-tester (Playwright): opprett sak → rediger dokument → lag endring → legg til kommentar → send til FIN → FIN vurderer → returer → FAG godtar endringer.

### 6.4 Brukertesting

Sprinten avsluttes med en brukertest med 5–8 brukere (3 FAG, 2–3 FIN, 1–2 budsjettenheten):

- **Oppgavebasert testing:** Brukerne utfører realistiske oppgaver (rediger sak, legg til kommentar, godta endringer).
- **SUS-spørreskjema:** Mål: score over 70 (SK-7).
- **Sammenligningstest:** Brukerne sammenligner opplevelsen med dagens Word-prosess.

### 6.5 Oppgaver og estimater

| # | Oppgave | Eier | Estimat | Dag |
|---|---------|------|---------|-----|
| 1 | Integrere spor endringer med saksflyt (statusbaserte moduser, retur) | Full-stack | 2d | 1–2 |
| 2 | Word-eksport med spor endringer (content_json → w:ins/w:del) | Backend | 3d | 1–3 |
| 3 | Word-eksport med kommentarer | Backend | 1d | 3 |
| 4 | E2E-tester med Playwright (full saksflyt) | QA | 2d | 4–5 |
| 5 | Lastetesting og ytelseoptimalisering | Backend + Frontend | 2d | 5–6 |
| 6 | Bugfixing og polering basert på intern testing | Team | 2d | 6–7 |
| 7 | Brukertesting med 5–8 brukere + SUS-spørreskjema | UX + Team | 2d | 8–9 |
| 8 | Dokumentasjon: API-docs, teknisk dokumentasjon, brukerguide | Team | 1d | 10 |

---

## 7. Risiko og mitigering

| ID | Risiko | Alvorlighet | Mitigering | Sprint |
|----|--------|-------------|------------|--------|
| R-6 | Egenutviklet spor endringer tar lengre tid enn estimert | Høy | Spike i uke 1 for å validere tilnærming. Fallback: versjonsdiff i stedet for live track changes. | 2.2 |
| R-7 | ProseMirror-skjema passer ikke alle sakstyper | Middels | Test med både satsingsforslag og budsjettiltak tidlig. Bygg fleksibilitet inn i skjemaet. | 2.1 |
| R-8 | Ytelse ved mange ventende endringer | Middels | Sett grense på ventende endringer per seksjon. Batch-godkjenning. | 2.2–2.4 |
| R-9 | Word-eksport med spor endringer er for kompleks | Middels | Prioriter eksport uten spor endringer først. Legg til spor endringer som «should have». | 2.4 |
| R-10 | Brukere finner dokumentopplevelsen forvirrende | Middels | Tidlig UX-testing i Sprint 2.1. Behold mulighet for «skjemavisning» som fallback. | 2.1 |
| R-11 | Kommentarankring bryter ved store redigeringer | Lav | Robust mapping gjennom ProseMirror marks. Orløse kommentarer som fallback. | 2.3 |

**Anbefalt risikohåndtering for R-6:** Start Sprint 2.2 med en 3-dagers spike der en utvikler bygger en minimal prototype av TrackChangesPlugin. Målet er å validere at tilnærmingen fungerer før resten av teamet investerer tid. Hvis spiken avdekker at ProseMirror-transaksjoner ikke gir tilstrekkelig kontroll, kan man pivotere til en versjonsdiff-basert løsning (sammenlign versjon N med versjon N-1) som gir 80% av verdien med 40% av innsatsen.

---

## 8. Klargjøring for samtidig redigering

Selv om samtidig redigering (US-17) ikke er i scope for denne planen, er det viktig at arkitekturen støtter det fra dag en. Følgende designbeslutninger sikrer at Yjs kan legges til senere uten refaktorering:

- **ProseMirror-skjemaet er Yjs-kompatibelt:** Alle noder og marks er definert med attributter som Yjs kan serialisere og synkronisere.
- **content_json lagrer ProseMirror-formatet:** Yjs produserer standard ProseMirror-dokumenter, så lagringslaget trenger ikke endres.
- **Spor endringer er uavhengig av synkronisering:** TrackChangesPlugin opererer på lokale transaksjoner. Når Yjs legges til, vil Yjs-transaksjoner også fanges av pluginen.
- **WebSocket-infrastruktur:** Selv om den ikke brukes for dokumentsynkronisering nå, bør backend forberedes med SignalR/.NET (eller Socket.IO/FastAPI) for å håndtere Yjs-meldinger senere.

Estimert tilleggsinnsats for å legge til samtidig redigering etter Fase 2: 3–4 uker.

---

## 9. Teknologioversikt

| Komponent | Teknologi | Rolle i Fase 2 |
|-----------|-----------|----------------|
| Rik tekst-editor | TipTap 2.x (ProseMirror) | Kjernekomponent for dokumentredigering |
| Dokumentskjema | ProseMirror Schema | Definerer caseDocument, caseSection, noder og marks |
| Spor endringer | Egenutviklet ProseMirror-plugin | Fanger transaksjoner, lagrer steps, visuell rendering |
| Kommentarer | ProseMirror marks + React-panel | Ankring til tekst, tråder, løs/lukk |
| Frontend | React 18 + TypeScript + Vite | SPA med dokumentlayout og sidepanel |
| UI-bibliotek | Aksel / Radix UI | Designsystem og tilgjengelige komponenter |
| State management | Zustand + React Query | Lokal state og servercache |
| Backend API | .NET 8 / FastAPI | REST API for dokumenter, endringer, kommentarer |
| Database | PostgreSQL 16 | JSONB for content_json, tracked_changes, comments |
| Word-eksport | Aspose.Words / docxtemplater | Konvertering av content_json til .docx med spor endringer |
| Forberedt for | Yjs + WebSocket | CRDT for fremtidig samtidig redigering (ikke implementert) |

---

## 10. Tidslinje og milepæler

| Uke | Sprint | Milepæl | Gate/beslutning |
|-----|--------|---------|-----------------|
| 1–3 | Sprint 2.1: Dokumentmodell | Sak vises som dokument med rik tekst | UX-godkjenning av layout |
| 4 | Sprint 2.2 spike | Validere TrackChangesPlugin-tilnærming | Go/no-go for egenutviklet spor endringer |
| 4–7 | Sprint 2.2: Spor endringer | Visuell diff med godta/avvis | Demo for produkteier |
| 7–9 | Sprint 2.3: Kommentarer + polish | Inline-kommentarer, WCAG-godkjent | |
| 10–11 | Sprint 2.4: Integrasjon + testing | Komplett løsning, brukertestet | SUS > 70, klart for pilot |

**Total estimert varighet:** 10–12 uker (2,5–3 måneder), i tråd med den opprinnelige faseinndelingen.

**Kritisk gate i uke 4:** Resultatet av spike for TrackChangesPlugin avgjør om vi fortsetter med egenutviklet spor endringer eller pivoter til versjonsdiff. Denne beslutningen må tas av Tech Lead og Produkteier sammen.
