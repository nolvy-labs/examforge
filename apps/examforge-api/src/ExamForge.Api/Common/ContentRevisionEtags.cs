using System.Globalization;

namespace ExamForge.Api.Common;

public static class ContentRevisionEtags
{
    public static string Format(long revision) => $"\"{revision.ToString(CultureInfo.InvariantCulture)}\"";

    public static bool TryParse(string? value, out long revision)
    {
        revision = default;
        if (string.IsNullOrWhiteSpace(value) || value.Length < 3 ||
            value[0] != '"' || value[^1] != '"')
            return false;

        return long.TryParse(
            value.AsSpan(1, value.Length - 2),
            NumberStyles.None,
            CultureInfo.InvariantCulture,
            out revision) && revision > 0;
    }
}