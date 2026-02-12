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

    public bool IsActive { get; set; } = true;
}
