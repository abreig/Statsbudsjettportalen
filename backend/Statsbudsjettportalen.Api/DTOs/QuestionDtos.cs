namespace Statsbudsjettportalen.Api.DTOs;

public record QuestionCreateDto(string QuestionText);

public record QuestionAnswerDto(string AnswerText);

public record QuestionDto(
    Guid Id,
    Guid CaseId,
    Guid AskedBy,
    string AskedByName,
    string QuestionText,
    string? AnswerText,
    Guid? AnsweredBy,
    string? AnsweredByName,
    DateTime CreatedAt,
    DateTime? AnsweredAt
);
