# Utviklingsplan: Departementsliste-modul og tilleggsendringer

*Statsbudsjettportalen -- Februar 2026*
*Revidert etter gjennomgang av faktisk depliste-mal (DepXX_XX_Depliste_mars2027.docx)*

---

## 1. Analyse av den faktiske depliste-malen

Gjennomgangen av malen avdekker en mer kompleks og innholdsrik dokumentstruktur enn opprinnelig antatt. Her er de viktigste observasjonene som pavirker den tekniske designen.

### 1.1 Faktisk dokumenthierarki

Malen bruker et eget stilsett med prefiks "Depliste" som arver fra standard Word-overskrifter. Den nummererte strukturen folger monsteret 1 / 1.1 / 1.1.1 / 1.1.2, der nummereringen drives av Words innebygde flerniva-lister. Det fulle hierarkiet i malen er:

```
Deplisteoverskrift1: "XXdepartementet"                          -- Nivaa 1 (16pt, bold)
  [TABELL: Strengt fortrolig-boks]
  Deplisteoverskrift2: "Mal, status og prioriteringer ..."      -- Nivaa 1.1 (14pt, bold)
    [Deplistetabell-tittel + TABELL: Mal og statusvurdering]
    [TABELL: Sektordiagrammer med budsjettall - to figurer side om side]
    Overskrift7: "Overordnet om strukturarbeid ..."             -- Umerket seksjon
    Deplisteoverskrift3: "Utdypende om utvalgte ..."            -- Nivaa 1.1.1 (14pt, bold)
  Deplisteoverskrift2: "Beslutninger om 2027-budsjettet"        -- Nivaa 1.2
    [FIGUR: Stolpediagram med budsjettendringer]
    [Deplistefigur-tittel: caption under figuren]
    Deplisteoverskrift3: "Innsparingstiltak"                    -- Nivaa 1.2.1
      [Deplistetabell-tittel + referanse til FIA-rapport]
      Overskrift5: "Omtale av innsparingstiltak pa A-listen"    -- Gruppering
        Overskrift7: "Beskrivelse av innsparingstiltaket"       -- Enkelt tiltak
      Overskrift5: "Omtale av innsparingstiltak pa B-listen"    -- Gruppering
        [Enkelt tiltak som vanlig avsnitt]
    Deplisteoverskrift3: "Satsingsforslag"                      -- Nivaa 1.2.2
      [Friteksavsnitt: "FIN tilraar at det fores ..."]
      [Deplistetabell-tittel: tabell med satsingsforslag]
      Overskrift5: "Omtale av satsingsforslag pa A-listen"      -- Gruppering
        Overskrift7: "XXs pri. # Beskrivelse av forslag"        -- Enkelt forslag
          [Avsnitt: "XXs forslag: ##,# mill. kroner"]
          [Avsnitt: "FINs tilraading: ##,# mill. kroner"]
      Overskrift5: "Omtale som ikke fores pa A-listen"          -- Gruppering
  Deplisteoverskrift2: "Andre viktige beslutninger"             -- Nivaa 1.3
    Deplisteoverskrift3: "Sak 1"                                -- Nivaa 1.3.1
      [Avsnitt: "Konklusjon:"]
      [Konklusjonbokstavert: bokstaverte konklusjonspunkter]
    Deplisteoverskrift3: "Sak 2"                                -- Nivaa 1.3.2
  Deplisteoverskrift2: "Omtalesaker"                            -- Nivaa 1.4
    Deplisteoverskrift3: "Sak 1"                                -- Nivaa 1.4.1
    Deplisteoverskrift3: "Sak 2"                                -- Nivaa 1.4.2
```

### 1.2 Spesifikke elementer som krever oppmerksomhet

**Egne "Depliste"-stiler.** Malen bruker ikke standard Heading1/2/3 direkte, men egne stiler (`Deplisteoverskrift1`, `Deplisteoverskrift2`, `Deplisteoverskrift3`, `Deplisteoverskrift4`) som arver fra de tilsvarende standard-overskriftene. I tillegg finnes `Deplistetabell-tittel`, `Deplistefigur-tittel` og `Deplistetittel-ramme`. Dette betyr at Word-eksportfunksjonen ma kunne skrive ut med akkurat disse stilene, ikke generiske overskrifter.

**Flerniva nummerering.** Overskriftene har automatisk nummerering (1, 1.1, 1.1.1, 1.2.2 osv.) drevet av en Word numbering list (`abstractNum` med format `%1`, `%1.%2`, `%1.%2.%3`). WYSIWYG-visningen i portalen ma gjenskape denne nummereringen, enten gjennom CSS counters eller ved a beregne numrene pa serversiden.

**Tabeller med spesialinnhold.** Malen inneholder tre ulike tabelltyper: en "strengt fortrolig"-boks (rammetabell overst), en mal/statusvurderingstabell med trafikklys-ikoner, og en todelt celle med sektordiagram og stolpediagram side om side. Alle bruker stilen "Tabellrutenett".

**Figurer som bilder.** Diagrammene (sektordiagram, stolpediagram) er satt inn som PNG-bilder med tilhorende `Deplistefigur-tittel`. De er ikke dynamiske diagrammer -- de er statiske bilder. Dette forenkler figur-funksjonen: portalen trenger kun a stotte bildeopplasting, ikke diagramgenerering.

**A-liste / B-liste-gruppering.** Saker grupperes under overskrifter som "Omtale av innsparingstiltak som helt eller delvis fores pa A-listen" og "...pa B-listen". Denne grupperingen styres av et attributt pa saken (A- eller B-liste-tilhorighet) og er ikke en sakstype i seg selv, men en underkategorisering innenfor en seksjon.

**Konklusjonspunkter.** Stilen `Konklusjonbokstavert` er en egen avsnittsstil med bold tekst og bokstavnummerering (a, b, c). Disse representerer formelle konklusjoner knyttet til en sak og ma stettes som en egen innholdstype i editoren.

**Malens font-oppsett.** Tema-fonten er Calibri (brodtekst) og Calibri Light (overskrifter). Normal-stilen er 12pt (sz=24 i half-points). Overskrift 1 er 16pt, overskrift 2 og 3 er 14pt, overskrift 5 og 7 er 12pt bold.

### 1.3 Implikasjoner for utviklingsplanen

Den opprinnelige planen antok en enklere hierarkisk struktur (kapitler -> underkapitler -> saksplasser). Malen viser at virkeligheten er vesentlig mer nyansert:

Malens struktur er *ikke rent hierarkisk* -- den har en blanding av forhandsdefinerte seksjoner (overordnet innledning, figurer) og repeaterbare saksomrader med intern gruppering (A-liste/B-liste). Enkelte seksjoner har fast innhold (tabeller med mal og statusvurdering), mens andre fylles med saker.

Sakene har ulikt innhold avhengig av plassering. Under "Satsingsforslag" vises prioritering, departementets forslag og FINs tilraading. Under "Andre viktige beslutninger" vises konklusjonstekst med bokstaverte punkter. Under "Omtalesaker" er innholdet minimalt.

Dette krever at malsystemet er mer fleksibelt enn opprinnelig planlagt -- det ma stotte seksjonsspesifikke innholdsblokker med egne renderingsregler.

---

## 2. Revidert design for Departementsliste-modulen

### 2.1 Revidert malkonfigurasjon

Basert pa den faktiske malen revideres datamodellen for maldefinisjonen. Hovedendringen er at seksjoner naa har mer detaljert typeinformasjon og kan definere seksjonsspesifikke renderingsregler.

**Revidert datamodell:**

```
department_list_templates
  id                  UUID PK
  name                VARCHAR(200)       -- "Marskonferansen 2027"
  budget_round_type   VARCHAR(20)        -- "mars", "august", "rnb"
  department_name_placeholder VARCHAR(50) DEFAULT 'XX'  -- Erstattes med dep.navn
  is_active           BOOLEAN
  classification_text TEXT               -- "STRENGT FORTROLIG jf. ..."
  created_by          UUID FK
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ

department_list_template_sections
  id                  UUID PK
  template_id         UUID FK
  parent_id           UUID FK -> self (nullable)
  title_template      VARCHAR(500)       -- "Mal, status og prioriteringer for firearsperioden"
                                         -- Kan inneholde plassholdere: {department_name}
  heading_style       VARCHAR(40)        -- "Deplisteoverskrift1", "Deplisteoverskrift2",
                                         -- "Deplisteoverskrift3", "Overskrift5", "Overskrift7"
  section_type        VARCHAR(40)        -- Se liste under
  sort_order          INT
  config              JSONB              -- Seksjonsspesifikk konfigurasjon (se under)
```

**Seksjonstyper (`section_type`):**

| Type | Beskrivelse | Eksempel i malen |
|------|-------------|-----------------|
| `department_header` | Departementsnavnet som toppoverskrift + fortrolig-boks | "XXdepartementet" |
| `fixed_content` | Forhandsdefinert innhold (tabeller, figurer, fritekst) som admin skriver inn | Mal/statusvurdering, budsjettfigurer |
| `figure_placeholder` | Plass for figur (PNG/SVG) med caption | Stolpediagrammet pa side 2 |
| `case_group` | Saker av en bestemt type grupperes her | "Innsparingstiltak", "Satsingsforslag" |
| `case_subgroup` | Underkategorisering innenfor en case_group | "A-listen", "B-listen" |
| `case_entry_template` | Mal for hvordan en enkelt sak rendres inne i gruppen | Overskrift + belop + omtale |
| `decisions_section` | Saker som krever konklusjonspunkter | "Andre viktige beslutninger" |
| `summary_section` | Saker med minimal omtale | "Omtalesaker" |
| `freetext` | Ren fritekstseksjon | Innledende avsnitt |
| `auto_table` | Tabell som genereres automatisk fra saksdata | Oppsummeringstabell med satsingsforslag |

**Seksjonsspesifikk konfigurasjon (`config` JSONB):**

For `case_group`:
```json
{
  "case_type_filter": "satsingsforslag",
  "subgroup_field": "fin_list_placement",
  "subgroups": [
    {"value": "a_list", "title": "Omtale av satsingsforslag som helt eller delvis fores pa A-listen"},
    {"value": "b_list", "title": "Omtale av satsingsforslag som ikke fores pa A-listen"}
  ],
  "intro_text_template": "FIN tilraar at det fores satsingsforslag pa til sammen {total_amount} mill. kroner pa A-listen under {department_name}.",
  "summary_table": true
}
```

For `case_entry_template`:
```json
{
  "heading_format": "{department_abbrev}s pri. {priority} {case_name}",
  "fields": [
    {"key": "proposal_text", "render_as": "paragraph"},
    {"key": "amount", "render_as": "inline", "format": "{department_abbrev}s forslag: {value} mill. kroner"},
    {"key": "fin_amount", "render_as": "inline", "format": "FINs tilraading: {value} mill. kroner fores pa A-listen"}
  ]
}
```

For `decisions_section`:
```json
{
  "has_conclusion": true,
  "conclusion_style": "Konklusjonbokstavert",
  "conclusion_numbering": "alphabetic",
  "fields": [
    {"key": "description", "render_as": "paragraph"},
    {"key": "fin_r_conclusion", "render_as": "conclusion_list"}
  ]
}
```

Denne konfigurasjonen lar admin tilpasse malen uten kodeendringer, men gir samtidig nok struktur til at systemet vet hvordan det skal rendre og eksportere innholdet. Admin-grensesnittet bygges som en visuell editor der admin ser en forhandsvisning av dokumentstrukturen mens de konfigurerer seksjonene.

### 2.2 Nytt felt pa saker: A/B-liste-plassering

Malen viser at saker innenfor en kategori (satsingsforslag, innsparingstiltak) grupperes etter om de er pa A-listen eller B-listen. Dette krever et nytt felt pa `cases`-tabellen:

```sql
ALTER TABLE cases ADD COLUMN fin_list_placement VARCHAR(20);
-- Verdier: 'a_list', 'b_list', null (for saker der det ikke er relevant)

ALTER TABLE cases ADD COLUMN priority_number INT;
-- Departementets prioriteringsnummer (for "XXs pri. 1 ...")
```

Disse feltene settes av FIN under saksbehandlingen og brukes av depliste-modulen for korrekt plassering og nummerering.

### 2.3 Nytt felt: Konklusjonspunkter

Malen viser at saker under "Andre viktige beslutninger" har formelle konklusjonspunkter med bokstavnummerering. Dette er et eget datastruktur-element:

```sql
CREATE TABLE case_conclusions (
    id          UUID PK DEFAULT gen_random_uuid(),
    case_id     UUID FK -> cases,
    sort_order  INT,
    text        TEXT NOT NULL,
    created_by  UUID FK -> users,
    created_at  TIMESTAMPTZ DEFAULT now()
);
```

I TipTap-editoren representeres konklusjonspunkter som en egendefinert nodeliste (`conclusionList` med `conclusionItem`-barn) som rendres med bokstavnummerering og bold tekst. Ved eksport til Word brukes stilen `Konklusjonbokstavert`.

### 2.4 Revidert databasemodell for depliste-instanser

Modellen fra forrige plan beholdes i hovedsak, men utvides med stotte for malens kompleksitet:

```
department_lists                  -- (uendret fra forrige plan)
department_list_sections          -- (uendret fra forrige plan, men med mer config)

department_list_case_entries
  id                UUID PK
  department_list_id UUID FK
  section_id        UUID FK
  case_id           UUID FK -> cases
  subgroup          VARCHAR(20)    -- 'a_list', 'b_list' (hentet fra case.fin_list_placement)
  sort_order        INT
  override_content  JSONB          -- TipTap JSON (null = bruk saksdata)
  included_at       TIMESTAMPTZ

department_list_figures
  id                UUID PK
  department_list_id UUID FK
  section_id        UUID FK        -- Hvilken seksjon figuren tilhorer
  file_url          VARCHAR(500)   -- Blob storage URL
  file_type         VARCHAR(10)    -- 'png', 'svg'
  caption           TEXT
  width_percent     INT DEFAULT 100 -- Bredde i prosent av tilgjengelig plass
  sort_order        INT
  uploaded_by       UUID FK
  uploaded_at       TIMESTAMPTZ
```

### 2.5 WYSIWYG-visning: ProseMirror-skjema

ProseMirror-skjemaet ma gjenspeile malens stilhierarki:

```
depListDocument
  +-- depListHeader           (attrs: departmentName, classification)
  +-- depListSection          (attrs: headingStyle, sectionType, templateSectionId)
  |     +-- depListHeading    (attrs: level, autoNumber, editable: false for malseksjoner)
  |     +-- depListContent    (rik tekst: avsnitt, bold, kursiv, lister)
  |     +-- depListTable      (for fixed_content-tabeller)
  |     +-- depListFigure     (attrs: src, caption, fileType)
  |     +-- depListCaseGroup
  |           +-- depListIntroText     (generert fra mal-template, redigerbar)
  |           +-- depListAutoTable     (generert fra saksdata)
  |           +-- depListSubgroup      (attrs: title, listPlacement)
  |                 +-- depListCaseEntry  (attrs: caseId, templateSectionId)
  |                       +-- depListCaseHeading  (generert fra heading_format)
  |                       +-- depListCaseField    (attrs: fieldKey, renderAs)
  |                       +-- depListConclusionList
  |                             +-- depListConclusionItem
  +-- depListSection ...
```

**Nummereringssystem i WYSIWYG:** Overskriftsnummereringen (1, 1.1, 1.1.1) beregnes pa serversiden basert pa hierarkisk posisjon og injiseres som attributter pa `depListHeading`. I frontend rendres de som `:before`-pseudoelementer via CSS, slik at de ser riktige ut men ikke er redigerbare.

**Stilmapping for CSS:** Hver depliste-stil mapper til en CSS-klasse som gjenspeiler Word-malets typografi:

| Word-stil | CSS-klasse | Typografi |
|-----------|-----------|-----------|
| Deplisteoverskrift1 | `.dl-h1` | Calibri Light 16pt bold |
| Deplisteoverskrift2 | `.dl-h2` | Calibri Light 14pt bold |
| Deplisteoverskrift3 | `.dl-h3` | Calibri Light 14pt bold |
| Overskrift5 | `.dl-h5` | Calibri 12pt bold |
| Overskrift7 | `.dl-h7` | Calibri 12pt bold underline |
| Normal | `.dl-body` | Calibri 12pt |
| Deplistetabell-tittel | `.dl-table-title` | Calibri 12pt |
| Deplistefigur-tittel | `.dl-fig-title` | Calibri 12pt |
| Konklusjonbokstavert | `.dl-conclusion` | Calibri 12pt bold, bokstavnummerert |

### 2.6 Word-eksport med korrekte stiler

Eksportfunksjonen ma produsere Word-dokumenter med akkurat de Depliste-stilene som malen definerer. Den mest robuste tilnaermingen er **template-basert eksport**: backend bruker selve Word-malen (.dotx/.docx) som utgangspunkt og fyller inn innhold, i stedet for a bygge dokumentet fra bunnen.

Flyten:

1. Backend laster den opprinnelige Word-malen fra blob storage (den samme filen som er lastet opp her).
2. Malen pakkes ut (unzip), og `document.xml` parses.
3. For hver seksjon i depliste-instansen: backend finner tilsvarende plassholder i malens XML og erstatter/utvider med faktisk innhold.
4. Figurer legges til i `word/media/` og refereres korrekt i XML.
5. Dokumentet pakkes opp igjen som .docx.

Denne tilnaermingen sikrer at alle stiler, nummereringsdefinisjoner, headers, footers og klassifiseringsbokser er korrekte uten at backend ma gjenskape dem programmatisk.

### 2.7 Eksportkrav for generell Word/Excel-eksport

Notert: Eksportert Word fra sakslister skal bruke Calibri 12pt som standard brodtekstfont, med storre storrelser for overskrifter (folger malens oppsett: 16pt for H1, 14pt for H2/H3). Dette legges inn som standard-konfigurasjon i `export_templates`:

```json
{
  "font": "Calibri",
  "body_size_pt": 12,
  "heading1_size_pt": 16,
  "heading2_size_pt": 14,
  "heading3_size_pt": 14,
  "heading_font": "Calibri Light"
}
```

---

## 3. Sprint 0: Ressurslasing og inaktivitetshandtering

Samtidig redigering (Yjs/CRDT) er ikke implementert enda, og det finnes i dag ingen mekanisme som hindrer at to brukere redigerer samme sak eller departementsliste samtidig. Dagens save-endepunkt inkrementerer versjonsnummeret uten a sjekke om en annen bruker har lagret i mellomtiden, noe som betyr at den som lagrer sist stille overskriver den forste. Dette ma fikses for noe annet bygges, fordi bade enkeltsaker og departementslister er utsatt for konflikter.

### 3.1 Mekanisme 1: Pessimistisk soft lock

Nar en bruker apner en sak eller departementsliste i redigeringsmodus, tar klienten en las (lease) via et API-kall. Andre brukere som forsker a apne samme ressurs far se innholdet i read-only-modus og far en tydelig melding om hvem som redigerer. Lasen fornyes automatisk via heartbeat sa lenge brukerens nettleservindu er aktivt.

**Databasemodell:**

```sql
CREATE TABLE resource_locks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type   VARCHAR(30) NOT NULL,    -- 'case', 'department_list'
    resource_id     UUID NOT NULL,
    locked_by       UUID NOT NULL REFERENCES users(id),
    locked_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL,    -- locked_at + 5 min
    last_heartbeat  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(resource_type, resource_id)
);

CREATE INDEX idx_resource_locks_expiry ON resource_locks(expires_at);
```

**API-endepunkter:**

```
POST   /api/locks                    -- Acquire lock: { resourceType, resourceId }
                                     -- Returnerer 200 + lock-info, eller 409 + info om hvem som har lasen
PUT    /api/locks/{id}/heartbeat     -- Fornyer expires_at med 5 nye minutter
DELETE /api/locks/{id}               -- Frigjor lasen eksplisitt (ved lukking/navigering bort)
GET    /api/locks?resourceType=...&resourceId=...  -- Sjekk om ressurs er last
```

Acquire-logikken gjor folgende i en enkelt transaksjon: slett eventuelle utlopte laser (`expires_at < now()`), forsok a sette inn ny las, returner 409 med eksisterende las-info hvis `UNIQUE`-constraintet feiler.

**Frontend-integrasjon:**

Nar `CaseDetailPage` eller `DepartmentListPage` mountes i redigeringsmodus, kalles `POST /api/locks`. Hvis lasen tas, starter en heartbeat-timer som kaller `PUT /api/locks/{id}/heartbeat` hvert 60. sekund. Hvis lasen ikke kan tas (409), vises editoren i read-only-modus med en banner overst: "[Navn] redigerer denne [saken/departementslisten]. Du kan se innholdet, men ikke gjore endringer." Banneren inkluderer et tidspunkt for nar lasen ble tatt og en "Varsle meg nar den er ledig"-knapp som bruker polling eller WebSocket.

Ved `beforeunload` (lukking av fane/navigering bort) kalles `DELETE /api/locks/{id}` via `navigator.sendBeacon` for palitelig opprydding.

### 3.2 Mekanisme 2: Optimistisk versjonssjekk (sikkerhetsnett)

Selv med soft lock kan det oppsta race conditions (f.eks. las utloper akkurat idet noen lagrer). Derfor ma save-endepunktene ogsa validere versjon.

Endring i eksisterende `PUT /api/cases/{id}/document` og fremtidige depliste-endepunkter:

```
// Klienten sender med expected_version i request body
if (dto.ExpectedVersion != currentMaxVersion)
    return Conflict(new {
        message = "En annen bruker har lagret endringer siden du startet redigeringen.",
        currentVersion = currentMaxVersion,
        yourVersion = dto.ExpectedVersion
    });
```

Frontend viser ved 409-svar en konflikthanterings-dialog: "Endringene dine kunne ikke lagres fordi [Navn] har lagret en ny versjon. Du kan se den nye versjonen og kopiere dine endringer manuelt." Dialogen viser diffen mellom brukerens dokument og den nye versjonen.

### 3.3 Mekanisme 3: Inaktivitets-timeout med auto-lagring

Etter 5 minutter uten brukeraktivitet (tastaturtrykk, musebevegelse, scroll inne i editoren) skal brukeren automatisk kastes ut av redigeringsmodus. Flyten er:

**Inaktivitetsovervaking:** En `useIdleTimer`-hook sporser siste aktivitetshendelse i editoren. Etter 4 minutter vises en advarsel: "Du har vaert inaktiv i 4 minutter. Saken vil lukkes for redigering om 1 minutt." Advarselen har en "Forbli aktiv"-knapp som nullstiller timeren. Enhver brukerinteraksjon i editoren nullstiller ogsa timeren automatisk.

**Ved timeout (5 minutter):** Hooken utforer folgende sekvens:

1. Sjekk om det finnes ulagrede endringer (sammenlign navaerende dokument-JSON med sist lagrede versjon).
2. Hvis det finnes ulagrede endringer: forsok a lagre via det vanlige save-endepunktet, inkludert `expected_version`.
3. Hvis lagringen lykkes: bra -- endringene er tatt vare pa.
4. Hvis lagringen feiler med 409 (versjonskonflikt): endringene forkastes. Begrunnelse: en annen bruker har allerede tatt over og lagret, og a tvinge inn endringer fra en inaktiv bruker ville overskrive aktivt arbeid. Brukeren far en melding om at endringene ikke ble lagret pa grunn av konflikt.
5. Uavhengig av om lagringen lyktes: frigi lasen (`DELETE /api/locks/{id}`), sett editoren til read-only, og vis en melding: "Du ble logget ut av redigeringsmodus pa grunn av inaktivitet. [Endringene ble lagret. / Endringene ble ikke lagret fordi en annen bruker har gjort endringer.]"

**Sammenheng med heartbeat:** Heartbeat-timeren stopper nar inaktivitets-timeout intreffer. Dermed utloper lasen naturlig ogsa pa serversiden, selv om `DELETE`-kallet av en eller annen grunn ikke nar frem.

**Konfigurasjon:** Inaktivitetstiden (5 minutter) og advarselsperioden (1 minutt for) bor vaere konfigurerbare via miljovariabel eller admin-innstilling, slik at det kan justeres etter brukertesting.

### 3.4 Frontend-komponent: `useResourceLock`

Hele las-logikken samles i en gjenbrukbar React-hook:

```typescript
const {
  isLocked,           // true = vi har lasen
  lockHolder,         // null | { userId, fullName, lockedAt } -- info om hvem som har lasen
  isReadOnly,         // true = noen andre har lasen, eller vi ble kastet ut
  idleWarning,        // true = advarselen om inaktivitet vises
  unsavedChanges,     // true = det finnes ulagrede endringer
  idleKickReason,     // null | 'saved' | 'conflict' | 'no_changes' -- arsak til utkasting
  dismissIdleKick,    // () => void -- lukk meldingen etter utkasting
  acquire,            // () => Promise<boolean> -- forsok a ta lasen
  release,            // () => Promise<void> -- frigi lasen
  stayActive,         // () => void -- nullstill inaktivitetstimer
} = useResourceLock({
  resourceType: 'case',  // eller 'department_list'
  resourceId: caseId,
  idleTimeoutMs: 5 * 60 * 1000,
  warningBeforeMs: 60 * 1000,
  heartbeatIntervalMs: 60 * 1000,
  onSaveBeforeKick: () => saveDocument(currentContent, expectedVersion),
});
```

Hooken brukes i bade `CaseDetailPage` og den fremtidige `DepartmentListPage`, slik at oppforselen er konsistent.

### 3.5 Oppgaver og estimat for Sprint 0

| # | Oppgave | Eier | Estimat |
|---|---------|------|---------|
| 1 | Databasemigrering: `resource_locks`-tabell | Backend | 0.5d |
| 2 | Backend: `ResourceLockService` med acquire/release/heartbeat/cleanup | Backend | 1.5d |
| 3 | Backend: API-kontroller for las-endepunkter | Backend | 0.5d |
| 4 | Backend: Versjonssjekk i `SaveDocument` og `SaveCase` (409 Conflict) | Backend | 1d |
| 5 | Backend: Bakgrunnsjobb for opprydding av utlopte laser | Backend | 0.5d |
| 6 | Frontend: `useResourceLock`-hook med heartbeat og idle-timer | Frontend | 2d |
| 7 | Frontend: Lock-banner ("Redigeres av ...") og read-only-fallback | Frontend | 1d |
| 8 | Frontend: Inaktivitets-advarsel (countdown-dialog) | Frontend | 0.5d |
| 9 | Frontend: Auto-lagring ved timeout inkl. konflikthanterings-dialog | Frontend | 1d |
| 10 | Frontend: Conflict-dialog ved 409 pa vanlig lagring | Frontend | 1d |
| 11 | Integrasjonstest: to samtidige brukere, timeout-flyt, konfliktscenario | Full-stack | 1d |

**Totalt: ~5 dager (1 uke)**

### 3.6 Akseptansekriterier

Nar bruker A apner en sak for redigering og bruker B forsker a redigere samme sak, ser bruker B en read-only-visning med info om at bruker A redigerer. Nar bruker A lukker saken, kan bruker B ta over redigeringen. Nar bruker A er inaktiv i 4 minutter, ser bruker A en advarsel om at saken lukkes om 1 minutt. Nar bruker A er inaktiv i 5 minutter, lagres eventuelle ulagrede endringer automatisk (med mindre det er versjonskonflikt), lasen frigis, og editoren settes til read-only. Ved versjonskonflikt under auto-lagring forkastes endringene med en tydelig melding. Ved versjonskonflikt under manuell lagring vises en dialog med forklaring. Hele mekanismen gjelder bade for enkeltsaker og departementslister.

---

## 4. Revidert sprintplan

### Oppgave A: Departementsliste-modul

| Sprint | Fokus | Varighet | Leveranse |
|--------|-------|----------|-----------|
| 0 | Ressurslasing og inaktivitetshantedring | 1 uke | Soft lock, versjonssjekk, idle timeout, auto-save, useResourceLock |
| A.1 | Datamodell, nye felter, admin-mal | 2.5 uker | Migreringer, API for maler med config, admin-side, seed med realistisk marskonferanse-mal |
| A.2 | Automatisk innflyt + saksfelter | 1.5 uke | Event-handler, A/B-liste-felt, konklusjonspunkter, plassering i subgrupper |
| A.3 | WYSIWYG-visning | 3.5 uker | TipTap-dokument med fullt ProseMirror-skjema, nummerering, stilmapping, toveis synk |
| A.4 | Figurer, tabeller og polish | 2 uker | Bildeopplasting (PNG/SVG), caption, auto-genererte tabeller, "strengt fortrolig"-boks, dokumentfolelse |
| A.5 | Template-basert Word-eksport | 2 uker | Eksport via den opprinnelige Word-malen, figurer i eksport, PDF-generering |
| A.6 | Integrasjon og testing | 1 uke | E2E-test med realistiske data, brukertesting |

**Totalt oppgave A inkl. Sprint 0: ~13.5 uker** (Sprint 0: 1 uke + A.1-A.6: 12.5 uker)

**Sprint A.1 (2.5 uker) -- Datamodell og admin-mal:**

Skriv databasemigreringer for alle nye og reviderte tabeller inkludert `department_list_templates`, `department_list_template_sections` med JSONB config, `case_conclusions`, samt nye felt pa `cases` (`fin_list_placement`, `priority_number`). Implementer backend-API for malopprettelse og -redigering med full JSONB-config-stotte. Bygg admin-side med trelignende editor der admin kan legge til seksjoner, velge seksjonstype, definere case_type_filter, velge felter og konfigurere renderingsregler. Skriv seed-data som gjenskaper den faktiske marskonferanse-malen som er lastet opp.

Akseptansekriterier: Admin kan opprette en mal som gjenspeiler den faktiske depliste-strukturen. Malen kan lagres og hentes med all konfigurasjon intakt. Seed-dataen produserer en mal som matcher den opplastede Word-filen.

**Sprint A.2 (1.5 uke) -- Automatisk innflyt:**

Utvid WorkflowEngine med `fin_list_placement`- og `priority_number`-felter i saksbehandlings-UI. Implementer DepartmentListService som plasserer saker i riktig seksjon og subgruppe basert pa sakstype og A/B-plassering. Bygg konklusjonspunkt-funksjonalitet (CRUD) i saksdetalj-visningen. Skriv integrasjonstester som verifiserer at en sak med type "satsingsforslag" og `fin_list_placement = 'a_list'` havner under riktig subgruppe.

**Sprint A.3 (3.5 uker) -- WYSIWYG-visning:**

Uke 1: Definer komplett ProseMirror-skjema med alle nodetyper. Bygg rendering-logikk som tar depliste-data fra API og konstruerer TipTap-dokument. Implementer CSS-stilmapping med korrekt typografi (Calibri, storrelser, bold/underline etter malens spesifikasjon). Implementer overskriftsnummerering via CSS counters.

Uke 2: Implementer redigerbarhet for fritekstseksjoner og saksomtaler. Bygg toveis synkronisering: endring i depliste-felter skrives tilbake til `case_content` via API. Implementer "nesten usynlige" feltgrenser (subtil border-bottom ved hover, ingen synlig grense ellers).

Uke 3: Bygg auto-genererte oppsummeringstabeller (satsingsforslag-tabell med belop). Implementer konklusjonsliste-rendering med bokstavnummerering. Bygg sidepanel med innholdsfortegnelse og navigasjon. Uke 3.5: Testing og bugfiks.

**Sprint A.4 (2 uker) -- Figurer, tabeller og polish:**

Bygg TipTap-extension for figurer (DepListFigure) med caption og SVG/PNG-stotte. Implementer API for bildeopplasting. Bygg "strengt fortrolig"-boksen som et fast header-element. Implementer tabell-rendering for faste innholdstabeller (mal/statusvurdering). Polering: print-vennlig visning, scroll-opplevelse, A4-dokumentfolelse med marger og skygge. Sikre at hele WYSIWYG-opplevelsen folger Calibri-typografien fra malen.

**Sprint A.5 (2 uker) -- Template-basert Word-eksport:**

Implementer template-basert eksport der den opplastede Word-malen brukes som utgangspunkt. Bygg XML-manipulering som setter inn innhold i riktige posisjoner med korrekte Depliste-stiler. Handter figurer (kopier til `word/media/`, opprett relasjoner). Handter auto-genererte tabeller. Generer PDF via LibreOffice-konvertering. Test eksporterte dokumenter i Word for a verifisere stiler, nummerering og layout.

**Sprint A.6 (1 uke) -- Integrasjon og testing:**

E2E-test med et realistisk scenario: opprett 10-15 saker med ulike typer, la dem flyte inn i deplisten, rediger i deplisten, eksporter til Word. Verifiser toveis synkronisering. Verifiser Word-eksport mot den opprinnelige malen. Gjennomfor brukertesting med 2-3 FIN-brukere.

### Oppgave B: Dokumentvisning pa enkeltsaker

Uendret fra opprinnelig plan. 4 dager. En fullskjerm read-only dokumentvisning med frosted glass bakgrunn, tilgjengelig via knapp oppe til hoyre i saksdetaljvisningen.

### Oppgave C: Word/Excel-eksport av sakslister

Omfanget er likt, men med oppdatert formateringsspesifikasjon:

Word-eksport bruker Calibri 12pt for brodtekst, Calibri Light for overskrifter (16pt H1, 14pt H2). Eksportmalen lagrer disse preferansene i `formatting`-feltet og admin kan justere dem. Excel-eksport folger standard konvensjoner (Calibri 11pt i celler, bold overskriftsrad).

Estimat: 2 uker (uendret).

---

## 5. Samlet revidert estimat og tidsplan

| Oppgave | Forrige revisjon | Revidert | Endring |
|---------|-----------------|----------|---------|
| Sprint 0: Ressurslasing | (ikke planlagt) | 1 uke | Ny |
| A: Departementsliste-modul | 12.5 uker | 12.5 uker | Uendret |
| B: Dokumentvisning | 4 dager | 4 dager | Uendret |
| C: Word/Excel-eksport | 2 uker | 2 uker | Uendret |
| Integrasjon og buffer | 1.5 uke | 1.5 uke | Uendret |
| **Totalt (med parallellisering)** | **~13 uker** | **~14 uker** | **+1 uke** |

Sprint 0 gjores forst og legger grunnlaget for alt redigeringsarbeid. Oppgave B og C kan fortsatt parallelliseres med A.

---

## 6. Oppdaterte risikoer

**Soft lock og brukeropplevelse (Sprint 0).** Pessimistisk lasing kan oppfattes som frustrerende dersom brukere ofte "glemmer" a lukke saker og dermed blokkerer andre. 5-minutters inaktivitets-timeout er designet for a motvirke dette, men verdien ma valideres med brukerne -- noen kan oppleve den som for aggressiv i perioder med mye lesing og tenking. Tiltak: gjor timeout konfigurerbar, og bruk advarselsperioden (1 minutt for) aktivt for a gi brukerne sjanse til a reagere. Vurder om visse typer aktivitet (scrolling, markering av tekst) ogsa skal telle som aktivitet.

**Auto-lagring ved konflikt (Sprint 0).** Beslutningen om a forkaste ulagrede endringer ved versjonskonflikt under inaktivitets-timeout er riktig fra et dataintegritetsperspektiv, men kan overraske brukere som ikke forstar at noen andre har redigert. Tiltak: meldingen ma vaere veldig tydelig og inkludere informasjon om hvem som lagret og nar, slik at brukeren forstaar situasjonen.

**Template-basert Word-eksport (A.5).** Den sterkeste endringen fra opprinnelig plan er at eksportfunksjonen baserer seg pa a manipulere den faktiske Word-malens XML i stedet for a bygge dokumentet fra bunnen. Dette er riktig tilnaerming fordi malens stiler, nummereringsdefinisjoner og header/footer-oppsett er for komplekse til a gjenskape programmatisk. Risikoen er at XML-manipuleringen kan vaere skar -- spesielt for a handtere Words flerniva-nummerering korrekt. Tiltak: lag en spike/prototype tidlig (i sprint A.1) der man fyller inn en enkelt sak i malen og verifiserer at nummereringen fortsatt fungerer.

**A/B-liste som nytt konsept (A.2).** Innforingen av `fin_list_placement` som et nytt felt krever at det legges inn i FINs saksbehandlings-UI pa en intuitiv mate. Det ma vaere klart for brukeren hva A-listen og B-listen betyr, og nar feltet skal settes. Tiltak: diskuter med produkteier om dette skal vaere et eget felt eller en del av statusflyten.

**Kompleksitet i ProseMirror-skjema (A.3).** Skjemaet for deplisten har mange ulike nodetyper med spesialisert oppforsel (redigerbare vs. ikke-redigerbare, automatisk genererte vs. manuelle, databasekoblede vs. frie). Risikoen for feil i skjema-definisjonen er hoy. Tiltak: lag en standalone prototype av skjemaet med hardkodede data for a validere tilnaermingen for editoren tar inn databasekoblede data.

---

## 7. Nye og oppdaterte brukerhistorier

| ID | Brukerhistorie | Akseptansekriterier |
|----|---------------|---------------------|
| US-34 | Som saksbehandler onsker jeg at saker og departementslister lases nar noen redigerer dem, slik at vi ikke overskriver hverandres arbeid. | Bruker A redigerer -> bruker B ser read-only med info om hvem som redigerer. Lasen frigis ved lukking eller navigering bort. |
| US-35 | Som saksbehandler onsker jeg a bli kastet ut av redigeringsmodus etter 5 minutters inaktivitet, slik at jeg ikke blokkerer andre. | Advarsel etter 4 minutter. Utkasting etter 5 minutter. Ulagrede endringer lagres automatisk (med mindre versjonskonflikt). |
| US-36 | Som saksbehandler onsker jeg a fa tydelig beskjed hvis mine endringer ikke kan lagres fordi en annen bruker har lagret i mellomtiden. | 409-dialog viser hvem som lagret og nar. Brukeren kan se den nye versjonen. |

| ID | Brukerhistorie | Akseptansekriterier |
|----|---------------|---------------------|
| US-25 | Som admin onsker jeg a konfigurere malen for departementslisten med seksjonstyper, feltvalg og renderingsregler, slik at malen gjenspeiler det faktiske dokumentformatet. | Admin kan opprette en mal som matcher den opplastede depliste-malen. Konfigurasjonen inkluderer sakstype-filtre, subgrupper (A/B-liste) og seksjonsspesifikke renderingsformater. |
| US-26 | Som FIN-saksbehandler onsker jeg a se departementslisten som et WYSIWYG-dokument med korrekt nummerering, stiler og figurer, slik at den gjenspeiler det endelige Word-dokumentet. | Visningen matcher den opplastede malens utseende: Calibri-typografi, flerniva nummerering, "strengt fortrolig"-boks, tabell-titler og figur-titler. |
| US-27 | Som FIN-saksbehandler onsker jeg a redigere saksomtaler direkte i departementslisten, slik at endringene ogsa registreres pa saken. | Toveis synkronisering. Endringer i deplisten skrives tilbake til case_content. |
| US-28 | Som FIN-saksbehandler onsker jeg a sette inn figurer (PNG/SVG) med caption i departementslisten. | Bildeopplasting til blob storage, inline-visning med caption, inkluderes i Word-eksport. |
| US-29 | Som saksbehandler onsker jeg a se en sak i dokumentvisning (Word-lignende) via en knapp i hoyre hjorne. | Fullskjerm, frosted glass bakgrunn, Escape for a lukke. |
| US-30 | Som saksbehandler onsker jeg a eksportere sakslister til Word (Calibri 12pt) og Excel med valg av saker og felt. | Eksportdialog med filter. Word-eksport folger Calibri-standarden. Admin kan lage maler. |
| US-31 | Som FIN-saksbehandler onsker jeg a sette A/B-liste-plassering og prioriteringsnummer pa saker, slik at de grupperes korrekt i departementslisten. | Nytt felt i saksbehandlings-UI. Saker plasseres i riktig subgruppe i deplisten. |
| US-32 | Som FIN-saksbehandler onsker jeg a skrive formelle konklusjonspunkter (bokstavert) pa saker under "Andre viktige beslutninger". | Konklusjonsliste med a), b), c)-nummerering. Rendres med bold tekst. Eksporteres med stilen Konklusjonbokstavert. |
| US-33 | Som FIN-saksbehandler onsker jeg a eksportere departementslisten til Word basert pa den opprinnelige Word-malen, slik at stiler, nummerering og layout er korrekte. | Template-basert eksport. Stiler matcher den opplastede malen. Figurer inkluderes. |
