using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Statsbudsjettportalen.Api.Models;

public class User
{
    [Key]
    public Guid Id { get; set; }

    [Required, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    public Guid DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    [Required, MaxLength(30)]
    public string Role { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Division { get; set; } // Avdeling

    [MaxLength(100)]
    public string? Section { get; set; } // Seksjon

    [MaxLength(100)]
    public string? JobTitle { get; set; } // Stillingstittel fra Entra ID

    [MaxLength(30)]
    public string? LeaderLevel { get; set; } // underdirektor, avdelingsdirektor, ekspedisjonssjef, departementsraad

    [MaxLength(100)]
    public string? EntraObjectId { get; set; } // Azure AD object ID, null i POC

    public bool IsActive { get; set; } = true;

    public ICollection<UserDepartmentAssignment> DepartmentAssignments { get; set; } = new List<UserDepartmentAssignment>();
}
