namespace Statsbudsjettportalen.Api.DTOs;

public record QuestionCreateDto(string QuestionText);

public record QuestionAnswerDto(string AnswerText, string? AnswerJson = null);

public record QuestionDto(
    Guid Id,
    Guid CaseId,
    Guid AskedBy,
    string AskedByName,
    string QuestionText,
    string? AnswerText,
    string? AnswerJson,
    Guid? AnsweredBy,
    string? AnsweredByName,
    DateTime CreatedAt,
    DateTime? AnsweredAt
);

public record QuestionWithCaseDto(
    Guid Id,
    Guid CaseId,
    string CaseName,
    Guid AskedBy,
    string AskedByName,
    string QuestionText,
    DateTime CreatedAt
);
