# Syntetisk Testdata for POC

POC bruker kun syntetisk data. Ingen integrasjon med FIA Budsys eller Entra ID.

## Brukerroller og tilganger

| Rolle | Mock-brukernavn (POC) | Tilganger |
|-------|----------------------|-----------|
| Saksbehandler FAG | fag.kld@test.no | Opprette, redigere saker i KLD. Se svar fra FIN. |
| Budsjettenhet FAG | budsjett.kld@test.no | Alt saksbehandler + sende innspill til FIN |
| Saksbehandler FIN | fin.kld@test.no | Se innspill fra KLD, legge til vurdering, returnere saker |
| Underdirektør FIN | undirdir.fin@test.no | Avklare saker internt i FIN (nice to have) |
| Administrator | admin@test.no | Administrere runder, brukere, testdata |

**Merk:** I POC brukes mock-innlogging. Ved produksjonssetting integreres Entra ID med AD-grupper som mapper til disse rollene.

## testdata/mock_users.json

```json
[
  {
    "id": "user-fag-kld-1",
    "email": "fag.kld@test.no",
    "name": "Kari Nordmann",
    "department_id": "kld",
    "role": "saksbehandler_fag"
  },
  {
    "id": "user-budsjett-kld-1",
    "email": "budsjett.kld@test.no",
    "name": "Ole Hansen",
    "department_id": "kld",
    "role": "budsjettenhet_fag"
  },
  {
    "id": "user-fin-kld-1",
    "email": "fin.kld@test.no",
    "name": "Eva Johansen",
    "department_id": "fin",
    "role": "saksbehandler_fin"
  },
  {
    "id": "user-undirdir-fin-1",
    "email": "undirdir.fin@test.no",
    "name": "Per Olsen",
    "department_id": "fin",
    "role": "underdirektor_fin"
  },
  {
    "id": "user-admin-1",
    "email": "admin@test.no",
    "name": "Admin Bruker",
    "department_id": "fin",
    "role": "administrator"
  }
]
```

## testdata/departments.json

```json
[
  {
    "id": "kld",
    "code": "KLD",
    "name": "Klima- og miljødepartementet"
  },
  {
    "id": "fin",
    "code": "FIN",
    "name": "Finansdepartementet"
  }
]
```

## testdata/budsjettrunder.json

```json
[
  {
    "id": "aug2026",
    "name": "AUG2026",
    "type": "august",
    "year": 2026,
    "status": "open",
    "deadline": "2026-08-15T23:59:59Z"
  },
  {
    "id": "mars2026",
    "name": "MARS2026",
    "type": "mars",
    "year": 2026,
    "status": "open",
    "deadline": "2026-03-01T23:59:59Z"
  }
]
```

## testdata/sample_cases.json

```json
[
  {
    "id": "case-1",
    "budget_round_id": "aug2026",
    "department_id": "kld",
    "case_name": "Økt bevilgning til Enova",
    "chapter": "1428",
    "post": "50",
    "amount": 150000,
    "case_type": "satsingsforslag",
    "status": "sendt_til_fin",
    "assigned_to": "user-fin-kld-1",
    "created_by": "user-fag-kld-1",
    "content": {
      "proposal_text": "Styrke Enovas arbeid med energieffektivisering i industrien for å redusere klimagassutslipp.",
      "justification": "Industrien står for en betydelig andel av Norges samlede klimagassutslipp. Flere aktører har meldt prosjekter som kan gi store utslippskutt, men mangler lønnsomhet uten støtte.",
      "verbal_conclusion": "Det varsles i Prop. 1 S at regjeringen tar sikte på å legge frem en opptrappingsplan for energieffektivisering innen 2050.",
      "socioeconomic_analysis": "Tiltaket forventes å gi en kostnad på om lag 800-1000 kroner per tonn redusert CO2-ekvivalent.",
      "goal_indicator": "Reduserte klimagassutslipp under innsatsfordelingen",
      "benefit_plan": "Kort sikt (1-2 år): Økt prosjektaktivitet. Mellomlang sikt (3-5 år): Reduksjon i energiforbruk. Lang sikt (5+ år): Varig reduksjon i utslipp.",
      "comment": "Sjekk tallgrunnlag mot Enovas siste årsrapport."
    }
  },
  {
    "id": "case-2",
    "budget_round_id": "aug2026",
    "department_id": "kld",
    "case_name": "Midler til opprydding i forurenset sjøbunn",
    "chapter": "1420",
    "post": "69",
    "amount": 50000,
    "case_type": "budsjettiltak",
    "status": "under_arbeid",
    "assigned_to": "user-fag-kld-1",
    "created_by": "user-fag-kld-1",
    "content": {
      "proposal_text": "Bevilge midler til opprydding av forurenset sjøbunn i prioriterte havneområder.",
      "justification": "Flere havneområder har dokumentert forurensning som påvirker marint miljø og folkehelse.",
      "comment": ""
    }
  },
  {
    "id": "case-3",
    "budget_round_id": "aug2026",
    "department_id": "kld",
    "case_name": "Styrking av Norges bidrag til Det grønne klimafondet (GCF)",
    "chapter": "1482",
    "post": "73",
    "amount": 200000,
    "case_type": "satsingsforslag",
    "status": "klarert",
    "assigned_to": "user-budsjett-kld-1",
    "created_by": "user-fag-kld-1",
    "content": {
      "proposal_text": "Øke Norges bidrag til Det grønne klimafondet for å styrke internasjonal klimafinansiering.",
      "justification": "Norge har forpliktet seg til økt klimafinansiering gjennom Parisavtalen.",
      "verbal_conclusion": "Regjeringen foreslår å øke bidraget til GCF som del av Norges internasjonale klimainnsats.",
      "socioeconomic_analysis": "Investeringen forventes å gi betydelig avkastning i form av global utslippsreduksjon.",
      "goal_indicator": "Økt internasjonal klimafinansiering",
      "benefit_plan": "Årlig rapportering gjennom GCFs resultatrammeverk.",
      "comment": ""
    }
  },
  {
    "id": "case-4",
    "budget_round_id": "aug2026",
    "department_id": "kld",
    "case_name": "Reduksjon i tilskudd til miljøteknologiordningen",
    "chapter": "1428",
    "post": "72",
    "amount": -30000,
    "case_type": "teknisk_justering",
    "status": "draft",
    "assigned_to": "user-fag-kld-1",
    "created_by": "user-fag-kld-1",
    "content": {
      "proposal_text": "Teknisk justering av bevilgningen til miljøteknologiordningen.",
      "justification": "Tilpasning til faktisk forbruksmønster.",
      "comment": ""
    }
  }
]
```

## Sakstyper og felt

| Sakstype | Felt som vises |
|----------|---------------|
| **Satsingsforslag** | Alle felt (proposal_text, justification, verbal_conclusion, socioeconomic_analysis, goal_indicator, benefit_plan, comment) |
| **Budsjettiltak** | proposal_text, justification, comment |
| **Teknisk justering** | justification, comment |
