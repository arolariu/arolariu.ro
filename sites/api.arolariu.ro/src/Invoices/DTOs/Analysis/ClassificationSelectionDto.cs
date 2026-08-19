namespace arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Represents a caller-supplied manual classification selection expressed purely as a taxonomy system plus a code.
/// </summary>
/// <remarks>
/// <para><b>Canonicalization:</b> This DTO deliberately carries no official label, version, or hierarchy. Callers may
/// not assert taxonomy metadata. Processing re-resolves every non-null classification through Analysis Orchestration
/// before persistence, so the placeholder metadata produced by <see cref="ToManualSelection"/> never
/// reaches the datastore.</para>
/// <para><b>Provenance:</b> A selection made through this DTO is always recorded with
/// <see cref="ClassificationOrigin.Manual"/> and a <see langword="null"/> confidence, because a human choice has no
/// model confidence.</para>
/// <para><b>Expected systems:</b> <see cref="ClassificationSystem.EcoicopV2"/> for invoices,
/// <see cref="ClassificationSystem.Gs1Gpc"/> for products, and <see cref="ClassificationSystem.Nace21"/> for merchants.
/// Processing rejects mismatched systems before resource persistence.</para>
/// </remarks>
/// <param name="System">The taxonomy system the <paramref name="Code"/> belongs to.</param>
/// <param name="Code">The taxonomy code selected by the caller.</param>
[Serializable]
public readonly record struct ClassificationSelectionDto(
  ClassificationSystem System,
  string Code)
{
  private const string PlaceholderVersion = "unresolved";
  private const string PlaceholderLabel = "unresolved";

  /// <summary>
  /// Converts this selection into an unresolved manual <see cref="StandardClassification"/>.
  /// </summary>
  /// <remarks>
  /// <para>The returned classification carries placeholder version, label, and single-node hierarchy values. It is only
  /// ever an intermediate representation: Processing replaces it with the canonical taxonomy projection
  /// before persistence.</para>
  /// </remarks>
  /// <returns>An unresolved manual classification carrying the selected system and code.</returns>
  /// <exception cref="ArgumentException">Thrown when <see cref="Code"/> is null, empty, or whitespace.</exception>
  public StandardClassification ToManualSelection()
  {
    if (string.IsNullOrWhiteSpace(Code))
    {
      throw new ArgumentException("Classification code must not be null, empty, or whitespace.", nameof(Code));
    }

    string code = Code.Trim();
    IReadOnlyList<ClassificationNode> hierarchy = [new ClassificationNode(PlaceholderVersion, code, PlaceholderLabel)];

    return new StandardClassification(
      System,
      PlaceholderVersion,
      code,
      PlaceholderLabel,
      hierarchy,
      ClassificationOrigin.Manual,
      confidence: null,
      evidence: []);
  }
}
