using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class CaseContent
{
    [Key]
    public Guid Id { get; set; }

    public Guid CaseId { get; set; }
    public Case Case { get; set; } = null!;

    public int Version { get; set; }

    public string? ProposalText { get; set; }
    public string? Justification { get; set; }
    public string? VerbalConclusion { get; set; }
    public string? SocioeconomicAnalysis { get; set; }
    public string? GoalIndicator { get; set; }
    public string? BenefitPlan { get; set; }
    public string? Comment { get; set; }

    // FIN-specific fields
    public string? FinAssessment { get; set; }
    public string? FinVerbal { get; set; }
    public string? FinRConclusion { get; set; }

    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
