namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

/// <summary>
/// Represents one detected allergen and the evidence supporting it.
/// </summary>
/// <param name="Code">The canonical EU-14 allergen code.</param>
/// <param name="EvidenceLevel">The strength of the supporting evidence.</param>
/// <param name="Confidence">The advisory confidence in the signal.</param>
/// <param name="Evidence">The evidence fragments supporting the signal.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct AllergenSignalResponseDto(
  [property: JsonPropertyName("code")] AllergenCode Code,
  [property: JsonPropertyName("evidenceLevel")] AllergenEvidenceLevel EvidenceLevel,
  [property: JsonPropertyName("confidence")] double Confidence,
  [property: JsonPropertyName("evidence")] IReadOnlyList<AllergenEvidenceResponseDto> Evidence)
{
  /// <summary>
  /// Projects an allergen signal into its public transport representation.
  /// </summary>
  /// <param name="signal">The allergen signal to project.</param>
  /// <returns>An immutable allergen-signal response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="signal"/> is null.</exception>
  public static AllergenSignalResponseDto FromAllergenSignal(AllergenSignal signal)
  {
    ArgumentNullException.ThrowIfNull(signal);
    return new(
      Code: signal.Code,
      EvidenceLevel: signal.EvidenceLevel,
      Confidence: signal.Confidence,
      Evidence: signal.Evidence
        .Select(AllergenEvidenceResponseDto.FromAllergenEvidence)
        .ToList()
        .AsReadOnly());
  }
}
