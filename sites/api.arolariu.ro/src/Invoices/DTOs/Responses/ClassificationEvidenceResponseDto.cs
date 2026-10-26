namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Represents one evidence item that explains a classification response.
/// </summary>
/// <param name="Source">The stable source key for the evidence.</param>
/// <param name="Value">The evidence value available for UI explanation.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ClassificationEvidenceResponseDto(
  [property: JsonPropertyName("source")] string Source,
  [property: JsonPropertyName("value")] string Value)
{
  /// <summary>
  /// Projects a classification evidence item into its public transport representation.
  /// </summary>
  /// <param name="evidence">The classification evidence item to project.</param>
  /// <returns>An immutable classification-evidence response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="evidence"/> is null.</exception>
  public static ClassificationEvidenceResponseDto FromClassificationEvidence(ClassificationEvidence evidence)
  {
    ArgumentNullException.ThrowIfNull(evidence);
    return new(evidence.Source, evidence.Value);
  }
}
