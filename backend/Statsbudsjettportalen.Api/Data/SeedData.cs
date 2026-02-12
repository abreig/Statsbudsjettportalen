using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Models;

namespace Statsbudsjettportalen.Api.Data;

public static class SeedData
{
    // Deterministic GUIDs for seed data
    public static readonly Guid DeptKldId = new("10000000-0000-0000-0000-000000000001");
    public static readonly Guid DeptFinId = new("10000000-0000-0000-0000-000000000002");

    public static readonly Guid UserFagKld = new("20000000-0000-0000-0000-000000000001");
    public static readonly Guid UserBudsjettKld = new("20000000-0000-0000-0000-000000000002");
    public static readonly Guid UserFinKld = new("20000000-0000-0000-0000-000000000003");
    public static readonly Guid UserUndirdirFin = new("20000000-0000-0000-0000-000000000004");
    public static readonly Guid UserAdmin = new("20000000-0000-0000-0000-000000000005");

    public static readonly Guid RoundAug2026 = new("30000000-0000-0000-0000-000000000001");
    public static readonly Guid RoundMars2026 = new("30000000-0000-0000-0000-000000000002");

    public static readonly Guid Case1 = new("40000000-0000-0000-0000-000000000001");
    public static readonly Guid Case2 = new("40000000-0000-0000-0000-000000000002");
    public static readonly Guid Case3 = new("40000000-0000-0000-0000-000000000003");
    public static readonly Guid Case4 = new("40000000-0000-0000-0000-000000000004");

    public static readonly Guid Content1 = new("50000000-0000-0000-0000-000000000001");
    public static readonly Guid Content2 = new("50000000-0000-0000-0000-000000000002");
    public static readonly Guid Content3 = new("50000000-0000-0000-0000-000000000003");
    public static readonly Guid Content4 = new("50000000-0000-0000-0000-000000000004");

    public static readonly Guid Event1 = new("60000000-0000-0000-0000-000000000001");
    public static readonly Guid Event2 = new("60000000-0000-0000-0000-000000000002");
    public static readonly Guid Event3 = new("60000000-0000-0000-0000-000000000003");
    public static readonly Guid Event4 = new("60000000-0000-0000-0000-000000000004");

    private static readonly DateTime SeedDate = new(2026, 1, 15, 10, 0, 0, DateTimeKind.Utc);

    public static void Seed(ModelBuilder modelBuilder)
    {
        // Departments
        modelBuilder.Entity<Department>().HasData(
            new Department { Id = DeptKldId, Code = "KLD", Name = "Klima- og miljødepartementet" },
            new Department { Id = DeptFinId, Code = "FIN", Name = "Finansdepartementet" }
        );

        // Users
        modelBuilder.Entity<User>().HasData(
            new User { Id = UserFagKld, Email = "fag.kld@test.no", FullName = "Kari Nordmann", DepartmentId = DeptKldId, Role = "saksbehandler_fag" },
            new User { Id = UserBudsjettKld, Email = "budsjett.kld@test.no", FullName = "Ole Hansen", DepartmentId = DeptKldId, Role = "budsjettenhet_fag" },
            new User { Id = UserFinKld, Email = "fin.kld@test.no", FullName = "Eva Johansen", DepartmentId = DeptFinId, Role = "saksbehandler_fin" },
            new User { Id = UserUndirdirFin, Email = "undirdir.fin@test.no", FullName = "Per Olsen", DepartmentId = DeptFinId, Role = "underdirektor_fin" },
            new User { Id = UserAdmin, Email = "admin@test.no", FullName = "Admin Bruker", DepartmentId = DeptFinId, Role = "administrator" }
        );

        // Budget Rounds
        modelBuilder.Entity<BudgetRound>().HasData(
            new BudgetRound { Id = RoundAug2026, Name = "AUG2026", Type = "august", Year = 2026, Status = "open", Deadline = new DateTime(2026, 8, 15, 23, 59, 59, DateTimeKind.Utc) },
            new BudgetRound { Id = RoundMars2026, Name = "MARS2026", Type = "mars", Year = 2026, Status = "open", Deadline = new DateTime(2026, 3, 1, 23, 59, 59, DateTimeKind.Utc) }
        );

        // Sample Cases
        modelBuilder.Entity<Case>().HasData(
            new Case
            {
                Id = Case1, BudgetRoundId = RoundAug2026, DepartmentId = DeptKldId,
                CaseName = "Økt bevilgning til Enova", Chapter = "1428", Post = "50",
                Amount = 150000, CaseType = "satsingsforslag", Status = "sendt_til_fin",
                AssignedTo = UserFinKld, CreatedBy = UserFagKld, Version = 1,
                CreatedAt = SeedDate, UpdatedAt = SeedDate
            },
            new Case
            {
                Id = Case2, BudgetRoundId = RoundAug2026, DepartmentId = DeptKldId,
                CaseName = "Midler til opprydding i forurenset sjøbunn", Chapter = "1420", Post = "69",
                Amount = 50000, CaseType = "budsjettiltak", Status = "under_arbeid",
                AssignedTo = UserFagKld, CreatedBy = UserFagKld, Version = 1,
                CreatedAt = SeedDate, UpdatedAt = SeedDate
            },
            new Case
            {
                Id = Case3, BudgetRoundId = RoundAug2026, DepartmentId = DeptKldId,
                CaseName = "Styrking av Norges bidrag til Det grønne klimafondet (GCF)", Chapter = "1482", Post = "73",
                Amount = 200000, CaseType = "satsingsforslag", Status = "klarert",
                AssignedTo = UserBudsjettKld, CreatedBy = UserFagKld, Version = 1,
                CreatedAt = SeedDate, UpdatedAt = SeedDate
            },
            new Case
            {
                Id = Case4, BudgetRoundId = RoundAug2026, DepartmentId = DeptKldId,
                CaseName = "Reduksjon i tilskudd til miljøteknologiordningen", Chapter = "1428", Post = "72",
                Amount = -30000, CaseType = "teknisk_justering", Status = "draft",
                AssignedTo = UserFagKld, CreatedBy = UserFagKld, Version = 1,
                CreatedAt = SeedDate, UpdatedAt = SeedDate
            }
        );

        // Case Content (version 1 for each case)
        modelBuilder.Entity<CaseContent>().HasData(
            new CaseContent
            {
                Id = Content1, CaseId = Case1, Version = 1, CreatedBy = UserFagKld, CreatedAt = SeedDate,
                ProposalText = "Styrke Enovas arbeid med energieffektivisering i industrien for å redusere klimagassutslipp.",
                Justification = "Industrien står for en betydelig andel av Norges samlede klimagassutslipp. Flere aktører har meldt prosjekter som kan gi store utslippskutt, men mangler lønnsomhet uten støtte.",
                VerbalConclusion = "Det varsles i Prop. 1 S at regjeringen tar sikte på å legge frem en opptrappingsplan for energieffektivisering innen 2050.",
                SocioeconomicAnalysis = "Tiltaket forventes å gi en kostnad på om lag 800-1000 kroner per tonn redusert CO2-ekvivalent.",
                GoalIndicator = "Reduserte klimagassutslipp under innsatsfordelingen",
                BenefitPlan = "Kort sikt (1-2 år): Økt prosjektaktivitet. Mellomlang sikt (3-5 år): Reduksjon i energiforbruk. Lang sikt (5+ år): Varig reduksjon i utslipp.",
                Comment = "Sjekk tallgrunnlag mot Enovas siste årsrapport."
            },
            new CaseContent
            {
                Id = Content2, CaseId = Case2, Version = 1, CreatedBy = UserFagKld, CreatedAt = SeedDate,
                ProposalText = "Bevilge midler til opprydding av forurenset sjøbunn i prioriterte havneområder.",
                Justification = "Flere havneområder har dokumentert forurensning som påvirker marint miljø og folkehelse."
            },
            new CaseContent
            {
                Id = Content3, CaseId = Case3, Version = 1, CreatedBy = UserFagKld, CreatedAt = SeedDate,
                ProposalText = "Øke Norges bidrag til Det grønne klimafondet for å styrke internasjonal klimafinansiering.",
                Justification = "Norge har forpliktet seg til økt klimafinansiering gjennom Parisavtalen.",
                VerbalConclusion = "Regjeringen foreslår å øke bidraget til GCF som del av Norges internasjonale klimainnsats.",
                SocioeconomicAnalysis = "Investeringen forventes å gi betydelig avkastning i form av global utslippsreduksjon.",
                GoalIndicator = "Økt internasjonal klimafinansiering",
                BenefitPlan = "Årlig rapportering gjennom GCFs resultatrammeverk."
            },
            new CaseContent
            {
                Id = Content4, CaseId = Case4, Version = 1, CreatedBy = UserFagKld, CreatedAt = SeedDate,
                ProposalText = "Teknisk justering av bevilgningen til miljøteknologiordningen.",
                Justification = "Tilpasning til faktisk forbruksmønster."
            }
        );

        // Case Events (created events)
        modelBuilder.Entity<CaseEvent>().HasData(
            new CaseEvent { Id = Event1, CaseId = Case1, EventType = "created", UserId = UserFagKld, CreatedAt = SeedDate, EventData = "{\"case_name\":\"Økt bevilgning til Enova\"}" },
            new CaseEvent { Id = Event2, CaseId = Case2, EventType = "created", UserId = UserFagKld, CreatedAt = SeedDate, EventData = "{\"case_name\":\"Midler til opprydding i forurenset sjøbunn\"}" },
            new CaseEvent { Id = Event3, CaseId = Case3, EventType = "created", UserId = UserFagKld, CreatedAt = SeedDate, EventData = "{\"case_name\":\"Styrking av Norges bidrag til Det grønne klimafondet (GCF)\"}" },
            new CaseEvent { Id = Event4, CaseId = Case4, EventType = "created", UserId = UserFagKld, CreatedAt = SeedDate, EventData = "{\"case_name\":\"Reduksjon i tilskudd til miljøteknologiordningen\"}" }
        );
    }
}
