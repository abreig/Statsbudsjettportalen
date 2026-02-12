using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class Question
{
    [Key]
    public Guid Id { get; set; }

    public Guid CaseId { get; set; }
    public Case Case { get; set; } = null!;

    public Guid AskedBy { get; set; }

    [Required]
    public string QuestionText { get; set; } = string.Empty;

    public string? AnswerText { get; set; }
    public Guid? AnsweredBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AnsweredAt { get; set; }
}
