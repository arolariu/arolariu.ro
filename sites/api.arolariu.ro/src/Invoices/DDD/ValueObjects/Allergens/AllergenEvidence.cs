namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Represents a single evidence fragment supporting an allergen signal.
/// </summary>
public sealed record AllergenEvidence
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AllergenEvidence"/> record.
  /// </summary>
  /// <param name="source">The stable source key describing where the evidence came from.</param>
  /// <param name="value">The source value, excerpt, or normalized token supporting the allergen signal.</param>
  /// <exception cref="ArgumentException">Thrown when <paramref name="source"/> or <paramref name="value"/> is null, empty, or whitespace.</exception>
  public AllergenEvidence(string source, string value)
  {
    Source = AnalysisContractGuards.RequireText(source, nameof(source));
    Value = AnalysisContractGuards.RequireText(value, nameof(value));
  }

  /// <summary>
  /// Gets the stable source key describing where the evidence came from.
  /// </summary>
  public string Source { get; }

  /// <summary>
  /// Gets the source value, excerpt, or normalized token supporting the allergen signal.
  /// </summary>
  public string Value { get; }
}
