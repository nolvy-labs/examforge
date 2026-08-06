using System.Text;
using System.Text.RegularExpressions;

namespace ExamForge.Domain.Exams;

public static partial class FillAnswerNormalizer
{
    public static string Normalize(string value, bool caseSensitive)
    {
        var normalized = WhitespacePattern()
            .Replace(value.Normalize(NormalizationForm.FormKC).Trim(), " ");
        return caseSensitive ? normalized : normalized.ToUpperInvariant();
    }

    public static bool Conflicts(
        string firstValue,
        bool firstCaseSensitive,
        string secondValue,
        bool secondCaseSensitive)
    {
        if (firstCaseSensitive && secondCaseSensitive)
        {
            return Normalize(firstValue, caseSensitive: true) ==
                Normalize(secondValue, caseSensitive: true);
        }

        return Normalize(firstValue, caseSensitive: false) ==
            Normalize(secondValue, caseSensitive: false);
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespacePattern();
}