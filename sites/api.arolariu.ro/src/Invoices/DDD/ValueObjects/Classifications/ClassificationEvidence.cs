namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System;

/// <summary>
/// Captures one immutable input that supports a classification decision.
/// </summary>
/// <remarks>
/// Evidence records preserve both provenance and the observed value, such as a product
/// name extracted by OCR. Record equality is value-based, and both values are normalized
/// by trimming surrounding whitespace.
/// </remarks>
public sealed record ClassificationEvidence
{
  /// <summary>
  /// Initializes a validated classification evidence item.
  /// </summary>
  /// <param name="source">
  /// The non-empty logical source or field path that produced the observation.
  /// </param>
  /// <param name="value">The non-empty observed value supporting the decision.</param>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="source"/> or <paramref name="value"/> is
  /// <see langword="null"/>.
  /// </exception>
  /// <exception cref="ArgumentException">
  /// Thrown when <paramref name="source"/> or <paramref name="value"/> is empty or
  /// whitespace.
  /// </exception>
  public ClassificationEvidence(string source, string value)
  {
    Source = ClassificationContracts.RequireText(source, nameof(source));
    Value = ClassificationContracts.RequireText(value, nameof(value));
  }

  /// <summary>
  /// Gets the normalized logical source, such as an OCR field or analysis feature.
  /// </summary>
  public string Source { get; }

  /// <summary>Gets the normalized observed value supplied by <see cref="Source"/>.</summary>
  public string Value { get; }
}
