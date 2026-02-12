# Brukerhistorier

Brukerhistoriene er organisert etter fase og brukergruppe. Hver historie følger formatet: *Som [rolle], ønsker jeg [handling], slik at [verdi].*

## Brukerroller

| Rolle | Beskrivelse |
|-------|-------------|
| **Saksbehandler FAG** | Opprette og redigere saker. Se tilbakemeldinger fra FIN. |
| **Budsjettenhet FAG** | Samle, kvalitetssikre og sende innspill til FIN. Administrere saker. |
| **Politisk ledelse FAG** | Godkjenne/avvise saker i klareringsflyt. Lesetilgang til oversikter. |
| **Saksbehandler FIN** | Motta og vurdere innspill. Legge til FINs vurdering. Stille spørsmål til FAG. |
| **Underdirektør/Avdelingsdirektør FIN** | Avklare og godkjenne FINs vurderinger internt. |
| **SBR FIN** | Avklaringer på tvers av fagområder. |
| **Arkivansvarlig** | Eksportere versjonslogger og sette arkivpunkter. |
| **Administrator** | Administrere budsjettrunder, brukere, maler og systeminnstillinger. |

## POC og Fase 1 - Grunnfunksjonalitet

### Fagdepartementene (FAG)

#### US-01: Velge budsjettrunde (P0 - POC)

**Som** saksbehandler i et fagdepartement **ønsker jeg** å velge budsjettrunde (f.eks. AUG2026, MARS2026, RNB2025) etter innlogging, **slik at** jeg ser sakene som er relevante for den aktuelle runden.

**Akseptansekriterier:**
- Bruker logger inn automatisk (AD-integrasjon, mock i POC)
- Tilgjengelige budsjettrunder vises i en liste
- Valg åpner saksoversikt for den gitte runden
- Bruker ser kun runder relevant for sitt departement

---

#### US-02: Opprette ny sak (P0 - POC)

**Som** saksbehandler **ønsker jeg** å opprette en ny sak med forhåndsdefinerte felt basert på sakstype, **slik at** forslaget er strukturert fra start.

**Akseptansekriterier:**
- Bruker velger sakstype (satsingsforslag, budsjettiltak, teknisk justering)
- Relevante felt vises basert på valgt sakstype
- Obligatoriske felt: saksnavn, kapittel, post, beløp, begrunnelse
- Sak opprettes med status "draft" og versjon 1

**Felt per sakstype:**

*Satsingsforslag (alle felt):*
- Saksnavn, Kapittel, Post, Beløp
- Forslag til omtale i materialet
- Begrunnelse for forslaget
- FAGs forslag til verbalkonklusjon
- Samfunnsøkonomisk analyse
- Mål og resultatindikator
- Gevinstrealiseringsplan
- Kommentar (intern)

*Budsjettiltak (færre felt):*
- Saksnavn, Kapittel, Post, Beløp
- Forslag til omtale
- Begrunnelse
- Kommentar

*Teknisk justering (minimalt):*
- Saksnavn, Kapittel, Post, Beløp
- Begrunnelse
- Kommentar

---

#### US-03: Se saksoversikt (P0 - POC)

**Som** saksbehandler **ønsker jeg** å se en tabellarisk oversikt over alle saker i gjeldende budsjettrunde, **slik at** jeg har oversikt og kan navigere til enkeltsaker.

**Akseptansekriterier:**
- Tabell viser: saksnavn, kap./post, sum, sakstype, tilordnet til, status
- Filtrering på sakstype, status, tilordnet til
- Søkefunksjon (fritekst)
- Sorterbare kolonner
- Klikk på sak åpner detaljvisning

---

#### US-04: Redigere og lagre sak (P0 - POC)

**Som** saksbehandler **ønsker jeg** å redigere innholdet i en sak og lagre endringene, **slik at** forslaget kan forbedres iterativt.

**Akseptansekriterier:**
- Alle felt kan redigeres
- Endringer lagres med versjonsnummer
- Tidligere versjoner er tilgjengelige

---

#### US-05: Sende sak til intern avklaring (Nice to have - POC)

**Som** saksbehandler **ønsker jeg** å sende en sak til avklaring hos fagavdeling eller politisk ledelse, **slik at** saken klareres før den sendes til FIN.

**Akseptansekriterier:**
- Sak kan sendes til avklaring med et klikk
- Mottaker får varsel
- Status oppdateres automatisk
- Avklaring kan godkjennes eller returneres med kommentar

---

#### US-06: Sende samlet innspill til FIN (P0 - POC)

**Som** budsjettenheten i et fagdepartement **ønsker jeg** å samle alle klarerte saker og sende dem som ett innspill til FIN, **slik at** FIN mottar et komplett innspill.

**Akseptansekriterier:**
- Kun saker med status "Klarert" kan inkluderes
- Samlet innspill sendes til FIN i portalen
- FIN kan se innspillet umiddelbart etter sending
- Ettersendelser kan gjøres separat

---

#### US-07: Eksportere saksoversikt (Should have - Fase 1)

**Som** saksbehandler **ønsker jeg** å eksportere saksoversikten til Word og Excel, **slik at** jeg kan bruke dataene i andre sammenhenger.

**Akseptansekriterier:**
- Word-eksport genererer et formatert dokument
- Excel-eksport inneholder alle data i tabellform
- Eksportene gjenspeiler gjeldende filtrering

---

#### US-08: Legge til vedlegg (Could have - Fase 1)

**Som** saksbehandler **ønsker jeg** å legge ved dokumenter til en sak, **slik at** bakgrunnsinformasjon er tilgjengelig for alle som arbeider med saken.

**Akseptansekriterier:**
- Vedlegg kan lastes opp i vanlige filformater
- Vedlegg vises i sakens detaljvisning
- Vedlegg følger saken gjennom hele flyten

---

### Finansdepartementet (FIN)

#### US-09: Se innspill fra fagdepartementene (P0 - POC)

**Som** saksbehandler i FIN **ønsker jeg** å se alle innspill fra fagdepartementene samlet, filtrert per departement, **slik at** jeg effektivt kan starte vurderingsarbeidet.

**Akseptansekriterier:**
- Oversikt viser saker med departement, saksnavn, kap./post, sum, sakstype, omtale, tilordnet til, status
- Filtrering på departement, sakstype og status
- Søkefunksjon
- Klikk på sak åpner detaljvisning

---

#### US-10: Legge til FINs vurdering (P0 - POC)

**Som** saksbehandler i FIN **ønsker jeg** å legge til FINs vurdering og FINs forslag til verbalkonklusjon på en sak, **slik at** FINs tilråding er dokumentert.

**Akseptansekriterier:**
- Eget felt for FINs vurdering i sakens detaljvisning
- Eget felt for FINs forslag til verbalkonklusjon
- Endringer versjoneres

---

#### US-11: Returnere saker til FAG (P0 - POC)

**Som** saksbehandler i FIN **ønsker jeg** å returnere enkeltsaker til fagdepartementet med begrunnelse, **slik at** FAG kan forbedre eller korrigere forslaget.

**Akseptansekriterier:**
- Retur utløser varsel til FAG
- Begrunnelse for retur er obligatorisk
- Saken får status som indikerer retur

---

#### US-12: Stille spørsmål til FAG (P1 - POC)

**Som** saksbehandler i FIN **ønsker jeg** å stille spørsmål til fagdepartementet om en sak, **slik at** uklarheter kan avklares innenfor portalen.

**Akseptansekriterier:**
- Spørsmål knyttes til en spesifikk sak
- FAG mottar varsel og kan svare i portalen
- Spørsmål og svar logges med tidspunkt

---

#### US-13: Intern avklaring i FIN (Nice to have - POC)

**Som** saksbehandler i FIN **ønsker jeg** å sende saker til intern avklaring (underdirektør, avdelingsdirektør, SBR, andre avdelinger), **slik at** FINs vurdering er forankret.

**Akseptansekriterier:**
- Saker kan sendes til avklaring hos ulike roller
- Avklaringsstatus synlig i saksoversikten

---

#### US-14: Opprette egne saker i FIN (Could have - Fase 1)

**Som** saksbehandler i FIN **ønsker jeg** å opprette egne saker (f.eks. budsjettiltak), **slik at** FIN kan legge til forslag som ikke kommer fra FAG.

---

#### US-15: Generere departementsliste (Should have - Fase 1)

**Som** saksbehandler i FIN **ønsker jeg** å generere en departementsliste basert på en forhåndsdefinert mal, **slik at** budsjettmaterialet kan sammenstilles.

---

### Felles

#### US-16: Versjonslogg og historikk (P0 forenklet - POC)

**Som** bruker **ønsker jeg** å se en komplett logg over alle endringer på en sak, **slik at** beslutningsgrunnlaget er sporbart og arkivkravet er oppfylt.

**Akseptansekriterier:**
- Hver versjon viser hvem som endret, hva som ble endret, og når
- Tidligere versjoner kan åpnes og leses
- Versjonshistorikk kan eksporteres (Fase 1)

---

## Fase 2 - Word-funksjonalitet

#### US-17: Samtidig redigering

**Som** saksbehandler **ønsker jeg** å redigere en saks innhold samtidig med andre brukere, **slik at** vi kan samarbeide effektivt uten å overskrive hverandres endringer.

**Akseptansekriterier:**
- Flere brukere kan redigere samme sak samtidig
- Endringer synkroniseres i sanntid
- Konflikthåndtering ved samtidige endringer i samme felt

---

#### US-18: Spor endringer

**Som** saksbehandler **ønsker jeg** at alle endringer i en saks tekstfelt spores, **slik at** jeg kan se utviklingen og vurdere endringene.

**Akseptansekriterier:**
- Endringer vises visuelt (tilsvarende Word spor endringer)
- Endringer kan godtas eller avvises enkeltvis
- Bruker og tidspunkt vises for hver endring

---

#### US-19: Kommentarer i saker

**Som** saksbehandler **ønsker jeg** å legge til kommentarer knyttet til spesifikke tekstpassasjer, **slik at** diskusjoner kan føres kontekstuelt.

**Akseptansekriterier:**
- Kommentarer knyttes til markert tekst
- Kommentarer kan besvares (tråder)
- Kommentarer kan løses/lukkes

---

#### US-24: Retur med Word-funksjonalitet

**Som** saksbehandler i FIN **ønsker jeg** å returnere FINs tilrådinger og kommentarer direkte til FAG gjennom portalen (med Word-funksjonalitet), **slik at** FAG kan se og reagere på vurderingene uten separate dokumenter.

---

## MoSCoW-prioritering for Fase 1

| Prioritet | Funksjonalitet | Ref. |
|-----------|---------------|------|
| **Must have** | Opprette sak med forhåndsdefinerte felt per sakstype | US-02 |
| **Must have** | Saksoversikt med filtrering og søk | US-03 |
| **Must have** | Detaljvisning og redigering av saker | US-04 |
| **Must have** | Saksflyt: sende til avklaring, godkjenne, returnere | US-05 |
| **Must have** | Sende samlet innspill til FIN | US-06 |
| **Must have** | FINs vurdering og forslag til verbalkonklusjon | US-10 |
| **Must have** | Versjonering av alle endringer | US-16 |
| **Must have** | Velge budsjettrunde | US-01 |
| **Should have** | Eksport til Word og Excel | US-07 |
| **Should have** | Generere departementsliste fra mal | US-15 |
| **Should have** | Spørsmål og svar mellom FIN og FAG | US-12 |
| **Should have** | Returnere saker til FAG med begrunnelse | US-11 |
| **Should have** | Intern avklaring i FIN | US-13 |
| **Could have** | Vedlegg til saker | US-08 |
| **Could have** | Opprette egne saker i FIN | US-14 |
| **Could have** | Arkivpunkter med eksport | US-16 |
| **Won't have** | Samtidig redigering | US-17 (Fase 2) |
| **Won't have** | Spor endringer i tekst | US-18 (Fase 2) |
| **Won't have** | Kommentarer på tekstpassasjer | US-19 (Fase 2) |
| **Won't have** | Avstemming FIA Budsys / BudMod | US-22/23 (Fase 2) |

## JTBD til brukerhistorier (sporbarhet)

| JTBD | Jobb | Brukerhistorier |
|------|------|-----------------|
| JTBD-1 | Opprette og strukturere budsjettforslag | US-02, US-04 |
| JTBD-2 | Intern klarering og godkjenning | US-05 |
| JTBD-3 | Samle og sende innspill til FIN | US-06 |
| JTBD-4 | Oversikt og sporbarhet | US-01, US-03, US-04, US-16 |
| JTBD-5 | Kommunisere med FIN | US-12 |
| JTBD-6 | Motta og vurdere innspill fra FAG | US-09 |
| JTBD-7 | Utarbeide FINs tilråding | US-10 |
| JTBD-8 | Kommunisere med FAG | US-11, US-12 |
| JTBD-9 | Generere departementslister | US-15, US-21 |
| JTBD-10 | Avklare internt i FIN | US-13 |
| JTBD-11 | Arkivere beslutningsgrunnlag | US-16 |
| JTBD-12 | Analysere budsjettdata | US-07 |
