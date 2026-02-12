using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Statsbudsjettportalen.Api.Models;

public class Department
{
    [Key]
    public Guid Id { get; set; }

    [Required, MaxLength(10)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Case> Cases { get; set; } = new List<Case>();
}
