namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using System.Globalization;
using System.Text;

/// <summary>
/// Provides canonical merchant-name normalization shared by merchant resolution layers.
/// </summary>
internal static class MerchantNameNormalizer
{
  /// <summary>
  /// Normalizes a merchant name using compatibility decomposition and canonical whitespace folding.
  /// </summary>
  /// <param name="name">The merchant name to normalize.</param>
  /// <returns>The normalized merchant name or an empty string when the input carries no semantic characters.</returns>
  internal static string Normalize(string? name)
  {
    if (string.IsNullOrWhiteSpace(name))
    {
      return string.Empty;
    }

    string compatibilityDecomposedName = name.Normalize(NormalizationForm.FormKD);
    var builder = new StringBuilder(compatibilityDecomposedName.Length);
    bool previousCharacterWasWhitespace = false;

    foreach (char character in compatibilityDecomposedName)
    {
      UnicodeCategory unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(character);

      if (unicodeCategory is UnicodeCategory.NonSpacingMark
        or UnicodeCategory.SpacingCombiningMark
        or UnicodeCategory.EnclosingMark)
      {
        continue;
      }

      if (char.IsWhiteSpace(character))
      {
        if (builder.Length > 0 && previousCharacterWasWhitespace is false)
        {
          builder.Append(' ');
          previousCharacterWasWhitespace = true;
        }

        continue;
      }

      builder.Append(char.ToLowerInvariant(character));
      previousCharacterWasWhitespace = false;
    }

    if (builder.Length > 0 && builder[^1] == ' ')
    {
      builder.Length--;
    }

    return builder.ToString();
  }
}
