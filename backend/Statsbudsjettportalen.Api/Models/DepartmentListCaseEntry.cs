using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Statsbudsjettportalen.Api.Models;

public class DepartmentListCaseEntry
{
    [Key]
    public Guid Id { get; set; }

    public Guid DepartmentListId { get; set; }
    public DepartmentList DepartmentList { get; set; } = null!;

    public Guid SectionId { get; set; }
    public DepartmentListSection Section { get; set; } = null!;

    public Guid CaseId { get; set; }
    public Case Case { get; set; } = null!;

    [MaxLength(20)]
    public string? Subgroup { get; set; } // "a_list", "b_list"

    public int SortOrder { get; set; }

    [Column(TypeName = "jsonb")]
    public string? OverrideContent { get; set; } // TipTap JSON, null = use case data

    public DateTime IncludedAt { get; set; } = DateTime.UtcNow;
}
