namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System;
using System.Text.RegularExpressions;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Represents the immutable transient merchant description generated for one analysis request.
/// </summary>
public sealed partial record MerchantDescriptionResult
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
    value.Contains("http://", StringComparison.OrdinalIgnoreCase)
    || value.Contains("https://", StringComparison.OrdinalIgnoreCase)
    || value.Contains("www.", StringComparison.OrdinalIgnoreCase)
    || BareDomainPattern().IsMatch(value);

  private static bool ContainsExternalResearchClaim(string value)
    => ExternalResearchClaimPattern().IsMatch(value);

  [GeneratedRegex(
    @"\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\b",
    RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
    matchTimeoutMilliseconds: 250)]
  private static partial Regex BareDomainPattern();

  [GeneratedRegex(
    @"\b(?:according\s+to|based\s+on|per)\b[^.!?\r\n]{0,160}\b(?:google(?:\s+maps)?|linkedin|online(?:\s+(?:sources?|research|search(?:es)?|results?|records?|listings?))?|web(?:\s+(?:sources?|research|search(?:es)?|results?))?|public\s+(?:records?|registry|registries|listings?)|registry(?:\s+(?:data|records?|listings?))?|registries(?:\s+(?:data|records?|listings?))?|listings?)\b|\b(?:i|we)\s+(?:looked\s+up|searched(?:\s+for)?|checked|reviewed|found)\b[^.!?\r\n]{0,160}\b(?:google(?:\s+maps)?|linkedin|online|web|public\s+(?:records?|registry|registries|listings?)|registry(?:\s+(?:data|records?|listings?))?|registries(?:\s+(?:data|records?|listings?))?|listings?)\b",
    RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
    matchTimeoutMilliseconds: 250)]
  private static partial Regex ExternalResearchClaimPattern();
}
