using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.DTOs;

/// SIKKERHETSFIKSING: Lagt til lengdebegrensninger på inndata-felt.
public record QuestionCreateDto([Required][MaxLength(10_000)] string QuestionText);

public record QuestionAnswerDto(
    [Required][MaxLength(100_000)] string AnswerText,
    [MaxLength(5_000_000)] string? AnswerJson = null
);

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
