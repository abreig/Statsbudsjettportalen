using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class DepartmentList
{
    [Key]
    public Guid Id { get; set; }

    public Guid TemplateId { get; set; }
    public DepartmentListTemplate Template { get; set; } = null!;

    public Guid BudgetRoundId { get; set; }
    public BudgetRound BudgetRound { get; set; } = null!;

    public Guid DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    [Required, MaxLength(30)]
    public string Status { get; set; } = "draft"; // "draft", "in_progress", "completed"

    public Guid CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<DepartmentListSection> Sections { get; set; } = new List<DepartmentListSection>();
    public ICollection<DepartmentListCaseEntry> CaseEntries { get; set; } = new List<DepartmentListCaseEntry>();
    public ICollection<DepartmentListFigure> Figures { get; set; } = new List<DepartmentListFigure>();
}
