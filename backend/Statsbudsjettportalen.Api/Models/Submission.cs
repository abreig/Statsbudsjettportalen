using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class Submission
{
    [Key]
    public Guid Id { get; set; }

    public Guid BudgetRoundId { get; set; }
    public BudgetRound BudgetRound { get; set; } = null!;

    public Guid DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public Guid SubmittedBy { get; set; }

    public bool IsSupplement { get; set; }

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public ICollection<SubmissionCase> SubmissionCases { get; set; } = new List<SubmissionCase>();
}

public class SubmissionCase
{
    public Guid SubmissionId { get; set; }
    public Submission Submission { get; set; } = null!;

    public Guid CaseId { get; set; }
    public Case Case { get; set; } = null!;
}
