namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Represents the canonical transport projection of a standard classification.
/// </summary>
/// <remarks>
/// <para>
/// This immutable DTO exposes the label, hierarchy, provenance, confidence, and evidence required to render a
/// classification without exposing taxonomy artifacts or analysis-run persistence.
/// </para>
/// <para>
/// Collections are materialized as read-only snapshots so later aggregate mutation cannot change a response that
/// has already been projected.
/// </para>
/// </remarks>
/// <param name="System">The canonical taxonomy system.</param>
/// <param name="Version">The taxonomy artifact version that resolved the classification.</param>
/// <param name="Code">The canonical code selected from the taxonomy.</param>
/// <param name="OfficialLabel">The official label assigned to <paramref name="Code"/>.</param>
/// <param name="Hierarchy">The hierarchy path ending at <paramref name="Code"/>.</param>
/// <param name="Origin">Whether a user or analysis selected the classification.</param>
/// <param name="Confidence">The advisory analysis confidence, or null for a manual selection.</param>
/// <param name="Evidence">The evidence items that explain the selection.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct StandardClassificationResponseDto(
  [property: JsonPropertyName("system")] ClassificationSystem System,
  [property: JsonPropertyName("version")] string Version,
  [property: JsonPropertyName("code")] string Code,
  [property: JsonPropertyName("officialLabel")] string OfficialLabel,
  [property: JsonPropertyName("hierarchy")] IReadOnlyList<ClassificationNodeResponseDto> Hierarchy,
  [property: JsonPropertyName("origin")] ClassificationOrigin Origin,
  [property: JsonPropertyName("confidence")] double? Confidence,
  [property: JsonPropertyName("evidence")] IReadOnlyList<ClassificationEvidenceResponseDto> Evidence)
{
  /// <summary>
  /// Projects an optional domain classification into its public transport representation.
  /// </summary>
  /// <param name="classification">The canonical classification to project, or null when it is not assigned.</param>
  /// <returns>A complete immutable classification response, or null when <paramref name="classification"/> is null.</returns>
  public static StandardClassificationResponseDto? FromStandardClassification(StandardClassification? classification) =>
    classification is null
      ? null
      : new(
        System: classification.System,
        Version: classification.Version,
        Code: classification.Code,
        OfficialLabel: classification.OfficialLabel,
        Hierarchy: classification.Hierarchy
          .Select(ClassificationNodeResponseDto.FromClassificationNode)
          .ToList()
          .AsReadOnly(),
        Origin: classification.Origin,
        Confidence: classification.Confidence,
        Evidence: classification.Evidence
          .Select(ClassificationEvidenceResponseDto.FromClassificationEvidence)
          .ToList()
          .AsReadOnly());
}
