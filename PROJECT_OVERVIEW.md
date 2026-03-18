# Statsbudsjettportalen - Prosjektoversikt

## Formål

Statsbudsjettportalen digitaliserer arbeidsprosessen rundt statsbudsjettet i Norge. Den Word-baserte prosessen mellom fagdepartementene (FAG) og Finansdepartementet (FIN) erstattes med en strukturert digital løsning.

## Hovedmål

- **Strukturere budsjettdata** for bedre analyse og gjenbruk
- **Redusere ettersendelser og feil** med 40%
- **Spare 30% tid** i prosessen
- **Sikre full sporbarhet og versjonering** for arkiv
- **Muliggjøre sømløs kommunikasjon** mellom FAG og FIN
- **Levere intuitiv brukeropplevelse** som øker adopsjon

## Hosting og infrastruktur

Løsningen hostes på privat sky i regi av Sopra Steria, med støtte for Azure Web Apps som alternativ.

## Faseinndeling og status

| Fase | Fokus | Status | Leveranser |
|------|-------|--------|------------|
| **POC** | FAG-FIN datautveksling + UX-validering | ✅ Fullført | US-01–12, 16: grunnleggende saksflyt, mock-auth, testdata |
| **Fase 1** | Fungerende løsning uten Word-funksjonalitet | ✅ Fullført | Komplett saksflyt, eksport, spørsmål/svar, innspill til FIN |
| **Fase 2** | Word-funksjonalitet | ✅ Fullført | TipTap-dokumentmodell, spor endringer, kommentarer (US-17–19, US-24) |
| **Fase Y** | Ytelsesoptimalisering og skalerbarhet | ✅ Fullført | PgBouncer, Redis-cache, Locust-lasttesting, K8s/HPA, rate limiting |
| **Fase A** | Departementsliste-modul | ✅ Fullført | WYSIWYG-redigering av depliste, Word-eksport (US-25–33) |
| **Fase 3** | Utvidelser | 🔲 Planlagt | Proposisjoner, FIA Budsys-integrasjon, andre bruksområder |

## Suksesskriterier

### Kvantitative

| ID | Kriterie | Beskrivelse | Fase |
|----|----------|-------------|------|
| SK-1 | Tidsbesparelse | 30% reduksjon i tid for å utarbeide og sende innspill | Fase 1 |
| SK-2 | Feilreduksjon | 40% reduksjon i ettersendelser og korreksjoner | Fase 1 |
| SK-3 | Adopsjonsrate | 80% av brukere i pilotdepartement bruker portalen som primærverktøy | Fase 1 |
| SK-4 | Departementslister | Genereres automatisk med < 10% manuell etterarbeid | Fase A |
| SK-5 | Samtidige brukere | 100 brukere uten ytelsesforringelse (p95 < 200ms), 500 brukere uten degradering | Fase Y |
| SK-6 | Arkivkompletthet | 100% av saker kan eksporteres med full versjonshistorikk | Fase 1 |

### Kvalitative

| ID | Kriterie | Beskrivelse | Fase |
|----|----------|-------------|------|
| SK-7 | Brukertilfredshet | SUS-score over 70 | Alle faser |
| SK-8 | Datakvalitet | Strukturerte, konsistente innspill som kan gjenbrukes | Fase 1 |
| SK-9 | Prosessklarhet | Brukere forstår saksflyten og vet hva neste steg er | Fase 1 |
| SK-10 | Samarbeidskvalitet | Effektivt samarbeid på tvers av roller | Fase 2 |

## Risiko og tiltak

| ID | Risiko | Alvorlighet | Tiltak |
|----|--------|-------------|--------|
| R-1 | Brukere foretrekker fortsatt Word | Høy | Tidlig testing, involvere brukere, fokus på enkelhet |
| R-2 | Word-funksjonalitet (Fase 2) for kompleks | Høy | Egenutviklet spor endringer uten TipTap Pro, gjennomført |
| R-3 | Datamodell passer ikke alle departementer | Middels | Fleksible JSON-felt, dynamiske sakstyper |
| R-4 | For mange felt skremmer brukere | Middels | Dynamiske felt basert på sakstype, dokumentmodell |
| R-5 | Ytelse ved 100–500 samtidige brukere | Middels | PgBouncer, Redis, Locust-lasttesting, gjennomført i Fase Y |

## Organisering

| Rolle | Ansvar | Navn |
|-------|--------|------|
| Produkteier | Prioritering, krav, beslutninger | FIN-FA |
| Tech Lead | Arkitektur, tekniske beslutninger | TBD |
| UX/UI Designer | Design, testing, brukeropplevelse | TBD |
| Frontend Lead | React-utvikling, designsystem | TBD |
| Backend Lead | API, database, arkitektur | TBD |
| Brukergruppe FAG | Testing, tilbakemelding | Fra KLD |
| Brukergruppe FIN-FA | Kravvalidering, testing | Finansdepartementet |

## Kontekst: Dagens prosess

Innspill til budsjettrundene utarbeides i tråd med føringer i rundskriv og maler (strukturerte data) og sendes i Word-format (ustrukturert form). Departementene ber om de samme dataene fra alle fagdepartementene, men får den på ustrukturert og ulik form. Ved å sende innspillene på en mer strukturert form kan FAG og FIN enklere utnytte, bearbeide og analysere dataene.

Portalen lar fagdepartementene opprette saker (forslag til endringer på kapittel og post), behandle disse internt i avdelingene, få godkjennelse fra politisk ledelse, før budsjettenheten sender over alle enkeltsakene til FIN. FIN vurderer forslagene (FINs tilråding), kan legge til forslag, og deretter eksporteres sakene til en departementsliste.

Kjernen i brukerbehovene ligger i funksjonalitet som spor endringer, kommentarer, versjonering og samtidig redigering. Saker rendres som sammenhengende dokumenter (TipTap/ProseMirror). Det er i tillegg et arkivbehov med versjonslogger.
