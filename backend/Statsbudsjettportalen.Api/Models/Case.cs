using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class Case
{
    [Key]
    public Guid Id { get; set; }

    public Guid BudgetRoundId { get; set; }
    public BudgetRound BudgetRound { get; set; } = null!;

    public Guid DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    [Required, MaxLength(500)]
    public string CaseName { get; set; } = string.Empty;

    [MaxLength(10)]
    public string? Chapter { get; set; }

    [MaxLength(10)]
    public string? Post { get; set; }

    public long? Amount { get; set; }

    public long? FinAmount { get; set; }    // FINs tilrading
    public long? GovAmount { get; set; }    // Regjeringens vedtak (partielt)

    [Required, MaxLength(30)]
    public string CaseType { get; set; } = string.Empty;

    [MaxLength(30)]
    public string Status { get; set; } = "draft";

    public Guid? AssignedTo { get; set; }

    /// <summary>FIN-saksbehandler assigned when case reaches sendt_til_fin.</summary>
    public Guid? FinAssignedTo { get; set; }

    public Guid CreatedBy { get; set; }

    public int Version { get; set; } = 1;

    [MaxLength(10)]
    public string Origin { get; set; } = "fag";

    [MaxLength(100)]
    public string? ResponsibleDivision { get; set; } // Ansvarlig avdeling

    [MaxLength(20)]
    public string? FinListPlacement { get; set; } // Plassering i FIN-liste

    public int? PriorityNumber { get; set; } // Prioriteringsnummer

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CaseContent> ContentVersions { get; set; } = new List<CaseContent>();
    public ICollection<CaseEvent> Events { get; set; } = new List<CaseEvent>();
    public ICollection<Question> Questions { get; set; } = new List<Question>();
    public ICollection<Clearance> Clearances { get; set; } = new List<Clearance>();
    public ICollection<CaseOpinion> Opinions { get; set; } = new List<CaseOpinion>();
    public ICollection<CaseConclusion> Conclusions { get; set; } = new List<CaseConclusion>();
}
