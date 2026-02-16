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
        ("FIN-FAG", "Finansdepartementet (fagavdelinger)"),
    ];

    private static readonly string[] CaseTypes = ["satsingsforslag", "budsjettiltak", "teknisk_justering", "andre_saker"];
    private static readonly string[] Statuses = ["draft", "under_arbeid", "til_avklaring", "klarert", "godkjent_pol", "sendt_til_fin", "under_vurdering_fin", "ferdigbehandlet_fin", "sendt_til_regjeringen", "returnert_til_fag"];

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

    /// <summary>Drops all data and re-seeds from scratch.</summary>
    public static async Task ResetAndReseedAsync(AppDbContext db)
    {
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
                    AddAssignment(sbId, dc, dc == sb.Depts[0]);
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
        for (var dIdx = 0; dIdx < FagDeptCodes.Length; dIdx++)
        {
            var deptCode = FagDeptCodes[dIdx];
            var deptId = deptByCode[deptCode].Id;
            var names = FagUserNames[dIdx];
            var divisions = DeptDivisions.GetValueOrDefault(deptCode, ["Fagavdelingen", "Administrasjonsavdelingen"]);
            var code = deptCode.ToLower();

            // 0: Saksbehandler
            var sbResolved = RoleResolver.Resolve("Seniorrådgiver", deptCode);
            userEntities.Add(new User
            {
                Id = NextUserId(), Email = $"fag.{code}@test.no",
                FullName = $"{names[0].First} {names[0].Last}",
                DepartmentId = deptId, Role = sbResolved.Role,
                JobTitle = "Seniorrådgiver", LeaderLevel = null,
                Division = divisions[0], Section = "Seksjon 1",
            });

            // 1: Budsjettenhet
            var beResolved = RoleResolver.Resolve("Rådgiver", deptCode, isBudsjettenhet: true);
            userEntities.Add(new User
            {
                Id = NextUserId(), Email = $"budsjett.{code}@test.no",
                FullName = $"{names[1].First} {names[1].Last}",
                DepartmentId = deptId, Role = beResolved.Role,
                JobTitle = "Rådgiver", LeaderLevel = null,
                Division = divisions.Length > 1 ? divisions[1] : divisions[0], Section = null,
            });

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

        // ── Cases (40 per FAG department = 600 total) ───
        var caseCount = 0;
        var chapters = new[] { "200", "225", "260", "300", "400", "500", "600", "700", "800", "900",
            "1000", "1100", "1200", "1300", "1400", "1500", "1600", "1700", "1800", "1900" };

        foreach (var dept in deptEntities.Where(d => d.Code != "FIN"))
        {
            var fagUser = userEntities.First(u => u.DepartmentId == dept.Id && u.Role == "saksbehandler_fag");
            var budsjettUser = userEntities.First(u => u.DepartmentId == dept.Id && u.Role == "budsjettenhet_fag");
            var topics = DeptTopics.GetValueOrDefault(dept.Code, ["generelt tiltak", "internt prosjekt", "driftsoptimalisering"]);
            var divisions = DeptDivisions.GetValueOrDefault(dept.Code, ["Fagavdelingen"]);

            for (var i = 0; i < 40; i++)
            {
                caseCount++;
                var caseType = CaseTypes[i % CaseTypes.Length];
                var isMarsRound = i >= 30;
                string status;
                if (isMarsRound)
                    status = "regjeringsbehandlet";
                else
                    status = Statuses[i % Statuses.Length];

                var topic = topics[i % topics.Length];
                var template = CaseNameTemplates[i % CaseNameTemplates.Length];
                var caseName = string.Format(template, topic);
                var chapter = chapters[i % chapters.Length];
                var post = ((i % 9) * 10 + 1).ToString("D2");
                var isAndreSaker = caseType == "andre_saker";
                var amount = isAndreSaker ? (long?)null : (long)((i + 1) * 10000 * (i % 3 == 0 ? -1 : 1));

                var caseId = G(40, caseCount);
                var assignedTo = (i % Statuses.Length) >= 3 ? budsjettUser.Id : fagUser.Id;

                db.Cases.Add(new Case
                {
                    Id = caseId,
                    BudgetRoundId = isMarsRound ? roundMars.Id : roundAug.Id,
                    DepartmentId = dept.Id,
                    CaseName = caseName,
                    Chapter = isAndreSaker ? null : chapter,
                    Post = isAndreSaker ? null : post,
                    Amount = amount,
                    CaseType = caseType,
                    Status = status,
                    AssignedTo = assignedTo,
                    CreatedBy = fagUser.Id,
                    ResponsibleDivision = divisions[i % divisions.Length],
                    Version = 1,
                    CreatedAt = SeedDate.AddDays(caseCount),
                    UpdatedAt = SeedDate.AddDays(caseCount).AddHours(caseCount % 24),
                });

                db.CaseContents.Add(new CaseContent
                {
                    Id = G(50, caseCount),
                    CaseId = caseId,
                    Version = 1,
                    CaseName = caseName,
                    Chapter = isAndreSaker ? null : chapter,
                    Post = isAndreSaker ? null : post,
                    Amount = amount,
                    Status = status,
                    ProposalText = caseType != "teknisk_justering"
                        ? $"Forslag: {caseName}. Dette er et forslag knyttet til {dept.Name}."
                        : null,
                    Justification = $"Begrunnelse for {caseName.ToLower()}. Tiltaket er nødvendig for å oppnå målene i {dept.Code}s sektor.",
                    Comment = i % 5 == 0 ? "Intern kommentar: sjekk tallgrunnlag." : null,
                    CreatedBy = fagUser.Id,
                    CreatedAt = SeedDate.AddDays(caseCount),
                });

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

        // ===== Seed Department List Template: Mars Conference =====
        await SeedMarsConferenceTemplate(db);
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
