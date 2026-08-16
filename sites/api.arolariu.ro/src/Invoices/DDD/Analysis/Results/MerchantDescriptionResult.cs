namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Represents the immutable transient merchant description generated for one analysis request.
/// </summary>
public sealed record MerchantDescriptionResult
{
  private const int MaximumDescriptionLength = 240;

  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantDescriptionResult"/> record.
  /// </summary>
  /// <param name="description">The concise merchant description.</param>
  /// <exception cref="ArgumentException">Thrown when <paramref name="description"/> is null, empty, whitespace, or contains a forbidden claim.</exception>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="description"/> exceeds the concise length limit.</exception>
  public MerchantDescriptionResult(string description)
  {
    Description = ValidateDescription(description);
  }

  /// <summary>Gets the concise merchant description.</summary>
  public string Description { get; }

  private static string ValidateDescription(string description)
  {
    string value = AnalysisContractGuards.RequireText(description, nameof(description));

    if (value.Length > MaximumDescriptionLength)
    {
      throw new ArgumentOutOfRangeException(
        nameof(description),
        value.Length,
        $"Merchant descriptions must not exceed {MaximumDescriptionLength} characters.");
    }

    if (ContainsUrl(value))
    {
      throw new ArgumentException("Merchant descriptions must not contain URLs.", nameof(description));
    }

    if (ContainsExternalResearchClaim(value))
    {
      throw new ArgumentException("Merchant descriptions must not claim external research.", nameof(description));
    }

    return value;
  }

  private static bool ContainsUrl(string value) =>
    value.Contains("://", StringComparison.Ordinal)
    || value.Contains("http://", StringComparison.OrdinalIgnoreCase)
    || value.Contains("https://", StringComparison.OrdinalIgnoreCase)
    || value.Contains("www.", StringComparison.OrdinalIgnoreCase);

  private static bool ContainsExternalResearchClaim(string value)
  {
    string[] forbiddenPhrases =
    [
      "research",
      "registry",
      "looked up",
      "looked into",
      "searched the web",
      "search results",
      "web research",
      "online research",
      "based on web",
      "based on registry",
    ];

    foreach (string phrase in forbiddenPhrases)
    {
      if (value.Contains(phrase, StringComparison.OrdinalIgnoreCase))
      {
        return true;
      }
    }

    return false;
  }
}
