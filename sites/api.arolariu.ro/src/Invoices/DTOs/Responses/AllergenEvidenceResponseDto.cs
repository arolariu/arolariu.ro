namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

/// <summary>
/// Represents one evidence fragment used to explain an allergen signal.
/// </summary>
/// <param name="Source">The stable source key for the evidence.</param>
/// <param name="Value">The evidence value available for UI explanation.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct AllergenEvidenceResponseDto(
  [property: JsonPropertyName("source")] string Source,
  [property: JsonPropertyName("value")] string Value)
{
  /// <summary>
  /// Projects an allergen evidence fragment into its public transport representation.
  /// </summary>
  /// <param name="evidence">The allergen evidence fragment to project.</param>
  /// <returns>An immutable allergen-evidence response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="evidence"/> is null.</exception>
  public static AllergenEvidenceResponseDto FromAllergenEvidence(AllergenEvidence evidence)
  {
    ArgumentNullException.ThrowIfNull(evidence);
    return new(evidence.Source, evidence.Value);
  }
}
