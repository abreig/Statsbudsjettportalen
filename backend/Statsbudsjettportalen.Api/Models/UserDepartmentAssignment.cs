using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class UserDepartmentAssignment
{
    [Key]
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public bool IsPrimary { get; set; } // For default-filter i UI
}
