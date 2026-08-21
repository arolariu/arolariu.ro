namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Represents one official node in a classification hierarchy response.
/// </summary>
/// <param name="Level">The taxonomy level represented by the node.</param>
/// <param name="Code">The canonical code at this hierarchy level.</param>
/// <param name="OfficialLabel">The official taxonomy label for the node.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ClassificationNodeResponseDto(
  [property: JsonPropertyName("level")] string Level,
  [property: JsonPropertyName("code")] string Code,
  [property: JsonPropertyName("officialLabel")] string OfficialLabel)
{
  /// <summary>
  /// Projects a canonical hierarchy node into its public transport representation.
  /// </summary>
  /// <param name="node">The canonical hierarchy node to project.</param>
  /// <returns>An immutable hierarchy-node response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="node"/> is null.</exception>
  public static ClassificationNodeResponseDto FromClassificationNode(ClassificationNode node)
  {
    ArgumentNullException.ThrowIfNull(node);
    return new(node.Level, node.Code, node.OfficialLabel);
  }
}
