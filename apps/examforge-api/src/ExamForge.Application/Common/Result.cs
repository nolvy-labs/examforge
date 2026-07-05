using System.Diagnostics.CodeAnalysis;

namespace ExamForge.Application.Common;

public sealed class Result<TValue, TError>
{
    private Result(TValue? value, TError error, bool isSuccess, object? additionalData = null)
    {
        Value = value;
        Error = error;
        IsSuccess = isSuccess;
        AdditionalData = additionalData;
    }

    public TValue? Value { get; }

    public TError Error { get; }

    public bool IsSuccess { get; }

    public bool IsFailure => !IsSuccess;

    public object? AdditionalData { get; }

    public static Result<TValue, TError> Success(TValue value)
    {
        return new Result<TValue, TError>(value, default!, true);
    }

    public static Result<TValue, TError> Failure(TError error)
    {
        return new Result<TValue, TError>(default, error, false);
    }

    public static Result<TValue, TError> Failure(TError error, object? data)
    {
        return new Result<TValue, TError>(default, error, false, data);
    }

    public bool TryGetAdditionalData<TData>([NotNullWhen(true)] out TData? data)
    {
        if (AdditionalData is TData typedData)
        {
            data = typedData;
            return true;
        }

        data = default;
        return false;
    }
}