using System.Globalization;
using System.Security.Cryptography;
using System.Text;

using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Domain.Exams;

namespace ExamForge.Infrastructure.Exams.Admin;

public sealed class AdminExamSlugGenerator : IAdminExamSlugGenerator
{
    private const int RandomSuffixLength = 8;
    private const int SeparatorLength = 1;

    public string Generate(string title)
    {
        var baseSlug = NormalizeBase(title, useFallback: true);
        var maximumBaseLength = ExamConstraints.SlugMaxLength - RandomSuffixLength - SeparatorLength;

        if (baseSlug.Length > maximumBaseLength)
        {
            baseSlug = baseSlug[..maximumBaseLength].TrimEnd('-');
        }

        if (baseSlug.Length == 0)
        {
            baseSlug = "exam";
        }

        var suffix = RandomNumberGenerator.GetInt32(10_000_000, 100_000_000);
        return $"{baseSlug}-{suffix}";
    }

    internal static string NormalizeBase(string value, bool useFallback)
    {
        var decomposed = value
            .Replace('đ', 'd')
            .Replace('Đ', 'D')
            .Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        var pendingHyphen = false;

        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            var lowerCharacter = char.ToLowerInvariant(character);
            var isAsciiLetterOrDigit =
                lowerCharacter is >= 'a' and <= 'z' or >= '0' and <= '9';

            if (isAsciiLetterOrDigit)
            {
                if (pendingHyphen && builder.Length > 0)
                {
                    builder.Append('-');
                }

                builder.Append(lowerCharacter);
                pendingHyphen = false;
            }
            else
            {
                pendingHyphen = true;
            }
        }

        var normalized = builder.ToString().Trim('-');
        return normalized.Length == 0 && useFallback ? "exam" : normalized;
    }
}