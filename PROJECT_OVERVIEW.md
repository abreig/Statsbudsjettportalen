# Statsbudsjettportalen - Prosjektoversikt

## Formål

Statsbudsjettportalen skal digitalisere arbeidsprosessen rundt statsbudsjettet i Norge. Dagens Word-baserte prosess mellom fagdepartementene (FAG) og Finansdepartementet (FIN) skal erstattes med en strukturert digital løsning.

## Hovedmål

- **Strukturere budsjettdata** for bedre analyse og gjenbruk
- **Redusere ettersendelser og feil** med 40%
- **Spare 30% tid** i prosessen
- **Sikre full sporbarhet og versjonering** for arkiv
- **Muliggjøre sømløs kommunikasjon** mellom FAG og FIN
- **Levere intuitiv brukeropplevelse** som øker adopsjon

## Hosting og infrastruktur

Løsningen skal hostes på privat sky i regi av Sopra Steria.

## Faseinndeling

| Fase | Fokus | Varighet | Hovedmål |
|------|-------|----------|----------|
| **POC** | FAG-FIN utveksling + UX validering | 3-4 uker | Teste konsept, FAG-FIN interaksjon og brukeropplevelse |
| **Fase 1** | Fungerende løsning uten Word-funksjonalitet | 2-3 måneder | Erstatte Word-prosessen med strukturert digital flyt |
| **Fase 2** | Word-funksjonalitet og integrasjoner | 2-3 måneder | Samtidig redigering, spor endringer, kommentarer |
| **Fase 3** | Utvidelser | TBD | Proposisjoner, andre bruksområder |

## Suksesskriterier

### Kvantitative

| ID | Kriterie | Beskrivelse | Fase |
|----|----------|-------------|------|
| SK-1 | Tidsbesparelse | 30% reduksjon i tid for å utarbeide og sende innspill | Fase 1 |
| SK-2 | Feilreduksjon | 40% reduksjon i ettersendelser og korreksjoner | Fase 1 |
| SK-3 | Adopsjonsrate | 80% av brukere i pilotdepartement bruker portalen som primærverktøy | Fase 1 |
| SK-4 | Departementslister | Genereres automatisk med < 10% manuell etterarbeid | Fase 1 |
| SK-5 | Samtidige brukere | Minst 20 per departement uten ytelsesforringelse | Fase 2 |
| SK-6 | Arkivkompletthet | 100% av saker kan eksporteres med full versjonshistorikk | Fase 2 |

### Kvalitative

| ID | Kriterie | Beskrivelse | Fase |
|----|----------|-------------|------|
| SK-7 | Brukertilfredshet | SUS-score over 70 | Alle faser |
| SK-8 | Datakvalitet | Strukturerte, konsistente innspill som kan gjenbrukes | Fase 1 |
| SK-9 | Prosessklarhet | Brukere forstår saksflyten og vet hva neste steg er | Fase 1 |
| SK-10 | Samarbeidskvalitet | Effektivt samarbeid på tvers av roller | Fase 2 |

## Suksesskriterier for POC

| Område | Kriterie | Måleverdi |
|--------|----------|-----------|
| Funksjonalitet | Alle P0 brukerhistorier implementert | 100% (US-01, 02, 03, 04, 06, 09, 10, 11) |
| FAG-FIN utveksling | Data flyter sømløst mellom FAG og FIN | Fullført og testet med brukere |
| UX | SUS-score fra brukere | > 70 |
| UX | Task completion rate | > 90% |
| Testing | Usability testing gjennomført | Minimum 5 brukere (3 FAG, 2 FIN) |
| Dokumentasjon | README + API-docs + Design guidelines | Komplett og oppdatert |
| Teknisk validering | Word-eksport testet (forenklet) | Kompleksitet vurdert for Fase 2 |

## Risiko og tiltak

| ID | Risiko | Alvorlighet | Tiltak |
|----|--------|-------------|--------|
| R-1 | Brukere foretrekker fortsatt Word | Høy | Tidlig testing, involvere brukere, fokus på enkelhet |
| R-2 | Word-funksjonalitet (Fase 2) for kompleks | Høy | Test forenklet eksport i POC |
| R-3 | Datamodell passer ikke alle departementer | Middels | Fleksible JSON-felt, test med KLD først |
| R-4 | For mange felt skremmer brukere | Middels | Dynamiske felt basert på sakstype |
| R-5 | For få testbrukere | Middels | Rekruttere 5-8 brukere tidlig |

## Organisering

| Rolle | Ansvar | Navn |
|-------|--------|------|
| Produkteier | Prioritering, krav, beslutninger | FIN-FA (TBD) |
| Prosessleder | Fremdrift, møter, rapportering | Ekstern (TBD) |
| Tech Lead | Arkitektur, tekniske beslutninger | TBD |
| UX/UI Designer | Design, testing, brukeropplevelse | TBD |
| Frontend Lead | React-utvikling, designsystem | TBD |
| Backend Lead | API, database, arkitektur | TBD |
| Brukergruppe FAG | Testing, tilbakemelding | Fra KLD |
| Brukergruppe FIN-FA | Kravvalidering, testing | Finansdepartementet |

## Kontekst: Dagens prosess

Innspill til budsjettrundene utarbeides i tråd med føringer i rundskriv og maler (strukturerte data) og sendes i Word-format (ustrukturert form). Departementene ber om de samme dataene fra alle fagdepartementene, men får den på ustrukturert og ulik form. Ved å sende innspillene på en mer strukturert form kan FAG og FIN enklere utnytte, bearbeide og analysere dataene.

Portalen skal la fagdepartementene opprette saker (forslag til endringer på kapittel og post), behandle disse internt i avdelingene, få godkjennelse fra politisk ledelse, før budsjettenheten sender over alle enkeltsakene til FIN. FIN vurderer forslagene (FINs tilråding), kan legge til forslag, og deretter eksporteres sakene til en departementsliste.

Kjernen i brukerbehovene ligger i funksjonalitet som spor endringer, kommentarer, versjonering og samtidig redigering. Når en sak åpnes, må det føles som et dokument. Det vil i tillegg være et arkivbehov med versjonslogger.
