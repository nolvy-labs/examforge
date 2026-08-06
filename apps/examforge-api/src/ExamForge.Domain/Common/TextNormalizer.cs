using System.Text;
using System.Text.RegularExpressions;

namespace ExamForge.Domain.Common;

public static class TextNormalizer
{
    public static string NormalizeName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Name cannot be empty.", nameof(name));
        }

        var normalized = name.Trim().Normalize(NormalizationForm.FormC);

        return Regex.Replace(normalized, @"\s+", " ");
    }

    public static string NormalizeSlug(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Slug source cannot be empty.", nameof(value));
        }

        return value
            .Trim()
            .ToLowerInvariant()
            .Replace(" ", "-");
    }
}