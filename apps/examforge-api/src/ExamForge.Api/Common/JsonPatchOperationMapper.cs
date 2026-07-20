using System.Text.Json;

using ExamForge.Application.Admin.Exams.Dtos;

using Microsoft.AspNetCore.JsonPatch.SystemTextJson;

namespace ExamForge.Api.Common;

public static class JsonPatchOperationMapper
{
    public static IReadOnlyList<PatchOperation>? Map<TModel>(JsonPatchDocument<TModel>? document)
        where TModel : class
    {
        return document?.Operations.Select(operation => new PatchOperation(
            operation.op,
            operation.path,
            ToJsonElement(operation.value),
            operation.from)).ToList();
    }

    private static JsonElement? ToJsonElement(object? value)
    {
        if (value is null)
            return null;
        return value is JsonElement element
            ? element
            : JsonSerializer.SerializeToElement(value);
    }
}