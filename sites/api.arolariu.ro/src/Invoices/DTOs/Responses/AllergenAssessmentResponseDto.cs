namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

/// <summary>
/// Represents the public outcome of a product allergen assessment.
/// </summary>
/// <remarks>
/// The transport shape deliberately omits the internal source-run identifier. A non-null assessment means the
/// capability produced an outcome; consumers must use <see cref="Status"/> rather than infer safety from an empty
/// signal collection.
/// </remarks>
/// <param name="Status">The outcome of the structured allergen assessment.</param>
/// <param name="Signals">The detected allergen signals; empty for non-detected outcomes.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct AllergenAssessmentResponseDto(
  [property: JsonPropertyName("status")] AllergenAssessmentStatus Status,
  [property: JsonPropertyName("signals")] IReadOnlyList<AllergenSignalResponseDto> Signals)
{
  /// <summary>
  /// Projects an optional allergen assessment into its public transport representation.
  /// </summary>
  /// <param name="assessment">The domain assessment to project, or null when no assessment was produced.</param>
  /// <returns>A read-only assessment response, or null when <paramref name="assessment"/> is null.</returns>
  public static AllergenAssessmentResponseDto? FromAllergenAssessment(AllergenAssessment? assessment) =>
    assessment is null
      ? null
      : new(
        Status: assessment.Status,
        Signals: assessment.Signals
          .Select(AllergenSignalResponseDto.FromAllergenSignal)
          .ToList()
          .AsReadOnly());
}
