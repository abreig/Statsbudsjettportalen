using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Models;

namespace Statsbudsjettportalen.Api.Data;

public static class SeedData
{
    // Deterministic GUID helper: namespace + index → stable GUID
    private static Guid G(int ns, int idx) =>
        new($"{ns:D8}-0000-0000-0000-{idx:D12}");

    private static readonly DateTime SeedDate = new(2026, 1, 15, 10, 0, 0, DateTimeKind.Utc);

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
    ];

    private static readonly string[] FagFirstNames =
    [
        "Kari", "Ole", "Eva", "Per", "Anna", "Bjørn", "Ingrid", "Erik",
        "Marit", "Lars", "Hilde", "Tor", "Silje", "Hans", "Berit", "Jon",
        "Marte", "Stein", "Gro", "Geir", "Randi", "Odd", "Turid", "Dag",
        "Liv", "Alf", "Siri", "Nils", "Kristin", "Svein", "Else", "Trond",
    ];

    private static readonly string[] LastNames =
    [
        "Nordmann", "Hansen", "Johansen", "Olsen", "Larsen", "Andersen",
        "Pedersen", "Nilsen", "Kristiansen", "Jensen", "Berg", "Haugen",
        "Hagen", "Eriksen", "Bakken", "Solberg", "Moen", "Strand",
        "Aas", "Lie", "Dahl", "Lund", "Svendsen", "Aasen",
        "Brekke", "Fjeld", "Vik", "Rønning", "Hauge", "Bye",
        "Tangen", "Borge",
    ];

    private static readonly string[] CaseTypes = ["satsingsforslag", "budsjettiltak", "teknisk_justering", "andre_saker"];
    private static readonly string[] Statuses = ["draft", "under_arbeid", "til_avklaring", "klarert", "godkjent_pol", "sendt_til_fin", "under_vurdering_fin"];

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
    };

    /// <summary>
    /// Seeds the database at runtime (called from Program.cs after migration).
    /// Idempotent: skips if departments already exist.
    /// </summary>
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Departments.AnyAsync())
            return; // Already seeded

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

        // ── Users ───────────────────────────────────────
        var userEntities = new List<User>();
        var finDeptId = deptEntities.First(d => d.Code == "FIN").Id;
        var nameIdx = 0;

        foreach (var dept in deptEntities)
        {
            if (dept.Code == "FIN")
            {
                // FIN gets saksbehandler_fin, underdirektor_fin, administrator
                userEntities.Add(new User
                {
                    Id = G(20, 100), Email = "saksbehandler.fin@test.no",
                    FullName = "Eva Johansen", DepartmentId = dept.Id, Role = "saksbehandler_fin",
                });
                userEntities.Add(new User
                {
                    Id = G(20, 101), Email = "undirdir.fin@test.no",
                    FullName = "Per Olsen", DepartmentId = dept.Id, Role = "underdirektor_fin",
                });
                userEntities.Add(new User
                {
                    Id = G(20, 102), Email = "admin@test.no",
                    FullName = "Admin Bruker", DepartmentId = dept.Id, Role = "administrator",
                });
            }
            else
            {
                var fn1 = FagFirstNames[nameIdx % FagFirstNames.Length];
                var ln1 = LastNames[nameIdx % LastNames.Length];
                nameIdx++;
                var fn2 = FagFirstNames[nameIdx % FagFirstNames.Length];
                var ln2 = LastNames[nameIdx % LastNames.Length];
                nameIdx++;

                var code = dept.Code.ToLower();
                userEntities.Add(new User
                {
                    Id = G(20, nameIdx - 1),
                    Email = $"fag.{code}@test.no",
                    FullName = $"{fn1} {ln1}",
                    DepartmentId = dept.Id,
                    Role = "saksbehandler_fag",
                });
                userEntities.Add(new User
                {
                    Id = G(20, nameIdx),
                    Email = $"budsjett.{code}@test.no",
                    FullName = $"{fn2} {ln2}",
                    DepartmentId = dept.Id,
                    Role = "budsjettenhet_fag",
                });
            }
        }
        db.Users.AddRange(userEntities);

        // ── Budget Rounds ───────────────────────────────
        var roundAug = new BudgetRound
        {
            Id = G(30, 1), Name = "AUG2026", Type = "august", Year = 2026,
            Status = "open", Deadline = new DateTime(2026, 8, 15, 23, 59, 59, DateTimeKind.Utc),
        };
        var roundMars = new BudgetRound
        {
            Id = G(30, 2), Name = "MARS2026", Type = "mars", Year = 2026,
            Status = "open", Deadline = new DateTime(2026, 3, 1, 23, 59, 59, DateTimeKind.Utc),
        };
        db.BudgetRounds.AddRange(roundAug, roundMars);

        // ── Cases (40 per FAG department = 600 total) ───
        var caseCount = 0;
        var chapters = new[] { "200", "225", "260", "300", "400", "500", "600", "700", "800", "900",
            "1000", "1100", "1200", "1300", "1400", "1500", "1600", "1700", "1800", "1900" };

        foreach (var dept in deptEntities.Where(d => d.Code != "FIN"))
        {
            var fagUser = userEntities.First(u => u.DepartmentId == dept.Id && u.Role == "saksbehandler_fag");
            var budsjettUser = userEntities.First(u => u.DepartmentId == dept.Id && u.Role == "budsjettenhet_fag");
            var topics = DeptTopics.GetValueOrDefault(dept.Code, ["generelt tiltak", "internt prosjekt", "driftsoptimalisering"]);

            for (var i = 0; i < 40; i++)
            {
                caseCount++;
                var caseType = CaseTypes[i % CaseTypes.Length];
                var statusIdx = i % Statuses.Length;
                var status = Statuses[statusIdx];
                var topic = topics[i % topics.Length];
                var template = CaseNameTemplates[i % CaseNameTemplates.Length];
                var caseName = string.Format(template, topic);
                var chapter = chapters[i % chapters.Length];
                var post = ((i % 9) * 10 + 1).ToString("D2");
                var isAndreSaker = caseType == "andre_saker";
                var amount = isAndreSaker ? (long?)null : (long)((i + 1) * 10000 * (i % 3 == 0 ? -1 : 1));

                var caseId = G(40, caseCount);
                var assignedTo = statusIdx >= 3 ? budsjettUser.Id : fagUser.Id; // advanced statuses → budsjettenhet

                db.Cases.Add(new Case
                {
                    Id = caseId,
                    BudgetRoundId = i < 30 ? roundAug.Id : roundMars.Id,
                    DepartmentId = dept.Id,
                    CaseName = caseName,
                    Chapter = isAndreSaker ? null : chapter,
                    Post = isAndreSaker ? null : post,
                    Amount = amount,
                    CaseType = caseType,
                    Status = status,
                    AssignedTo = assignedTo,
                    CreatedBy = fagUser.Id,
                    Version = 1,
                    CreatedAt = SeedDate.AddDays(caseCount),
                    UpdatedAt = SeedDate.AddDays(caseCount).AddHours(caseCount % 24),
                });

                // Content version 1
                db.CaseContents.Add(new CaseContent
                {
                    Id = G(50, caseCount),
                    CaseId = caseId,
                    Version = 1,
                    ProposalText = caseType != "teknisk_justering"
                        ? $"Forslag: {caseName}. Dette er et forslag knyttet til {dept.Name}."
                        : null,
                    Justification = $"Begrunnelse for {caseName.ToLower()}. Tiltaket er nødvendig for å oppnå målene i {dept.Code}s sektor.",
                    Comment = i % 5 == 0 ? "Intern kommentar: sjekk tallgrunnlag." : null,
                    CreatedBy = fagUser.Id,
                    CreatedAt = SeedDate.AddDays(caseCount),
                });

                // Created event
                db.CaseEvents.Add(new CaseEvent
                {
                    Id = G(60, caseCount),
                    CaseId = caseId,
                    EventType = "created",
                    UserId = fagUser.Id,
                    EventData = JsonSerializer.Serialize(new { case_name = caseName, case_type = caseType }),
                    CreatedAt = SeedDate.AddDays(caseCount),
                });
            }
        }

        await db.SaveChangesAsync();
    }
}
