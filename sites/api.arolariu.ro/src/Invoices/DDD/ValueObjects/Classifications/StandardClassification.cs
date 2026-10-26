namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

/// <summary>
/// Represents an immutable, versioned decision against a canonical taxonomy.
/// </summary>
/// <remarks>
/// <para>
/// The value object records the selected canonical node, its complete root-to-node
/// hierarchy, the decision origin, and supporting evidence. Collection inputs are
/// defensively copied so later caller mutations cannot alter the decision snapshot.
/// </para>
/// <para>
/// Manual decisions omit confidence, while analysis decisions require a finite value in
/// the inclusive range [0, 1]. Equality and hashing compare hierarchy and evidence by
/// sequence content rather than collection reference.
/// </para>
/// <para>
/// The record and its component records are immutable and safe to share after
/// construction.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// var classification = new StandardClassification(
///   ClassificationSystem.EcoicopV2,
///   "2",
///   "01.1",
///   "Food",
///   [
///     new ClassificationNode("division", "01", "Food and beverages"),
///     new ClassificationNode("group", "01.1", "Food")
///   ],
///   ClassificationOrigin.Analysis,
///   0.92,
///   [new ClassificationEvidence("product.name", "bread")]);
/// </code>
/// </example>
[Serializable]
public sealed record StandardClassification
{
  /// <summary>
  /// Initializes and validates a canonical classification decision snapshot.
  /// </summary>
  /// <param name="system">The canonical taxonomy containing the selected node.</param>
  /// <param name="version">The non-empty taxonomy artifact version used for the decision.</param>
  /// <param name="code">The non-empty canonical code selected by the decision.</param>
  /// <param name="officialLabel">The selected node's non-empty official label.</param>
  /// <param name="hierarchy">
  /// The non-empty root-to-selected-node hierarchy; its final code must equal
  /// <paramref name="code"/>.
  /// </param>
  /// <param name="origin">The automated or manual source of the decision.</param>
  /// <param name="confidence">
  /// A finite analysis confidence in [0, 1], or null for a manual decision.
  /// </param>
  /// <param name="evidence">
  /// The supporting evidence sequence to copy; the sequence may be empty but cannot
  /// contain null items.
  /// </param>
  /// <exception cref="ArgumentNullException">
  /// Thrown when a required text or collection argument is <see langword="null"/>.
  /// </exception>
  /// <exception cref="ArgumentException">
  /// Thrown when text is blank, a collection contains null, the hierarchy is empty or
  /// terminates at another code, or confidence does not agree with
  /// <paramref name="origin"/>.
  /// </exception>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when a supplied confidence is not finite or lies outside [0, 1].
  /// </exception>
  public StandardClassification(
    ClassificationSystem system,
    string version,
    string code,
    string officialLabel,
    IReadOnlyList<ClassificationNode> hierarchy,
    ClassificationOrigin origin,
    double? confidence,
    IReadOnlyList<ClassificationEvidence> evidence)
  {
    System = system;
    Version = ClassificationContracts.RequireText(version, nameof(version));
    Code = ClassificationContracts.RequireText(code, nameof(code));
    OfficialLabel = ClassificationContracts.RequireText(officialLabel, nameof(officialLabel));
    Hierarchy = ClassificationContracts.Snapshot(hierarchy, nameof(hierarchy));
    Origin = origin;
    Confidence = ValidateConfidence(origin, confidence);
    Evidence = ClassificationContracts.Snapshot(evidence, nameof(evidence));

    if (Hierarchy.Count == 0)
      throw new ArgumentException("Classification hierarchy must contain at least one node.", nameof(hierarchy));
    if (!string.Equals(Hierarchy[^1].Code, Code, StringComparison.Ordinal))
      throw new ArgumentException("Classification hierarchy must end with the selected code.", nameof(hierarchy));
  }

  /// <summary>Gets the canonical taxonomy containing the selected code.</summary>
  public ClassificationSystem System { get; }

  /// <summary>Gets the exact taxonomy artifact version used by the decision.</summary>
  public string Version { get; }

  /// <summary>Gets the selected node's canonical taxonomy code.</summary>
  public string Code { get; }

  /// <summary>Gets the selected node's publisher-defined official label.</summary>
  public string OfficialLabel { get; }

  /// <summary>Gets the immutable canonical path from the root to <see cref="Code"/>.</summary>
  public IReadOnlyList<ClassificationNode> Hierarchy { get; }

  /// <summary>Gets whether analysis or a person selected the classification.</summary>
  public ClassificationOrigin Origin { get; }

  /// <summary>
  /// Gets analysis confidence in [0, 1], or null when <see cref="Origin"/> is manual.
  /// </summary>
  public double? Confidence { get; }

  /// <summary>Gets the immutable evidence snapshot supporting the decision.</summary>
  public IReadOnlyList<ClassificationEvidence> Evidence { get; }

  /// <summary>
  /// Determines whether another classification has the same complete decision value.
  /// </summary>
  /// <param name="other">The classification to compare, or null.</param>
  /// <returns>
  /// <see langword="true"/> when scalar values and ordered hierarchy and evidence
  /// sequences are equal; otherwise, <see langword="false"/>.
  /// </returns>
  public bool Equals(StandardClassification? other) =>
    ReferenceEquals(this, other)
    || (other is not null
      && System == other.System
      && string.Equals(Version, other.Version, StringComparison.Ordinal)
      && string.Equals(Code, other.Code, StringComparison.Ordinal)
      && string.Equals(OfficialLabel, other.OfficialLabel, StringComparison.Ordinal)
      && Origin == other.Origin
      && Nullable.Equals(Confidence, other.Confidence)
      && HaveEquivalentSequence(Hierarchy, other.Hierarchy)
      && HaveEquivalentSequence(Evidence, other.Evidence));

  /// <summary>
  /// Returns a hash code derived from the complete structural decision value.
  /// </summary>
  /// <returns>
  /// A hash code consistent with <see cref="Equals(StandardClassification)"/>,
  /// including ordered hierarchy and evidence contents.
  /// </returns>
  public override int GetHashCode()
  {
    var hashCode = new HashCode();
    hashCode.Add(System);
    hashCode.Add(Version, StringComparer.Ordinal);
    hashCode.Add(Code, StringComparer.Ordinal);
    hashCode.Add(OfficialLabel, StringComparer.Ordinal);
    hashCode.Add(Origin);
    hashCode.Add(Confidence);
    AddSequenceToHashCode(ref hashCode, Hierarchy);
    AddSequenceToHashCode(ref hashCode, Evidence);
    return hashCode.ToHashCode();
  }

  private static double? ValidateConfidence(ClassificationOrigin origin, double? confidence)
  {
    if (origin == ClassificationOrigin.Manual && confidence is not null)
      throw new ArgumentException("Manual classifications must not include confidence.", nameof(confidence));
    if (origin == ClassificationOrigin.Analysis && confidence is null)
      throw new ArgumentException("Analysis classifications must include confidence.", nameof(confidence));
    return confidence is null ? null : ClassificationContracts.RequireConfidence(confidence.Value, nameof(confidence));
  }

  private static bool HaveEquivalentSequence<TItem>(IReadOnlyList<TItem> left, IReadOnlyList<TItem> right)
    where TItem : class
  {
    if (left.Count != right.Count) return false;
    for (int index = 0; index < left.Count; index++)
      if (!EqualityComparer<TItem>.Default.Equals(left[index], right[index])) return false;
    return true;
  }

  private static void AddSequenceToHashCode<TItem>(ref HashCode hashCode, IReadOnlyList<TItem> items)
    where TItem : class
  {
    hashCode.Add(items.Count);
    foreach (TItem item in items) hashCode.Add(item);
  }
}

/// <summary>
/// Centralizes normalization and snapshot invariants for classification value objects.
/// </summary>
internal static class ClassificationContracts
{
  /// <summary>
  /// Trims required domain text after rejecting null, empty, or whitespace input.
  /// </summary>
  /// <param name="value">The text to validate and normalize.</param>
  /// <param name="parameterName">The public contract parameter represented by the value.</param>
  /// <returns>The input with surrounding whitespace removed.</returns>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="value"/> is <see langword="null"/>.
  /// </exception>
  /// <exception cref="ArgumentException">
  /// Thrown when <paramref name="value"/> is empty or whitespace.
  /// </exception>
  internal static string RequireText(string value, string parameterName)
  {
    ArgumentNullException.ThrowIfNull(value);
    if (string.IsNullOrWhiteSpace(value))
      throw new ArgumentException("Value must not be empty or whitespace.", parameterName);
    return value.Trim();
  }

  /// <summary>
  /// Validates a finite confidence score in the inclusive range [0, 1].
  /// </summary>
  /// <param name="value">The confidence score to validate.</param>
  /// <param name="parameterName">The public contract parameter represented by the score.</param>
  /// <returns>The validated confidence score.</returns>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when <paramref name="value"/> is NaN, infinite, or outside [0, 1].
  /// </exception>
  internal static double RequireConfidence(double value, string parameterName)
  {
    if (double.IsNaN(value) || double.IsInfinity(value) || value < 0 || value > 1)
      throw new ArgumentOutOfRangeException(parameterName, value, "Confidence must be in the inclusive range [0, 1].");
    return value;
  }

  /// <summary>
  /// Copies a reference-type sequence after rejecting null sequence elements.
  /// </summary>
  /// <typeparam name="TItem">The non-null reference type stored in the snapshot.</typeparam>
  /// <param name="items">The sequence to validate and copy.</param>
  /// <param name="parameterName">The public contract parameter represented by the sequence.</param>
  /// <returns>A read-only collection detached from the caller's collection instance.</returns>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="items"/> is <see langword="null"/>.
  /// </exception>
  /// <exception cref="ArgumentException">
  /// Thrown when <paramref name="items"/> contains a null element.
  /// </exception>
  internal static IReadOnlyList<TItem> Snapshot<TItem>(IReadOnlyList<TItem> items, string parameterName)
    where TItem : class
  {
    ArgumentNullException.ThrowIfNull(items);
    var snapshot = new TItem[items.Count];
    for (int index = 0; index < items.Count; index++)
      snapshot[index] = items[index] ?? throw new ArgumentException("Collection items must not be null.", parameterName);
    return new ReadOnlyCollection<TItem>(snapshot);
  }
}
