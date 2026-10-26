namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System;

/// <summary>
/// Represents one immutable canonical node in a taxonomy hierarchy.
/// </summary>
/// <remarks>
/// A node carries taxonomy-native level, code, and label values. Its position is
/// determined by its containing hierarchy rather than by parent references on this
/// value object. Record equality is value-based.
/// </remarks>
public sealed record ClassificationNode
{
  /// <summary>
  /// Initializes a validated canonical hierarchy node.
  /// </summary>
  /// <param name="level">The non-empty taxonomy-specific level name.</param>
  /// <param name="code">The non-empty canonical code at that level.</param>
  /// <param name="officialLabel">The non-empty publisher-defined label.</param>
  /// <exception cref="ArgumentNullException">
  /// Thrown when any argument is <see langword="null"/>.
  /// </exception>
  /// <exception cref="ArgumentException">
  /// Thrown when any argument is empty or whitespace.
  /// </exception>
  public ClassificationNode(string level, string code, string officialLabel)
  {
    Level = ClassificationContracts.RequireText(level, nameof(level));
    Code = ClassificationContracts.RequireText(code, nameof(code));
    OfficialLabel = ClassificationContracts.RequireText(officialLabel, nameof(officialLabel));
  }

  /// <summary>Gets the normalized taxonomy-specific hierarchy level.</summary>
  public string Level { get; }

  /// <summary>Gets the normalized canonical code at <see cref="Level"/>.</summary>
  public string Code { get; }

  /// <summary>Gets the normalized publisher-defined label for <see cref="Code"/>.</summary>
  public string OfficialLabel { get; }
}
