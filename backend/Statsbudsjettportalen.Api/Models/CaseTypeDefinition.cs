using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class CaseTypeDefinition
{
    [Key]
    public Guid Id { get; set; }

    [Required, MaxLength(50)]
    public string Code { get; set; } = "";

    [Required, MaxLength(200)]
    public string Name { get; set; } = "";

    [MaxLength(500)]
    public string Description { get; set; } = "";

    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }

    /// <summary>
    /// JSON array of field configurations:
    /// [{"key":"proposalText","label":"Forslagstekst","required":true}, ...]
    /// </summary>
    [Required]
    public string FieldsJson { get; set; } = "[]";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
