namespace Statsbudsjettportalen.Api.DTOs;

// ===== Template DTOs =====

public record TemplateCreateDto(
    string Name,
    string BudgetRoundType,
    string? DepartmentNamePlaceholder,
    string? ClassificationText,
    List<TemplateSectionCreateDto>? Sections
);

public record TemplateSectionCreateDto(
    string TitleTemplate,
    string HeadingStyle,
    string SectionType,
    int SortOrder,
    string? Config,
    List<TemplateSectionCreateDto>? Children
);

public record TemplateUpdateDto(
    string? Name,
    string? BudgetRoundType,
    string? DepartmentNamePlaceholder,
    string? ClassificationText,
    bool? IsActive
);

public record TemplateSectionUpdateDto(
    string? TitleTemplate,
    string? HeadingStyle,
    string? SectionType,
    int? SortOrder,
    string? Config
);

public record TemplateResponseDto(
    Guid Id,
    string Name,
    string BudgetRoundType,
    string DepartmentNamePlaceholder,
    bool IsActive,
    string? ClassificationText,
    Guid CreatedBy,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<TemplateSectionResponseDto> Sections
);

public record TemplateSectionResponseDto(
    Guid Id,
    Guid TemplateId,
    Guid? ParentId,
    string TitleTemplate,
    string HeadingStyle,
    string SectionType,
    int SortOrder,
    string? Config,
    List<TemplateSectionResponseDto> Children
);

// ===== Department List DTOs =====

public record DepartmentListCreateDto(
    Guid TemplateId,
    Guid BudgetRoundId,
    Guid DepartmentId
);

public record DepartmentListResponseDto(
    Guid Id,
    Guid TemplateId,
    string TemplateName,
    Guid BudgetRoundId,
    Guid DepartmentId,
    string DepartmentCode,
    string DepartmentName,
    string Status,
    Guid CreatedBy,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<DepartmentListSectionResponseDto>? Sections
);

public record DepartmentListSectionResponseDto(
    Guid Id,
    Guid DepartmentListId,
    Guid TemplateSectionId,
    Guid? ParentId,
    string? Title,
    int SortOrder,
    string? ContentJson,
    string SectionType,
    string HeadingStyle,
    List<DepartmentListSectionResponseDto> Children,
    List<DepartmentListCaseEntryResponseDto> CaseEntries
);

public record DepartmentListCaseEntryResponseDto(
    Guid Id,
    Guid CaseId,
    string CaseName,
    string CaseType,
    string? Subgroup,
    int SortOrder,
    long? Amount,
    long? FinAmount,
    long? GovAmount,
    string? OverrideContent
);

public record DepartmentListSectionUpdateDto(
    string? Title,
    string? ContentJson
);

public record DepartmentListCaseEntryAddDto(
    Guid SectionId,
    Guid CaseId,
    string? Subgroup,
    int SortOrder
);

public record DepartmentListCaseEntryUpdateDto(
    string? Subgroup,
    int? SortOrder,
    string? OverrideContent
);

// ===== Figure DTOs =====

public record DepartmentListFigureResponseDto(
    Guid Id,
    Guid SectionId,
    string FileUrl,
    string FileType,
    string? Caption,
    int WidthPercent,
    int SortOrder,
    Guid UploadedBy,
    DateTime UploadedAt
);

// ===== Case Conclusion DTOs =====

public record CaseConclusionCreateDto(
    string Text,
    int SortOrder
);

public record CaseConclusionUpdateDto(
    string? Text,
    int? SortOrder
);

public record CaseConclusionResponseDto(
    Guid Id,
    Guid CaseId,
    int SortOrder,
    string Text,
    Guid CreatedBy,
    DateTime CreatedAt
);
