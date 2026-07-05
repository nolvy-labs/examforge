namespace ExamForge.Application.Common;

public sealed record CollectionResponse<T>(
    IReadOnlyList<T> Items,
    CollectionMeta Meta
);

public sealed record CollectionMeta(
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages,
    bool HasPreviousPage,
    bool HasNextPage
);