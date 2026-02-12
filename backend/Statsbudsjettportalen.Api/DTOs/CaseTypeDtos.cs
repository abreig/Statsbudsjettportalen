namespace Statsbudsjettportalen.Api.DTOs;

public record CaseTypeFieldDto(string Key, string Label, bool Required);

public record CaseTypeDto(
    Guid Id,
    string Code,
    string Name,
    string Description,
    bool IsActive,
    int SortOrder,
    List<CaseTypeFieldDto> Fields
);

public record CaseTypeCreateDto(
    string Code,
    string Name,
    string Description,
    int SortOrder,
    List<CaseTypeFieldDto> Fields
);

public record CaseTypeUpdateDto(
    string? Name,
    string? Description,
    bool? IsActive,
    int? SortOrder,
    List<CaseTypeFieldDto>? Fields
);
