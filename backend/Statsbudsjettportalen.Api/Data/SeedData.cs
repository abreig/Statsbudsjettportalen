using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Models;
using Statsbudsjettportalen.Api.Services;

namespace Statsbudsjettportalen.Api.Data;

public static class SeedData
{
    // Deterministic GUID helper: namespace + index → stable GUID
    private static Guid G(int ns, int idx) =>
        new($"{ns:D8}-0000-0000-0000-{idx:D12}");

    private static readonly DateTime SeedDate = new(2025, 12, 1, 10, 0, 0, DateTimeKind.Utc);

    private static readonly (string Code, string Name)[] Departments =
    [
        ("AID", "Arbeids- og inkluderingsdepartementet"),
        ("BFD", "Barne- og familiedepartementet"),
        ("DFD", "Digitaliserings- og forvaltningsdepartementet"),
        ("ED",  "Energidepartementet"),
        ("FIN", "Finansdepartementet"),
        ("FD",  "Forsvarsdepartementet"),
        ("HOD", "Helse- og omsorgsdepartementet"),
        ("JD",  "Justis- og beredskapsdepartementet"),
        ("KLD", "Klima- og miljødepartementet"),
        ("KDD", "Kommunal- og distriktsdepartementet"),
        ("KUD", "Kultur- og likestillingsdepartementet"),
        ("KD",  "Kunnskapsdepartementet"),
        ("LMD", "Landbruks- og matdepartementet"),
        ("NFD", "Nærings- og fiskeridepartementet"),
        ("SD",  "Samferdselsdepartementet"),
        ("UD",  "Utenriksdepartementet"),
        ("FIN-FAG", "Finansdepartementet (fagavdelinger)"),
    ];

    private static readonly string[] CaseTypes = ["satsingsforslag", "budsjettiltak", "teknisk_justering", "andre_saker"];

    // Status distribution for AUG round (30 cases per dept):
    // 20% klarert, 20% godkjent_pol, 30% sendt_til_fin, 20% under_vurdering_fin, 10% ferdigbehandlet_fin
    private static readonly string[] AugStatuses =
    [
        "klarert","klarert","klarert","klarert","klarert","klarert",                              // 0–5  (20%)
        "godkjent_pol","godkjent_pol","godkjent_pol","godkjent_pol","godkjent_pol","godkjent_pol",// 6–11 (20%)
        "sendt_til_fin","sendt_til_fin","sendt_til_fin","sendt_til_fin","sendt_til_fin",
        "sendt_til_fin","sendt_til_fin","sendt_til_fin","sendt_til_fin",                          // 12–20 (30%)
        "under_vurdering_fin","under_vurdering_fin","under_vurdering_fin",
        "under_vurdering_fin","under_vurdering_fin","under_vurdering_fin",                        // 21–26 (20%)
        "ferdigbehandlet_fin","ferdigbehandlet_fin","ferdigbehandlet_fin",                        // 27–29 (10%)
    ];

    // Division names per department code
    private static readonly Dictionary<string, string[]> DeptDivisions = new()
    {
        ["AID"] = ["Arbeidspolitisk avdeling", "Inkluderingsavdelingen"],
        ["BFD"] = ["Barneavdelingen", "Familieavdelingen"],
        ["DFD"] = ["Digitaliseringsavdelingen", "Forvaltningsavdelingen"],
        ["ED"]  = ["Energiavdelingen", "Petroleumsavdelingen"],
        ["FD"]  = ["Forsvarsavdelingen", "Sikkerhetspolitisk avdeling"],
        ["HOD"] = ["Folkehelseavdelingen", "Spesialisthelsetjenesteavdelingen"],
        ["JD"]  = ["Politiavdelingen", "Sivilavdelingen"],
        ["KLD"] = ["Klimaavdelingen", "Naturavdelingen"],
        ["KDD"] = ["Kommunalavdelingen", "Planavdelingen"],
        ["KUD"] = ["Kulturavdelingen", "Medieavdelingen"],
        ["KD"]  = ["Universitets- og høyskoleavdelingen", "Opplæringsavdelingen"],
        ["LMD"] = ["Matavdelingen", "Landbruksavdelingen"],
        ["NFD"] = ["Næringsavdelingen", "Havbruksavdelingen"],
        ["SD"]  = ["Vegavdelingen", "Jernbaneavdelingen"],
        ["UD"]  = ["FN-avdelingen", "Utviklingsavdelingen"],
        ["FIN-FAG"] = ["Skatteøkonomisk avdeling", "Økonomiavdelingen"],
    };

    private static readonly string[] CaseNameTemplates =
    [
        "Økt bevilgning til {0}",
        "Styrking av {0}",
        "Midler til {0}",
        "Reduksjon i tilskudd til {0}",
        "Teknisk justering av {0}",
        "Ny satsing på {0}",
        "Videreføring av {0}",
        "Effektivisering av {0}",
        "Modernisering av {0}",
        "Utredning av {0}",
    ];

    private static readonly Dictionary<string, string[]> DeptTopics = new()
    {
        ["AID"] = ["arbeidsmarkedstiltak", "inkluderingstilskudd", "NAV-digitalisering", "trygdeordninger", "integreringsprogram", "attføringstiltak", "dagpengeordningen", "arbeidsmiljøtilsyn"],
        ["BFD"] = ["barnevernet", "familievern", "kontantstøtte", "foreldrepenger", "barnehager", "ungdomstiltak", "adopsjonsstøtte", "fritidskortet"],
        ["DFD"] = ["digital infrastruktur", "Altinn 3", "ID-porten", "Digitaliseringsdirektoratet", "bredbåndsutbygging", "offentlig IT-sikkerhet", "felles datakatalog", "e-helse"],
        ["ED"]  = ["fornybar energi", "Enova-ordningen", "energieffektivisering", "havvind", "hydrogen", "kraftnett", "petroleumstilsyn", "CO2-lagring"],
        ["FD"]  = ["Forsvaret", "Heimevernet", "cyberforsvar", "militær infrastruktur", "alliert trening", "forsvarsmateriell", "veterantiltak", "beredskapslagre"],
        ["HOD"] = ["sykehusøkonomi", "psykisk helse", "fastlegeordningen", "legemidler", "folkehelse", "eldreomsorg", "rusbehandling", "helseteknologi"],
        ["JD"]  = ["politiet", "kriminalomsorgen", "domstolene", "sivil beredskap", "brannsikkerhet", "nødnett", "utlendingsforvaltning", "rettshjelp"],
        ["KLD"] = ["klimatilpasning", "naturvern", "forurensning", "Enova", "klimafondet", "miljøteknologi", "artsmangfold", "vannforvaltning"],
        ["KDD"] = ["kommuneøkonomi", "distriktspolitikk", "plan og bygg", "husbanken", "boligpolitikk", "regionalpolitikk", "kommunal digitalisering", "valggjennomføring"],
        ["KUD"] = ["kultursektoren", "mediestøtte", "idrettsanlegg", "kulturfondet", "Norsk filminstitutt", "frivillighet", "likestillingstiltak", "språkpolitikk"],
        ["KD"]  = ["høyere utdanning", "forskning", "grunnopplæring", "studentvelferd", "fagskolene", "kompetansereform", "lærerutdanning", "Forskningsrådet"],
        ["LMD"] = ["jordbruksavtalen", "skogbruk", "reindrift", "matforskning", "Mattilsynet", "økologisk landbruk", "importvern", "dyrevelferd"],
        ["NFD"] = ["næringsutvikling", "Innovasjon Norge", "sjømatnæringen", "eksportfremme", "havbruk", "mineralnæring", "romvirksomhet", "konkurransepolitikk"],
        ["SD"]  = ["vegutbygging", "jernbane", "luftfart", "sjøtransport", "kollektivtransport", "Nye Veier", "Bane NOR", "trafikksikkerhet"],
        ["UD"]  = ["utviklingshjelp", "humanitær bistand", "FN-bidrag", "EØS-midler", "utenrikstjenesten", "eksportkontroll", "freds- og forsoningsarbeid", "nordområdepolitikk"],
        ["FIN-FAG"] = ["skatteøkonomi", "makroøkonomisk modellering", "statsregnskapet", "pengepolitikk", "finansmarkedsregulering", "offentlige innkjøp", "økonomiske prognoser", "statsgjeld"],
    };

    // ── Rich text content variants ───────────────────────────────
    private static readonly string[] ProposalTextVariants =
    [
        "Departementet foreslår å øke bevilgningen med {0} mill. kroner for budsjettåret 2027. Styrkingen er en del av regjeringens satsing innen sektoren og vil bidra til å nå de overordnede målene i langtidsplanen for perioden 2024–2027. Tiltaket er prioritert av departementet og anses som avgjørende for å opprettholde og videreutvikle kapasiteten.",
        "Det foreslås bevilget {0} mill. kroner til tiltaket. Midlene vil styrke kapasiteten og legge til rette for nødvendig omstilling i tråd med regjeringens politiske plattform. Departementet har i samråd med berørte etater vurdert behovet som reelt og presserende.",
        "Departementet fremmer forslag om å styrke sektoren med {0} mill. kroner. Bakgrunnen er en betydelig økning i aktivitetsnivå og etterspørsel de siste tre årene, som krever at ressursene justeres tilsvarende. Tiltaket er nøye utredet og vurdert som samfunnsøkonomisk lønnsomt.",
        "Forslaget innebærer en bevilgning på {0} mill. kroner for 2027. Midlene går til å opprettholde og forbedre kvaliteten på offentlige tjenester innen dette fagområdet. Departementet har gjennomgått eksisterende kapasitet og konkluderer med at ytterligere ressurser er påkrevd.",
        "Det foreslås økt bevilgning med {0} mill. kroner. Tiltaket er en oppfølging av Stortingets anmodningsvedtak og regjeringens forpliktelser i budsjetterklæringen. Gjennomføringen koordineres med relevante underliggende etater.",
        "Departementet anbefaler en styrking på {0} mill. kroner. Satsingen er forankret i regjeringens strategi og ivaretar behovet for økt innsats innen et prioritert politikkområde. Ressursene vil gå til styrket drift og målrettede tiltak i tråd med Stortingets prioriteringer.",
    ];

    private static readonly string[] JustificationVariants =
    [
        "Behovet for styrking er grundig utredet i departementets fagrapport. Analysen viser at dagens bevilgningsnivå ikke er tilstrekkelig for å møte det økte aktivitetsbehovet. Antall brukere av ordningen har økt med 18 prosent de siste tre årene, og uten styrking vil kapasitetsproblemer forverres ytterligere. Tiltaket er i tråd med prioriteringene i regjeringsplattformen.",
        "Begrunnelsen bygger på en helhetlig gjennomgang av sektoren. Eksisterende ressurser er ikke tilstrekkelige til å håndtere veksten i etterspørsel og de økte kravene til kvalitet og kompetanse. Styrkingen er kostnadseffektiv sammenlignet med alternativet om å la problemene hope seg opp.",
        "Departementet har gjennomført en bred konsultasjonsprosess med fagmiljøer, brukerorganisasjoner og underliggende etater. Det er bred enighet om at ressursnivået ikke er tilpasset dagens behov. Tiltaket er støttet av faglige råd og er i tråd med internasjonale anbefalinger på området.",
        "Tiltaket er begrunnet i dokumenterte behov og reell kapasitetsmangel. Interne analyser viser et gap mellom oppdrag og ressurser som påvirker leveransekvaliteten negativt. Styrking vil gi direkte gevinster i form av bedre tjenester og økt måloppnåelse.",
        "Gjeldende bevilgning er ikke justert for prisvekst og aktivitetsøkning over en lengre periode. Den reelle kjøpekraften har falt med om lag 12 prosent siden siste større gjennomgang. Tiltaket retter opp denne skjevheten og bringer ressursnivået i tråd med faktiske behov.",
        "Styrkingen er motivert av Riksrevisjonens merknader og anbefalinger fra den siste forvaltningsrevisjonen av sektoren. Departementet har fulgt opp disse anbefalingene og konkluderer med at økte midler er det mest effektive virkemiddelet for å lukke avvikene.",
    ];

    private static readonly string[] VerbalConclusionVariants =
    [
        "Regjeringen øker bevilgningen med {0} mill. kroner. Styrkingen vil bidra til bedre kapasitet og kvalitet i tjenestene innen sektoren, og er i tråd med regjeringens ambisjoner for budsjettet.",
        "Det bevilges {0} mill. kroner til formålet. Midlene vil styrke arbeidet og legge til rette for at departementet kan nå sine sektormål i planperioden.",
        "Bevilgningen økes med {0} mill. kroner som ledd i en målrettet satsing. Tiltaket er en oppfølging av vedtatte mål og vil bidra til merkbar bedring i tjenesteleveransen.",
        "Regjeringen foreslår å bevilge {0} mill. kroner. Satsingen er begrunnet i dokumenterte behov og vil gi positive effekter for sluttbrukerne innen budsjettåret.",
    ];

    private static readonly string[] SocioeconomicVariants =
    [
        "Tiltaket er vurdert i henhold til kravene i utredningsinstruksen. Nytten er anslått å overstige kostnadene over en tiårsperiode. Det er ikke gjennomført full konseptvalgutredning, da tiltaket ikke overskrider grenseverdiene i statlig prosjektmodell.",
        "En kvalitativ kost-nytte-vurdering tilsier at tiltaket er samfunnsøkonomisk lønnsomt. Positiv effekter oppnås gjennom reduserte kostnader for brukerne, økt verdiskaping og unngåtte fremtidige kostnader ved passivitet.",
        "Samfunnsøkonomisk analyse er gjennomført i tråd med Finansdepartementets veileder. Tiltaket har en beregnet netto nåverdi på om lag {0} mill. kroner over analyseperioden, med klare positive effekter for berørte grupper.",
        "Tiltaket ble vurdert opp mot nullalternativet. Beregningene viser at kostnadene ved å ikke gjennomføre tiltaket over tid er betydelig høyere enn investeringskostnaden. Analysen er dokumentert i vedlegg til budsjettet.",
    ];

    private static readonly string[] GoalIndicatorVariants =
    [
        "Mål: Økt kapasitet og kvalitet i tjenestene. Indikatorer: (1) Andel henvendelser behandlet innen fristen (mål: 90 %), (2) Brukertilfredshet (mål: over 80 % fornøyde), (3) Saksbehandlingstid (mål: redusert med 20 %).",
        "Resultatmål: Styrket kapasitet og bedre måloppnåelse. Målindikatorer: (1) Antall mottakere av tjenesten (øke med 15 % innen 2028), (2) Kvalitetsindeks (mål: forbedret med 10 poeng), (3) Ventetid (mål: redusert til under 30 dager).",
        "Mål: Forbedret tjenesteleveranse og økt brukernytte. Indikatorer: (1) Dekningsgrad for målgruppen (mål: 85 %), (2) Effektivitetsmåling (mål: 10 % effektiviseringsgevinst), (3) Antall avvik (mål: redusert med 25 %).",
    ];

    private static readonly string[] BenefitPlanVariants =
    [
        "Gevinster realiseres løpende fra 2027. Ansvarlig etat rapporterer om måloppnåelse i de årlige tildelingsbrevene. Evalueringsrapport legges frem innen 31. desember 2028.",
        "Gevinstene vil komme gradvis gjennom perioden 2027–2029. Departementet vil følge opp etaten gjennom etatsstyringen og kreve rapportering på definerte indikatorer i virksomhetsplanen.",
        "Forventet gevinst er dokumentert i vedlagt gevinstplan. Realisering skjer gjennom tydelig ansvarsdeling mellom etatsledelse og fagavdelinger, med kvartalsvise statusmøter og egenvurdering.",
    ];

    private static readonly string[] FinAssessmentVariants =
    [
        "FIN vurderer forslaget som godt begrunnet og finner at de faglige argumentene er solide. Tiltakets omfang er rimelig sett i lys av dokumenterte behov. FIN anbefaler at forslaget innvilges med den omsøkte rammen.",
        "Finansdepartementet har gått gjennom saksdokumentene og mener at begrunnelsen er tilfredsstillende. FIN vil likevel påpeke at prioritering av midler bør ses i sammenheng med øvrige tiltak i sektoren. Tilrådingen er en delvis innvilgelse på 70 prosent av omsøkt beløp.",
        "FIN stiller seg positiv til forslaget, men ber om ytterligere dokumentasjon på kostnadsanslaget. Under forutsetning av at denne fremlegges, anbefaler FIN å stille midlene til disposisjon i 2027-budsjettet.",
        "Departementet har nøye vurdert forslaget og konstaterer at behovene er godt dokumentert. FINs tilrådning er at bevilgningen økes i tråd med forslaget. Midlene forutsettes benyttet til de angitte formålene.",
        "FIN har gjennomgått forslaget og noterer at det bygger på solide faglige vurderinger. Det er likevel noe usikkerhet knyttet til kostnadsanslagene for år 2 og 3. FIN anbefaler bevilgning for 2027, med evaluering innen utgangen av 2028.",
    ];

    private static readonly string[] FinVerbalVariants =
    [
        "FIN tilrår at bevilgningen økes. Styrkingen er godt begrunnet og i tråd med regjeringens prioriteringer.",
        "Finansdepartementet tilrår bevilgning i tråd med departementets forslag. Tiltaket støtter opp om sektormålene og er innenfor budsjettrammene.",
        "FIN anbefaler å gi tilslutning til forslaget. Ressursene vil bidra til nødvendig kapasitetsøkning og styrket måloppnåelse.",
    ];

    private static readonly string[] FinRConclusionVariants =
    [
        "FIN tilrår at det bevilges midler til tiltaket i 2027-budsjettet, og at departementet gis fullmakt til å fordele midlene i tråd med inngåtte avtaler.",
        "Finansdepartementet gir sin tilslutning til forslaget. Det tas forbehold om at den endelige bevilgning fastsettes i statsbudsjettet.",
        "FIN anbefaler å innvilge forslaget med de angitte vilkår. Departementet bes rapportere om måloppnåelse i neste budsjettrunde.",
    ];

    // Q&A pairs (question index → [question, answer])
    private static readonly (string Q, string A)[] QaVariants =
    [
        (
            "Kan departementet redegjøre nærmere for det faktiske ressursbehovet og hva som ligger til grunn for kostnadsanslaget på det omsøkte beløpet?",
            "Kostnadsanslaget er basert på grundige beregninger gjennomført av departementet i samarbeid med relevante etater. Anslaget inkluderer lønnskostnader, driftskostnader og investeringer i nødvendig infrastruktur. Vi viser til vedlagte beregningsgrunnlag og faglig rapport som underbygger tallene."
        ),
        (
            "Har departementet vurdert alternative tilnærminger, og er det mulig å realisere tiltaket med lavere ressursbruk?",
            "Ja, departementet har vurdert tre alternative modeller. Den valgte løsningen er den mest kostnadseffektive etter en helhetlig vurdering. Billigere alternativer ble forkastet fordi de ikke ville gi tilstrekkelig effekt eller medføre uakseptabel risiko for måloppnåelse."
        ),
        (
            "Hva er risikoen ved ikke å gjennomføre tiltaket, og kan departementet kvantifisere konsekvensene?",
            "Uten styrking vil kapasiteten falle under kritisk nivå innen 2028. Konsekvensene er konkret anslått til økte utgifter på sikt gjennom opphopning av restanser, potensielle erstatningskrav og lavere brukertilfredshet. Departementet anslår at alternativkostnaden over fem år er omlag 40 % høyere enn investeringen i tiltaket."
        ),
        (
            "Kan departementet klargjøre hvordan tiltaket forholder seg til øvrige prioriteringer innen sektoren, og er det vurdert opp mot andre satsingsforslag?",
            "Tiltaket er vurdert i en porteføljesammenheng og er prioritert høyest av fagavdelingen grunnet dokumentert behov og høy samfunnsnytte. Det er ikke motstridende interesser med øvrige forslag – disse adresserer ulike deler av sektoren og kan gjennomføres parallelt uten ressurskonflikter."
        ),
        (
            "Hvilke milepæler og leveranser kan departementet forplikte seg til dersom tiltaket innvilges, og på hvilken tidslinje?",
            "Departementet kan levere følgende milepæler: Q1 2027: Etablering av styringsgruppe og detaljert gjennomføringsplan. Q2 2027: Oppstart av tiltak. Q4 2027: Rapportering på første halvårs resultater. Full effekt forventes innen utgangen av 2028. Vi forplikter oss til å rapportere kvartalsvis til FIN."
        ),
        (
            "Er det dokumentert at underliggende etater har nødvendig kapasitet til å ta imot og forvalte de økte midlene på en god måte?",
            "Departementet har gjennomført en kapasitetsvurdering av de berørte etatene. Konklusjonen er at etatene har tilstrekkelig styringskapasitet, men vil ha behov for styrket bemanning ved en større bevilgning. Det er lagt inn midler til økt administrativ kapasitet i anslaget for å sikre god forvaltning av ressursene."
        ),
    ];

    // ── FIN section structure ───────────────────────────────────
    private record FinSectionDef(string Section, string[] DeptCodes,
        (string Email, string Name) AvdDir,
        (string Email, string Name, string[] Depts)[] UndDirs,
        (string Email, string Name, string JobTitle, string[] Depts)[] Saksbehandlere);

    private static readonly FinSectionDef[] FinSectionDefs =
    [
        new("Næringsseksjonen", ["KLD", "ED", "LMD", "NFD", "UD"],
            ("avddir.naering@fin.test.no", "Morten Vik"),
            [
                ("unddir.naering1@fin.test.no", "Silje Haugen", ["KLD", "ED", "LMD"]),
                ("unddir.naering2@fin.test.no", "Tor Berge", ["NFD", "UD"]),
            ],
            [
                ("fin.kld@test.no", "Eva Johansen", "Seniorrådgiver", ["KLD"]),
                ("fin.ed@test.no", "Lars Bakken", "Rådgiver", ["ED"]),
                ("fin.lmd@test.no", "Hilde Strand", "Seniorrådgiver", ["LMD"]),
                ("fin.nfd@test.no", "Geir Lie", "Seniorrådgiver", ["NFD"]),
                ("fin.ud@test.no", "Randi Moen", "Rådgiver", ["UD"]),
            ]
        ),
        new("Statsforvaltningsseksjonen", ["KUD", "FIN-FAG", "SD", "DFD", "JD", "FD"],
            ("avddir.statsforv@fin.test.no", "Kristin Aas"),
            [
                ("unddir.statsforv1@fin.test.no", "Hans Dahl", ["KUD", "FIN-FAG", "SD", "DFD"]),
                ("unddir.statsforv2@fin.test.no", "Berit Lund", ["JD", "FD"]),
            ],
            [
                ("fin.kud@test.no", "Odd Eriksen", "Seniorrådgiver", ["KUD"]),
                ("fin.finfag@test.no", "Turid Nilsen", "Rådgiver", ["FIN-FAG"]),
                ("fin.sd1@test.no", "Dag Solberg", "Seniorrådgiver", ["SD"]),
                ("fin.sd2@test.no", "Gro Hagen", "Førstekonsulent", ["SD"]),
                ("fin.dfd@test.no", "Alf Brekke", "Rådgiver", ["DFD"]),
                ("fin.jd1@test.no", "Siri Jensen", "Seniorrådgiver", ["JD"]),
                ("fin.jd2@test.no", "Nils Aasen", "Rådgiver", ["JD"]),
                ("fin.fd1@test.no", "Liv Rønning", "Seniorrådgiver", ["FD"]),
                ("fin.fd2@test.no", "Svein Bye", "Førstekonsulent", ["FD"]),
            ]
        ),
        new("Overføringsseksjonen", ["HOD", "BFD", "KDD", "KD", "AID"],
            ("avddir.overf@fin.test.no", "Per Olsen"),
            [
                ("unddir.overf1@fin.test.no", "Marit Berg", ["HOD", "BFD", "KDD"]),
                ("unddir.overf2@fin.test.no", "Erik Fjeld", ["KD", "AID"]),
            ],
            [
                ("fin.hod1@test.no", "Anna Pedersen", "Seniorrådgiver", ["HOD"]),
                ("fin.hod2@test.no", "Bjørn Kristiansen", "Rådgiver", ["HOD"]),
                ("fin.bfd@test.no", "Ingrid Andersen", "Seniorrådgiver", ["BFD"]),
                ("fin.kdd@test.no", "Stein Svendsen", "Rådgiver", ["KDD"]),
                ("fin.kd1@test.no", "Marte Hauge", "Seniorrådgiver", ["KD"]),
                ("fin.kd2@test.no", "Jon Larsen", "Førstekonsulent", ["KD"]),
                ("fin.aid1@test.no", "Kari Hansen", "Seniorrådgiver", ["AID"]),
                ("fin.aid2@test.no", "Ole Nordmann", "Rådgiver", ["AID"]),
                ("fin.aid3@test.no", "Grete Holm", "Førstekonsulent", ["AID"]),
            ]
        ),
    ];

    // FAG user names: [saksbehandler, budsjettenhet, underdirektør, avdelingsdirektør, ekspedisjonssjef, departementsråd]
    private static readonly (string First, string Last)[][] FagUserNames =
    [
        [("Kari", "Nordmann"), ("Ole", "Hansen"), ("Marte", "Moen"), ("Gro", "Aas"), ("Randi", "Dahl"), ("Odd", "Lund")],
        [("Eva", "Johansen"), ("Per", "Olsen"), ("Turid", "Svendsen"), ("Dag", "Aasen"), ("Liv", "Brekke"), ("Alf", "Fjeld")],
        [("Anna", "Larsen"), ("Bjørn", "Andersen"), ("Siri", "Vik"), ("Nils", "Rønning"), ("Kristin", "Hauge"), ("Svein", "Bye")],
        [("Ingrid", "Pedersen"), ("Erik", "Nilsen"), ("Else", "Tangen"), ("Trond", "Borge"), ("Hege", "Ås"), ("Leif", "Sten")],
        [("Marit", "Kristiansen"), ("Lars", "Jensen"), ("Solveig", "Ryen"), ("Pål", "Ness"), ("Anita", "Vang"), ("Øyvind", "Eid")],
        [("Hilde", "Berg"), ("Tor", "Haugen"), ("Wenche", "Krog"), ("Helge", "Rud"), ("Bente", "Foss"), ("Arve", "Hol")],
        [("Silje", "Hagen"), ("Hans", "Eriksen"), ("Trine", "Ask"), ("Gunnar", "Sæther"), ("Tonje", "Bø"), ("Ivar", "Rud")],
        [("Berit", "Bakken"), ("Jon", "Solberg"), ("Kirsten", "Lien"), ("Atle", "Rø"), ("Guri", "Sand"), ("Magne", "Eng")],
        [("Marte", "Moen"), ("Stein", "Strand"), ("Åse", "Dybdahl"), ("Rolf", "Bjørk"), ("Inger", "Nes"), ("Kåre", "Furu")],
        [("Gro", "Aas"), ("Geir", "Lie"), ("Ellen", "Lund"), ("Vidar", "Mo"), ("Nina", "Ås"), ("Terje", "Vik")],
        [("Randi", "Dahl"), ("Odd", "Lund"), ("Frøydis", "Hem"), ("Tore", "Li"), ("Heidi", "Dal"), ("Arne", "Ås")],
        [("Turid", "Svendsen"), ("Dag", "Aasen"), ("Sigrid", "Nes"), ("Knut", "Hol"), ("Tone", "Rud"), ("Jan", "Eid")],
        [("Liv", "Brekke"), ("Alf", "Fjeld"), ("Astrid", "Mo"), ("Olav", "Foss"), ("Gerd", "Sand"), ("Roar", "Eng")],
        [("Siri", "Vik"), ("Nils", "Rønning"), ("Jorunn", "Bø"), ("Erlend", "Nes"), ("Karin", "Rud"), ("Bjarne", "Li")],
        [("Kristin", "Hauge"), ("Svein", "Bye"), ("Ragnhild", "Ask"), ("Harald", "Hol"), ("Anne", "Furu"), ("Einar", "Eid")],
        [("Camilla", "Lyng"), ("Thomas", "Rø"), ("Vibeke", "Gran"), ("Steinar", "Mo"), ("Lise", "Skau"), ("Geir", "Dal")],
    ];

    private static readonly string[] FagDeptCodes = ["AID", "BFD", "DFD", "ED", "FD", "HOD", "JD", "KLD", "KDD", "KUD", "KD", "LMD", "NFD", "SD", "UD", "FIN-FAG"];

    // Helper to build a minimal TipTap doc JSON for DepartmentListSection content
    private static string MakeTipTapDoc(params string[] paragraphs) =>
        JsonSerializer.Serialize(new
        {
            type = "doc",
            content = paragraphs.Select(p => new
            {
                type = "paragraph",
                content = new[] { new { type = "text", text = p } }
            }).ToArray()
        });

    private static string Pick(string[] arr, int seed) => arr[((seed % arr.Length) + arr.Length) % arr.Length];

    /// <summary>Drops all data and re-seeds from scratch.</summary>
    public static async Task ResetAndReseedAsync(AppDbContext db)
    {
        // Reset the section counter so IDs are deterministic across resets
        _sectionCounter = 0;

        // Delete in dependency order (children first)
        db.DepartmentListCaseEntries.RemoveRange(db.DepartmentListCaseEntries);
        db.DepartmentListFigures.RemoveRange(db.DepartmentListFigures);
        db.DepartmentListSections.RemoveRange(db.DepartmentListSections);
        db.DepartmentLists.RemoveRange(db.DepartmentLists);
        db.DepartmentListTemplateSections.RemoveRange(db.DepartmentListTemplateSections);
        db.DepartmentListTemplates.RemoveRange(db.DepartmentListTemplates);
        // Break the Case ↔ CaseContent circular FK (Cases.LatestContentId → CaseContents)
        await db.Database.ExecuteSqlRawAsync("UPDATE \"Cases\" SET \"LatestContentId\" = NULL");
        db.RoundFieldOverrides.RemoveRange(db.RoundFieldOverrides);
        db.CaseOpinions.RemoveRange(db.CaseOpinions);
        db.Attachments.RemoveRange(db.Attachments);
        db.CaseEvents.RemoveRange(db.CaseEvents);
        db.CaseContents.RemoveRange(db.CaseContents);
        db.Clearances.RemoveRange(db.Clearances);
        db.SubmissionCases.RemoveRange(db.SubmissionCases);
        db.Submissions.RemoveRange(db.Submissions);
        db.Questions.RemoveRange(db.Questions);
        db.Cases.RemoveRange(db.Cases);
        db.UserDepartmentAssignments.RemoveRange(db.UserDepartmentAssignments);
        db.Users.RemoveRange(db.Users);
        db.BudgetRounds.RemoveRange(db.BudgetRounds);
        db.CaseTypeDefinitions.RemoveRange(db.CaseTypeDefinitions);
        db.Departments.RemoveRange(db.Departments);
        await db.SaveChangesAsync();
        await SeedAsync(db);
    }

    /// <summary>Seeds the database. Idempotent: skips if departments already exist.</summary>
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Departments.AnyAsync())
            return;

        // ── Case Type Definitions ───────────────────────
        var caseTypeDefs = new List<CaseTypeDefinition>
        {
            new()
            {
                Id = G(90, 1), Code = "satsingsforslag", Name = "Satsingsforslag",
                Description = "Nytt initiativ eller vesentlig styrking. Alle felt tilgjengelige.",
                SortOrder = 1,
                FieldsJson = JsonSerializer.Serialize(new[]
                {
                    new { key = "proposalText", label = "Forslag til omtale i materialet", required = true },
                    new { key = "justification", label = "Begrunnelse for forslaget", required = true },
                    new { key = "verbalConclusion", label = "FAGs forslag til verbalkonklusjon", required = false },
                    new { key = "socioeconomicAnalysis", label = "Samfunnsøkonomisk analyse", required = false },
                    new { key = "goalIndicator", label = "Mål og resultatindikator", required = false },
                    new { key = "benefitPlan", label = "Gevinstrealiseringsplan", required = false },
                    new { key = "comment", label = "Kommentar (intern)", required = false },
                }),
            },
            new()
            {
                Id = G(90, 2), Code = "budsjettiltak", Name = "Budsjettiltak",
                Description = "Endring i eksisterende bevilgning. Forenklet skjema.",
                SortOrder = 2,
                FieldsJson = JsonSerializer.Serialize(new[]
                {
                    new { key = "proposalText", label = "Forslag til omtale", required = true },
                    new { key = "justification", label = "Begrunnelse", required = true },
                    new { key = "comment", label = "Kommentar", required = false },
                }),
            },
            new()
            {
                Id = G(90, 3), Code = "teknisk_justering", Name = "Teknisk justering",
                Description = "Teknisk justering av bevilgning. Minimalt skjema.",
                SortOrder = 3,
                FieldsJson = JsonSerializer.Serialize(new[]
                {
                    new { key = "justification", label = "Begrunnelse", required = true },
                    new { key = "comment", label = "Kommentar", required = false },
                }),
            },
            new()
            {
                Id = G(90, 4), Code = "andre_saker", Name = "Andre saker",
                Description = "Forslag til budsjettet som ikke innebærer endring av bevilgning.",
                SortOrder = 4,
                FieldsJson = JsonSerializer.Serialize(new[]
                {
                    new { key = "proposalText", label = "Beskrivelse av saken", required = true },
                    new { key = "justification", label = "Begrunnelse", required = true },
                    new { key = "verbalConclusion", label = "Forslag til verbal omtale", required = false },
                    new { key = "comment", label = "Kommentar (intern)", required = false },
                }),
            },
        };
        db.CaseTypeDefinitions.AddRange(caseTypeDefs);

        // ── Departments ─────────────────────────────────
        var deptEntities = new List<Department>();
        for (var i = 0; i < Departments.Length; i++)
        {
            deptEntities.Add(new Department
            {
                Id = G(10, i + 1),
                Code = Departments[i].Code,
                Name = Departments[i].Name,
            });
        }
        db.Departments.AddRange(deptEntities);

        var deptByCode = deptEntities.ToDictionary(d => d.Code);
        var finDeptId = deptByCode["FIN"].Id;

        // ── Users & DepartmentAssignments ─────────────────
        var userEntities = new List<User>();
        var deptAssignments = new List<UserDepartmentAssignment>();
        var userIdCounter = 0;
        var assignmentIdCounter = 0;

        Guid NextUserId() => G(20, ++userIdCounter);

        void AddAssignment(Guid userId, string deptCode, bool isPrimary)
        {
            deptAssignments.Add(new UserDepartmentAssignment
            {
                Id = G(25, ++assignmentIdCounter),
                UserId = userId,
                DepartmentId = deptByCode[deptCode].Id,
                IsPrimary = isPrimary,
            });
        }

        // Build FIN saksbehandler→dept mapping as we create users
        var finSaksbehandlerByDept = new Dictionary<string, Guid>();

        // ── FIN users ──────────────────────────────────
        foreach (var sec in FinSectionDefs)
        {
            // Avdelingsdirektør
            var avdDirId = NextUserId();
            var avdDirResolved = RoleResolver.Resolve("Avdelingsdirektør", "FIN");
            userEntities.Add(new User
            {
                Id = avdDirId, Email = sec.AvdDir.Email, FullName = sec.AvdDir.Name,
                DepartmentId = finDeptId, Role = avdDirResolved.Role,
                JobTitle = "Avdelingsdirektør", LeaderLevel = avdDirResolved.LeaderLevel,
                Division = "Budsjettavdelingen", Section = sec.Section,
            });
            foreach (var dc in sec.DeptCodes)
                AddAssignment(avdDirId, dc, dc == sec.DeptCodes[0]);

            // Underdirektører
            foreach (var und in sec.UndDirs)
            {
                var undId = NextUserId();
                var undResolved = RoleResolver.Resolve("Underdirektør", "FIN");
                userEntities.Add(new User
                {
                    Id = undId, Email = und.Email, FullName = und.Name,
                    DepartmentId = finDeptId, Role = undResolved.Role,
                    JobTitle = "Underdirektør", LeaderLevel = undResolved.LeaderLevel,
                    Division = "Budsjettavdelingen", Section = sec.Section,
                });
                foreach (var dc in und.Depts)
                    AddAssignment(undId, dc, dc == und.Depts[0]);
            }

            // Saksbehandlere
            foreach (var sb in sec.Saksbehandlere)
            {
                var sbId = NextUserId();
                var sbResolved = RoleResolver.Resolve(sb.JobTitle, "FIN");
                userEntities.Add(new User
                {
                    Id = sbId, Email = sb.Email, FullName = sb.Name,
                    DepartmentId = finDeptId, Role = sbResolved.Role,
                    JobTitle = sb.JobTitle, LeaderLevel = sbResolved.LeaderLevel,
                    Division = "Budsjettavdelingen", Section = sec.Section,
                });
                foreach (var dc in sb.Depts)
                {
                    AddAssignment(sbId, dc, dc == sb.Depts[0]);
                    if (!finSaksbehandlerByDept.ContainsKey(dc))
                        finSaksbehandlerByDept[dc] = sbId;
                }
            }
        }

        // Ekspedisjonssjef FIN
        var ekspSjefId = NextUserId();
        var ekspResolved = RoleResolver.Resolve("Ekspedisjonssjef", "FIN");
        userEntities.Add(new User
        {
            Id = ekspSjefId, Email = "ekspsjef.fin@test.no", FullName = "Arne Lindgren",
            DepartmentId = finDeptId, Role = ekspResolved.Role,
            JobTitle = "Ekspedisjonssjef", LeaderLevel = ekspResolved.LeaderLevel,
            Division = "Budsjettavdelingen", Section = null,
        });
        foreach (var sec in FinSectionDefs)
            foreach (var dc in sec.DeptCodes)
                AddAssignment(ekspSjefId, dc, false);

        // Departementsråd FIN
        var depRaadId = NextUserId();
        var depRaadResolved = RoleResolver.Resolve("Departementsråd", "FIN");
        userEntities.Add(new User
        {
            Id = depRaadId, Email = "depraad.fin@test.no", FullName = "Elisabeth Torp",
            DepartmentId = finDeptId, Role = depRaadResolved.Role,
            JobTitle = "Departementsråd", LeaderLevel = depRaadResolved.LeaderLevel,
            Division = null, Section = null,
        });
        foreach (var dept in deptEntities.Where(d => d.Code != "FIN"))
            AddAssignment(depRaadId, dept.Code, false);

        // Administrator
        var adminId = NextUserId();
        userEntities.Add(new User
        {
            Id = adminId, Email = "admin@test.no", FullName = "Admin Bruker",
            DepartmentId = finDeptId, Role = "administrator",
            Division = "Budsjettavdelingen", Section = null,
        });

        // ── FAG users (6 per department) ──────────────────
        // Map: deptCode → [fagId, budsjettId]
        var fagUserByDept = new Dictionary<string, (Guid FagId, Guid BudsjettId)>();

        for (var dIdx = 0; dIdx < FagDeptCodes.Length; dIdx++)
        {
            var deptCode = FagDeptCodes[dIdx];
            var deptId = deptByCode[deptCode].Id;
            var names = FagUserNames[dIdx];
            var divisions = DeptDivisions.GetValueOrDefault(deptCode, ["Fagavdelingen", "Administrasjonsavdelingen"]);
            var code = deptCode.ToLower();

            // 0: Saksbehandler
            var fagId = NextUserId();
            var sbResolved = RoleResolver.Resolve("Seniorrådgiver", deptCode);
            userEntities.Add(new User
            {
                Id = fagId, Email = $"fag.{code}@test.no",
                FullName = $"{names[0].First} {names[0].Last}",
                DepartmentId = deptId, Role = sbResolved.Role,
                JobTitle = "Seniorrådgiver", LeaderLevel = null,
                Division = divisions[0], Section = "Seksjon 1",
            });

            // 1: Budsjettenhet
            var budsjettId = NextUserId();
            var beResolved = RoleResolver.Resolve("Rådgiver", deptCode, isBudsjettenhet: true);
            userEntities.Add(new User
            {
                Id = budsjettId, Email = $"budsjett.{code}@test.no",
                FullName = $"{names[1].First} {names[1].Last}",
                DepartmentId = deptId, Role = beResolved.Role,
                JobTitle = "Rådgiver", LeaderLevel = null,
                Division = divisions.Length > 1 ? divisions[1] : divisions[0], Section = null,
            });

            fagUserByDept[deptCode] = (fagId, budsjettId);

            // 2: Underdirektør
            var undResolved = RoleResolver.Resolve("Underdirektør", deptCode);
            userEntities.Add(new User
            {
                Id = NextUserId(), Email = $"unddir.{code}@test.no",
                FullName = $"{names[2].First} {names[2].Last}",
                DepartmentId = deptId, Role = undResolved.Role,
                JobTitle = "Underdirektør", LeaderLevel = undResolved.LeaderLevel,
                Division = divisions[0], Section = "Seksjon 1",
            });

            // 3: Avdelingsdirektør
            var adResolved = RoleResolver.Resolve("Avdelingsdirektør", deptCode);
            userEntities.Add(new User
            {
                Id = NextUserId(), Email = $"avddir.{code}@test.no",
                FullName = $"{names[3].First} {names[3].Last}",
                DepartmentId = deptId, Role = adResolved.Role,
                JobTitle = "Avdelingsdirektør", LeaderLevel = adResolved.LeaderLevel,
                Division = divisions[0], Section = null,
            });

            // 4: Ekspedisjonssjef
            var esResolved = RoleResolver.Resolve("Ekspedisjonssjef", deptCode);
            userEntities.Add(new User
            {
                Id = NextUserId(), Email = $"ekspsjef.{code}@test.no",
                FullName = $"{names[4].First} {names[4].Last}",
                DepartmentId = deptId, Role = esResolved.Role,
                JobTitle = "Ekspedisjonssjef", LeaderLevel = esResolved.LeaderLevel,
                Division = divisions[0], Section = null,
            });

            // 5: Departementsråd
            var drResolved = RoleResolver.Resolve("Departementsråd", deptCode);
            userEntities.Add(new User
            {
                Id = NextUserId(), Email = $"depraad.{code}@test.no",
                FullName = $"{names[5].First} {names[5].Last}",
                DepartmentId = deptId, Role = drResolved.Role,
                JobTitle = "Departementsråd", LeaderLevel = drResolved.LeaderLevel,
                Division = null, Section = null,
            });
        }

        db.Users.AddRange(userEntities);
        db.UserDepartmentAssignments.AddRange(deptAssignments);

        // ── Budget Rounds ───────────────────────────────
        var roundAug = new BudgetRound
        {
            Id = G(30, 1), Name = "AUG2026", Type = "august", Year = 2026,
            Status = "open", Deadline = new DateTime(2026, 8, 15, 23, 59, 59, DateTimeKind.Utc),
        };
        var roundMars = new BudgetRound
        {
            Id = G(30, 2), Name = "MARS2026", Type = "mars", Year = 2026,
            Status = "closed", Deadline = new DateTime(2026, 3, 1, 23, 59, 59, DateTimeKind.Utc),
            ClosedAt = new DateTime(2026, 3, 15, 12, 0, 0, DateTimeKind.Utc),
        };
        db.BudgetRounds.AddRange(roundAug, roundMars);

        // ── Cases (40 per FAG department = 640 total) ───
        var caseCount = 0;
        var contentCount = 0;
        var eventCount = 0;
        var questionCount = 0;
        var chapters = new[] { "200", "225", "260", "300", "400", "500", "600", "700", "800", "900",
            "1000", "1100", "1200", "1300", "1400", "1500", "1600", "1700", "1800", "1900" };

        // Track all case IDs that end up in FIN for later use in dept lists
        var finCasesByDept = new Dictionary<string, List<Guid>>();

        foreach (var dept in deptEntities.Where(d => d.Code != "FIN"))
        {
            var (fagId, budsjettId) = fagUserByDept[dept.Code];
            var topics = DeptTopics.GetValueOrDefault(dept.Code, ["generelt tiltak", "internt prosjekt", "driftsoptimalisering"]);
            var divisions = DeptDivisions.GetValueOrDefault(dept.Code, ["Fagavdelingen"]);
            var finSbId = finSaksbehandlerByDept.GetValueOrDefault(dept.Code, ekspSjefId);

            finCasesByDept[dept.Code] = [];

            for (var i = 0; i < 40; i++)
            {
                caseCount++;
                var caseType = CaseTypes[i % CaseTypes.Length];
                var isMarsRound = i >= 30;
                var isAndreSaker = caseType == "andre_saker";

                string status;
                if (isMarsRound)
                    status = "regjeringsbehandlet";
                else
                    status = AugStatuses[i];

                var isFinStatus = status is "sendt_til_fin" or "under_vurdering_fin" or "ferdigbehandlet_fin";

                var topic = topics[i % topics.Length];
                var template = CaseNameTemplates[i % CaseNameTemplates.Length];
                var caseName = string.Format(template, topic);
                var chapter = chapters[i % chapters.Length];
                var post = ((i % 9) * 10 + 1).ToString("D2");
                var amount = isAndreSaker ? (long?)null : (long)((i + 1) * 15000 + (i % 3 == 0 ? -1 : 1) * (i + 1) * 3000);
                var finAmount = isFinStatus && !isAndreSaker ? (long?)(amount! * 85 / 100) : null;
                var govAmount = status == "ferdigbehandlet_fin" && !isAndreSaker ? (long?)(amount! * 90 / 100) : null;

                var caseId = G(40, caseCount);
                var caseCreatedAt = SeedDate.AddDays(caseCount / 10);
                var caseUpdatedAt = isFinStatus
                    ? caseCreatedAt.AddDays(14)
                    : caseCreatedAt.AddDays(7);

                var assignedTo = isFinStatus ? budsjettId : (i % 3 == 0 ? fagId : budsjettId);

                int numVersions = status switch
                {
                    "klarert" => 2,
                    "godkjent_pol" => 2,
                    "sendt_til_fin" => 3,
                    "under_vurdering_fin" => 4,
                    "ferdigbehandlet_fin" => 4,
                    "regjeringsbehandlet" => 2,
                    _ => 1,
                };

                // Seed = deterministic mix of dept and case index
                var seed = (Array.IndexOf(FagDeptCodes, dept.Code) * 7 + i);

                // Version 1 content — initial draft
                var v1ProposalText = (caseType != "teknisk_justering" && caseType != "andre_saker")
                    ? $"UTKAST: {caseName}. Departementet vurderer å fremme forslag om styrking av {topic}."
                    : null;
                var v1Justification = $"Foreløpig begrunnelse: {caseName.ToLower()} er identifisert som et prioritert behov av fagavdelingen.";

                // Latest content — fully filled
                var latestProposalText = (caseType != "teknisk_justering")
                    ? string.Format(Pick(ProposalTextVariants, seed), Math.Abs(amount ?? 50) / 1_000_000)
                    : null;
                var latestJustification = Pick(JustificationVariants, seed + 1);
                var latestVerbalConclusion = (caseType is "satsingsforslag" or "andre_saker")
                    ? string.Format(Pick(VerbalConclusionVariants, seed + 2), Math.Abs(amount ?? 50) / 1_000_000)
                    : null;
                var latestSocioeconomic = caseType == "satsingsforslag"
                    ? string.Format(Pick(SocioeconomicVariants, seed + 3), Math.Abs(amount ?? 50) / 1_000_000 * 3)
                    : null;
                var latestGoalIndicator = caseType == "satsingsforslag" ? Pick(GoalIndicatorVariants, seed + 4) : null;
                var latestBenefitPlan = caseType == "satsingsforslag" ? Pick(BenefitPlanVariants, seed + 5) : null;
                var latestComment = (i % 5 == 0) ? "Intern merknad: Koordinert med tilgrensende tiltak i sektoren. Tallgrunnlag bekreftet av budsjettenheten." : null;
                var latestFinAssessment = isFinStatus ? Pick(FinAssessmentVariants, seed + 6) : null;
                var latestFinVerbal = isFinStatus ? Pick(FinVerbalVariants, seed + 7) : null;
                var latestFinRConclusion = isFinStatus ? Pick(FinRConclusionVariants, seed + 8) : null;

                db.Cases.Add(new Case
                {
                    Id = caseId,
                    BudgetRoundId = isMarsRound ? roundMars.Id : roundAug.Id,
                    DepartmentId = dept.Id,
                    CaseName = caseName,
                    Chapter = isAndreSaker ? null : chapter,
                    Post = isAndreSaker ? null : post,
                    Amount = amount,
                    FinAmount = finAmount,
                    GovAmount = govAmount,
                    CaseType = caseType,
                    Status = status,
                    AssignedTo = assignedTo,
                    FinAssignedTo = isFinStatus ? finSbId : null,
                    CreatedBy = fagId,
                    ResponsibleDivision = divisions[i % divisions.Length],
                    PriorityNumber = caseType == "satsingsforslag" ? (i % 8 + 1) : null,
                    FinListPlacement = (caseType == "satsingsforslag" && i % 3 != 2) ? "a_list" : null,
                    Version = numVersions,
                    // LatestContentId set via SQL after SaveChanges to avoid circular FK on insert
                    CreatedAt = caseCreatedAt,
                    UpdatedAt = caseUpdatedAt,
                });

                if (isFinStatus) finCasesByDept[dept.Code].Add(caseId);

                // ── Content versions ───────────────────────────
                for (var v = 1; v <= numVersions; v++)
                {
                    contentCount++;
                    var isLatest = v == numVersions;
                    var vDate = caseCreatedAt.AddDays((v - 1) * 5);
                    var vStatus = v < numVersions ? "under_arbeid" : status;
                    var vCreatedBy = (v == 1) ? fagId : budsjettId;

                    db.CaseContents.Add(new CaseContent
                    {
                        Id = G(50, contentCount),
                        CaseId = caseId,
                        Version = v,
                        CaseName = caseName,
                        Chapter = isAndreSaker ? null : chapter,
                        Post = isAndreSaker ? null : post,
                        Amount = amount,
                        FinAmount = isLatest ? finAmount : null,
                        Status = vStatus,
                        ProposalText = isLatest ? latestProposalText : (v == 1 ? v1ProposalText : latestProposalText),
                        Justification = isLatest ? latestJustification : (v == 1 ? v1Justification : latestJustification),
                        VerbalConclusion = (isLatest || v >= 2) ? latestVerbalConclusion : null,
                        SocioeconomicAnalysis = (isLatest || v >= 3) ? latestSocioeconomic : null,
                        GoalIndicator = (isLatest || v >= 3) ? latestGoalIndicator : null,
                        BenefitPlan = (isLatest || v >= 3) ? latestBenefitPlan : null,
                        Comment = isLatest ? latestComment : null,
                        FinAssessment = isLatest ? latestFinAssessment : null,
                        FinVerbal = isLatest ? latestFinVerbal : null,
                        FinRConclusion = isLatest ? latestFinRConclusion : null,
                        CreatedBy = vCreatedBy,
                        CreatedAt = vDate,
                    });
                }

                // ── Case event: created ────────────────────────
                eventCount++;
                db.CaseEvents.Add(new CaseEvent
                {
                    Id = G(60, eventCount),
                    CaseId = caseId,
                    EventType = "created",
                    UserId = fagId,
                    EventData = JsonSerializer.Serialize(new { case_name = caseName, case_type = caseType }),
                    CreatedAt = caseCreatedAt,
                });

                // ── Case event: status transitions ─────────────
                if (status != "under_arbeid" && !isMarsRound)
                {
                    eventCount++;
                    db.CaseEvents.Add(new CaseEvent
                    {
                        Id = G(60, eventCount),
                        CaseId = caseId,
                        EventType = "status_changed",
                        UserId = budsjettId,
                        EventData = JsonSerializer.Serialize(new { from = "under_arbeid", to = "klarert" }),
                        CreatedAt = caseCreatedAt.AddDays(6),
                    });
                }

                if (status is "godkjent_pol" or "sendt_til_fin" or "under_vurdering_fin" or "ferdigbehandlet_fin")
                {
                    eventCount++;
                    db.CaseEvents.Add(new CaseEvent
                    {
                        Id = G(60, eventCount),
                        CaseId = caseId,
                        EventType = "status_changed",
                        UserId = budsjettId,
                        EventData = JsonSerializer.Serialize(new { from = "klarert", to = "godkjent_pol" }),
                        CreatedAt = caseCreatedAt.AddDays(10),
                    });
                }

                if (status is "sendt_til_fin" or "under_vurdering_fin" or "ferdigbehandlet_fin")
                {
                    eventCount++;
                    db.CaseEvents.Add(new CaseEvent
                    {
                        Id = G(60, eventCount),
                        CaseId = caseId,
                        EventType = "status_changed",
                        UserId = budsjettId,
                        EventData = JsonSerializer.Serialize(new { from = "godkjent_pol", to = "sendt_til_fin" }),
                        CreatedAt = caseCreatedAt.AddDays(15),
                    });
                }

                if (status is "under_vurdering_fin" or "ferdigbehandlet_fin")
                {
                    eventCount++;
                    db.CaseEvents.Add(new CaseEvent
                    {
                        Id = G(60, eventCount),
                        CaseId = caseId,
                        EventType = "status_changed",
                        UserId = finSbId,
                        EventData = JsonSerializer.Serialize(new { from = "sendt_til_fin", to = "under_vurdering_fin" }),
                        CreatedAt = caseCreatedAt.AddDays(18),
                    });
                }

                if (status == "ferdigbehandlet_fin")
                {
                    eventCount++;
                    db.CaseEvents.Add(new CaseEvent
                    {
                        Id = G(60, eventCount),
                        CaseId = caseId,
                        EventType = "status_changed",
                        UserId = finSbId,
                        EventData = JsonSerializer.Serialize(new { from = "under_vurdering_fin", to = "ferdigbehandlet_fin" }),
                        CreatedAt = caseCreatedAt.AddDays(28),
                    });
                }

                // ── Q&A threads for FIN cases ──────────────────
                if (isFinStatus)
                {
                    int numQuestions = status switch
                    {
                        "sendt_til_fin" => 3,
                        "under_vurdering_fin" => 4,
                        "ferdigbehandlet_fin" => 3,
                        _ => 0,
                    };

                    for (var q = 0; q < numQuestions; q++)
                    {
                        questionCount++;
                        var qa = QaVariants[(seed + q) % QaVariants.Length];
                        var qDate = caseCreatedAt.AddDays(20 + q * 2);

                        // For ferdigbehandlet: all answered. For under_vurdering: 3 of 4 answered. For sendt_til_fin: 2 of 3 answered.
                        bool isAnswered = status switch
                        {
                            "ferdigbehandlet_fin" => true,
                            "under_vurdering_fin" => q < 3,
                            "sendt_til_fin" => q < 2,
                            _ => false,
                        };

                        db.Questions.Add(new Question
                        {
                            Id = G(70, questionCount),
                            CaseId = caseId,
                            AskedBy = finSbId,
                            QuestionText = qa.Q,
                            AnswerText = isAnswered ? qa.A : null,
                            AnsweredBy = isAnswered ? fagId : null,
                            CreatedAt = qDate,
                            AnsweredAt = isAnswered ? qDate.AddDays(3) : null,
                        });
                    }
                }
            }
        }

        await db.SaveChangesAsync();

        // Resolve LatestContentId: set each Case's pointer to its highest-version CaseContent
        await db.Database.ExecuteSqlRawAsync(
            """
            UPDATE "Cases"
            SET "LatestContentId" = cc."Id"
            FROM "CaseContents" cc
            WHERE cc."CaseId" = "Cases"."Id"
              AND cc."Version" = "Cases"."Version"
            """);

        // ===== Seed Department List Template: Mars Conference =====
        await SeedMarsConferenceTemplate(db);

        // ===== Seed Department List Instances =====
        await SeedDepartmentListInstances(db, deptByCode, finCasesByDept, adminId, G(30, 2));
    }

    private static async Task SeedMarsConferenceTemplate(AppDbContext db)
    {
        if (await db.DepartmentListTemplates.AnyAsync()) return;

        var templateId = G(80, 1);
        var adminId = G(10, 1); // First FIN user

        var template = new DepartmentListTemplate
        {
            Id = templateId,
            Name = "Marskonferansen 2027",
            BudgetRoundType = "mars",
            DepartmentNamePlaceholder = "XX",
            IsActive = true,
            ClassificationText = "STRENGT FORTROLIG jf. statsbudsjettet, kgl. res. av 22.12.2023",
            CreatedBy = adminId,
            CreatedAt = SeedDate,
            UpdatedAt = SeedDate,
        };

        db.DepartmentListTemplates.Add(template);

        int sortOrder = 0;

        // 1. Department header
        var s1 = AddSection(db, templateId, null, ++sortOrder,
            "{department_name}departementet",
            "Deplisteoverskrift1", "department_header", null);

        // 1.1 Mal, status og prioriteringer
        var s1_1 = AddSection(db, templateId, s1, ++sortOrder,
            "Mal, status og prioriteringer for firearsperioden",
            "Deplisteoverskrift2", "fixed_content", null);

        // 1.1 - Table placeholder
        AddSection(db, templateId, s1_1, ++sortOrder,
            "Mal og statusvurdering",
            "Deplisteoverskrift3", "fixed_content",
            @"{""description"":""Tabell med mal og statusvurdering (trafikklysikoner)""}");

        // 1.1 - Figure placeholder
        AddSection(db, templateId, s1_1, ++sortOrder,
            "Budsjettutvikling",
            "Deplisteoverskrift3", "figure_placeholder",
            @"{""figures"":[{""type"":""sector_diagram"",""caption"":""Sektordiagram med budsjettall""},{""type"":""bar_chart"",""caption"":""Stolpediagram med budsjettendringer""}]}");

        // 1.1 - Overordnet om strukturarbeid
        AddSection(db, templateId, s1_1, ++sortOrder,
            "Overordnet om strukturarbeid og prioriteringer",
            "Overskrift7", "freetext", null);

        // 1.1.x Utdypende om utvalgte temaer
        AddSection(db, templateId, s1_1, ++sortOrder,
            "Utdypende om utvalgte budsjettprioriteringer",
            "Deplisteoverskrift3", "freetext", null);

        // 1.2 Beslutninger om 2027-budsjettet
        var s1_2 = AddSection(db, templateId, s1, ++sortOrder,
            "Beslutninger om 2027-budsjettet",
            "Deplisteoverskrift2", "fixed_content", null);

        // 1.2 - Budget changes figure
        AddSection(db, templateId, s1_2, ++sortOrder,
            "Budsjettendringer",
            "Deplisteoverskrift3", "figure_placeholder",
            @"{""figures"":[{""type"":""bar_chart"",""caption"":""Stolpediagram med budsjettendringer""}]}");

        // 1.2.1 Innsparingstiltak
        var s1_2_1 = AddSection(db, templateId, s1_2, ++sortOrder,
            "Innsparingstiltak",
            "Deplisteoverskrift3", "case_group",
            @"{""case_type_filter"":""budsjettiltak"",""subgroup_field"":""fin_list_placement"",""subgroups"":[{""value"":""a_list"",""title"":""Omtale av innsparingstiltak som helt eller delvis fores pa A-listen""},{""value"":""b_list"",""title"":""Omtale av innsparingstiltak pa B-listen""}],""summary_table"":false}");

        // A-list subgroup
        AddSection(db, templateId, s1_2_1, ++sortOrder,
            "Omtale av innsparingstiltak som helt eller delvis fores pa A-listen",
            "Overskrift5", "case_subgroup",
            @"{""list_placement"":""a_list""}");

        // B-list subgroup
        AddSection(db, templateId, s1_2_1, ++sortOrder,
            "Omtale av innsparingstiltak pa B-listen",
            "Overskrift5", "case_subgroup",
            @"{""list_placement"":""b_list""}");

        // Case entry template for innsparinger
        AddSection(db, templateId, s1_2_1, ++sortOrder,
            "{case_name}",
            "Overskrift7", "case_entry_template",
            @"{""heading_format"":""{case_name}"",""fields"":[{""key"":""proposal_text"",""render_as"":""paragraph""}]}");

        // 1.2.2 Satsingsforslag
        var s1_2_2 = AddSection(db, templateId, s1_2, ++sortOrder,
            "Satsingsforslag",
            "Deplisteoverskrift3", "case_group",
            @"{""case_type_filter"":""satsingsforslag"",""subgroup_field"":""fin_list_placement"",""subgroups"":[{""value"":""a_list"",""title"":""Omtale av satsingsforslag som helt eller delvis fores pa A-listen""},{""value"":""b_list"",""title"":""Omtale av satsingsforslag som ikke fores pa A-listen""}],""intro_text_template"":""FIN tilraar at det fores satsingsforslag pa til sammen {total_amount} mill. kroner pa A-listen under {department_name}."",""summary_table"":true}");

        // Summary table
        AddSection(db, templateId, s1_2_2, ++sortOrder,
            "Oppsummering satsingsforslag",
            "Overskrift5", "auto_table",
            @"{""table_type"":""satsingsforslag_summary"",""columns"":[""priority"",""case_name"",""amount"",""fin_amount""]}");

        // A-list subgroup for satsingsforslag
        AddSection(db, templateId, s1_2_2, ++sortOrder,
            "Omtale av satsingsforslag som helt eller delvis fores pa A-listen",
            "Overskrift5", "case_subgroup",
            @"{""list_placement"":""a_list""}");

        // B-list subgroup for satsingsforslag
        AddSection(db, templateId, s1_2_2, ++sortOrder,
            "Omtale av satsingsforslag som ikke fores pa A-listen",
            "Overskrift5", "case_subgroup",
            @"{""list_placement"":""b_list""}");

        // Case entry template for satsingsforslag
        AddSection(db, templateId, s1_2_2, ++sortOrder,
            "{department_abbrev}s pri. {priority} {case_name}",
            "Overskrift7", "case_entry_template",
            @"{""heading_format"":""{department_abbrev}s pri. {priority} {case_name}"",""fields"":[{""key"":""proposal_text"",""render_as"":""paragraph""},{""key"":""amount"",""render_as"":""inline"",""format"":""{department_abbrev}s forslag: {value} mill. kroner""},{""key"":""fin_amount"",""render_as"":""inline"",""format"":""FINs tilraading: {value} mill. kroner fores pa A-listen""}]}");

        // 1.3 Andre viktige beslutninger
        var s1_3 = AddSection(db, templateId, s1, ++sortOrder,
            "Andre viktige beslutninger",
            "Deplisteoverskrift2", "decisions_section",
            @"{""has_conclusion"":true,""conclusion_style"":""Konklusjonbokstavert"",""conclusion_numbering"":""alphabetic"",""fields"":[{""key"":""description"",""render_as"":""paragraph""},{""key"":""fin_r_conclusion"",""render_as"":""conclusion_list""}]}");

        // Case entry template for decisions
        AddSection(db, templateId, s1_3, ++sortOrder,
            "{case_name}",
            "Deplisteoverskrift3", "case_entry_template",
            @"{""heading_format"":""{case_name}"",""fields"":[{""key"":""description"",""render_as"":""paragraph""},{""key"":""fin_r_conclusion"",""render_as"":""conclusion_list""}]}");

        // 1.4 Omtalesaker
        var s1_4 = AddSection(db, templateId, s1, ++sortOrder,
            "Omtalesaker",
            "Deplisteoverskrift2", "summary_section",
            @"{""case_type_filter"":""andre_saker""}");

        // Case entry template for omtalesaker
        AddSection(db, templateId, s1_4, ++sortOrder,
            "{case_name}",
            "Deplisteoverskrift3", "case_entry_template",
            @"{""heading_format"":""{case_name}"",""fields"":[{""key"":""proposal_text"",""render_as"":""paragraph""}]}");

        await db.SaveChangesAsync();
    }

    private static async Task SeedDepartmentListInstances(
        AppDbContext db,
        Dictionary<string, Department> deptByCode,
        Dictionary<string, List<Guid>> finCasesByDept,
        Guid createdBy,
        Guid marsRoundId)
    {
        if (await db.DepartmentLists.AnyAsync()) return;

        var templateId = G(80, 1);

        // 5 departments to create lists for
        var listDeptCodes = new[] { "AID", "HOD", "KD", "NFD", "SD" };

        // Template section IDs (matches SeedMarsConferenceTemplate section counter 1..21)
        // Map: position index → template section ID
        // Parent relationships (by position index, 0-based):
        // 0:null, 1:0, 2:1, 3:1, 4:1, 5:1, 6:0, 7:6, 8:6, 9:8, 10:8, 11:8, 12:6, 13:12, 14:12, 15:12, 16:12, 17:0, 18:17, 19:0, 20:19
        var templateSectionIds = Enumerable.Range(1, 21).Select(n => G(81, n)).ToArray();
        var sectionParentIdxMap = new int?[] { null, 0, 1, 1, 1, 1, 0, 6, 6, 8, 8, 8, 6, 12, 12, 12, 12, 0, 17, 0, 19 };
        var sectionSortOrders = Enumerable.Range(1, 21).ToArray();

        // Free-text content for sections at positions 4 and 5 (indices 4, 5 → sortOrder 5, 6)
        var freetextContentByDeptCode = new Dictionary<string, (string Structural, string Priorities)>
        {
            ["AID"] = (
                "Arbeids- og inkluderingsdepartementet (AID) har de siste fire årene gjennomført en bred modernisering av arbeidsmarkedstiltakene, med særlig vekt på digitalisering av NAV og styrket inkluderingsinnsats. Budsjettutviklingen viser en moderat realvekst i perioden, med økt prioritering av tjenester til utsatte grupper.",
                "I 2027 prioriterer AID tre satsinger: (1) Styrket digitalisering av NAV-tjenestene, (2) Økt innsats for inkludering av innvandrere i arbeidslivet, (3) Videreføring av dagpengeordningen med oppdaterte satser. FIN anbefaler at satsingsforslag 1 og 2 innvilges med redusert ramme på til sammen 85 mill. kroner."
            ),
            ["HOD"] = (
                "Helse- og omsorgsdepartementet (HOD) har i fireårsperioden 2024–2027 gjennomført en historisk satsing på sykehusøkonomi, psykisk helse og fastlegeordningen. Reelle driftsutgifter er økt med 4,2 prosent i perioden, finansiert gjennom en kombinasjon av økte bevilgninger og effektiviseringstiltak.",
                "HODs prioriteringer for 2027 er: (1) Styrket kapasitet i psykisk helsevern – satsing på 120 mill. kroner, (2) Fastlegeordningens bærekraft – 65 mill. kroner til rekrutteringstiltak, (3) Teknologiløft i spesialisthelsetjenesten – 90 mill. kroner. FIN tilrår satsing 1 og 2 i sin helhet og satsing 3 med 80 % av omsøkt beløp."
            ),
            ["KD"] = (
                "Kunnskapsdepartementet (KD) har i perioden 2024–2027 økt satsingen på forskning og høyere utdanning med om lag 3,8 prosent realt. Studentvelferd og fagskoler har mottatt særlig styrking, mens grunnopplæringen har hatt mer moderat vekst grunnet demografiske forhold.",
                "KDs prioriteringer for 2027: (1) Styrket studentvelferd og hybeltilbud – 85 mill. kroner, (2) Kompetansereformen og etter- og videreutdanning – 110 mill. kroner, (3) Kvalitetsløft i fagskolesektoren – 45 mill. kroner. FIN anbefaler alle tre satsingsforslag, med en samlet ramme på 220 mill. kroner (95 % av omsøkt)."
            ),
            ["NFD"] = (
                "Nærings- og fiskeridepartementet (NFD) forvalter en bred portefølje av nærings- og innovasjonspolitiske virkemidler. I perioden 2024–2027 er Innovasjon Norges rammer styrket og havbrukstilsynet modernisert. Eksportfremme og grønn industriomstilling er løftet som strategiske satsingsområder.",
                "NFDs prioriteringer for 2027: (1) Styrket Innovasjon Norge – økt bevilgning med 95 mill. kroner, (2) Havbrukskontroll og bærekraftsvurdering – 35 mill. kroner, (3) Grønn industriomstilling og mineralnæring – 75 mill. kroner. FIN tilrår satsingsforslag 1 fullt ut og satsingsforslag 3 med 80 % av omsøkt beløp."
            ),
            ["SD"] = (
                "Samferdselsdepartementet (SD) forvalter store investeringer i veg, bane og kollektivtransport. Perioden 2024–2027 er preget av igangsetting av store prosjekter under Nasjonal transportplan, med til dels krevende kostnadsstyring. Jernbane og klimavennlig transport har blitt styrket som politisk prioritet.",
                "SDs prioriteringer for 2027: (1) Jernbaneinvesteringer i tråd med NTP – 430 mill. kroner (A-listen), (2) Kollektivtransport og nullutslippsferjestøtte – 120 mill. kroner, (3) Trafikksikkerhetstiltak på riksveg – 65 mill. kroner. FIN tilrår alle tre satsingsforslag, men anbefaler at satsing 1 ses i sammenheng med pågående KVU-prosesser."
            ),
        };

        var depListSectionCount = 0;

        for (var listIdx = 0; listIdx < listDeptCodes.Length; listIdx++)
        {
            var deptCode = listDeptCodes[listIdx];
            var dept = deptByCode[deptCode];
            var listId = G(82, listIdx + 1);
            var isCompleted = listIdx < 2; // First two lists are "in_progress", rest are "draft"... actually let's vary
            var listStatus = listIdx switch { 0 => "in_progress", 1 => "in_progress", 2 => "in_progress", _ => "draft" };

            db.DepartmentLists.Add(new DepartmentList
            {
                Id = listId,
                TemplateId = templateId,
                BudgetRoundId = marsRoundId,
                DepartmentId = dept.Id,
                Status = listStatus,
                CreatedBy = createdBy,
                CreatedAt = SeedDate.AddDays(listIdx + 1),
                UpdatedAt = SeedDate.AddDays(listIdx + 5),
            });

            // Create one DepartmentListSection per template section
            var dlSectionIdMap = new Guid[21]; // index → created section ID
            for (var secIdx = 0; secIdx < 21; secIdx++)
            {
                depListSectionCount++;
                var dlSecId = G(83, depListSectionCount);
                dlSectionIdMap[secIdx] = dlSecId;

                var parentIdx = sectionParentIdxMap[secIdx];
                var parentDlSecId = parentIdx.HasValue ? dlSectionIdMap[parentIdx.Value] : (Guid?)null;

                // Determine if this is a freetext section that should have content
                // Sections at secIdx 4 and 5 are freetext (sortOrder 5 and 6)
                string? contentJson = null;
                if (freetextContentByDeptCode.TryGetValue(deptCode, out var ftContent))
                {
                    if (secIdx == 4) // "Overordnet om strukturarbeid og prioriteringer"
                        contentJson = MakeTipTapDoc(ftContent.Structural);
                    else if (secIdx == 5) // "Utdypende om utvalgte budsjettprioriteringer"
                        contentJson = MakeTipTapDoc(ftContent.Priorities);
                }

                db.DepartmentListSections.Add(new DepartmentListSection
                {
                    Id = dlSecId,
                    DepartmentListId = listId,
                    TemplateSectionId = templateSectionIds[secIdx],
                    ParentId = parentDlSecId,
                    Title = null, // resolved at render time
                    SortOrder = sectionSortOrders[secIdx],
                    ContentJson = contentJson,
                });
            }
        }

        await db.SaveChangesAsync();
    }

    private static int _sectionCounter = 0;

    private static Guid AddSection(AppDbContext db, Guid templateId, Guid? parentId,
        int sortOrder, string titleTemplate, string headingStyle, string sectionType, string? config)
    {
        var sectionId = G(81, ++_sectionCounter);
        db.DepartmentListTemplateSections.Add(new DepartmentListTemplateSection
        {
            Id = sectionId,
            TemplateId = templateId,
            ParentId = parentId,
            TitleTemplate = titleTemplate,
            HeadingStyle = headingStyle,
            SectionType = sectionType,
            SortOrder = sortOrder,
            Config = config,
        });
        return sectionId;
    }
}
