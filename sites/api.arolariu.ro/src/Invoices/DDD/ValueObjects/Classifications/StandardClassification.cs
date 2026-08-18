namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

/// <summary>Represents an immutable canonical taxonomy classification.</summary>
[Serializable]
public sealed record StandardClassification
{
  /// <summary>Initializes a canonical classification.</summary>
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

  /// <summary>Gets the taxonomy system.</summary>
  public ClassificationSystem System { get; }
  /// <summary>Gets the taxonomy version.</summary>
  public string Version { get; }
  /// <summary>Gets the canonical code.</summary>
  public string Code { get; }
  /// <summary>Gets the official label.</summary>
  public string OfficialLabel { get; }
  /// <summary>Gets the canonical hierarchy.</summary>
  public IReadOnlyList<ClassificationNode> Hierarchy { get; }
  /// <summary>Gets the decision origin.</summary>
  public ClassificationOrigin Origin { get; }
  /// <summary>Gets analysis confidence or null for manual decisions.</summary>
  public double? Confidence { get; }
  /// <summary>Gets supporting evidence.</summary>
  public IReadOnlyList<ClassificationEvidence> Evidence { get; }

  /// <inheritdoc />
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

  /// <inheritdoc />
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

internal static class ClassificationContracts
{
  internal static string RequireText(string value, string parameterName)
  {
    ArgumentNullException.ThrowIfNull(value);
    if (string.IsNullOrWhiteSpace(value))
      throw new ArgumentException("Value must not be empty or whitespace.", parameterName);
    return value.Trim();
  }

  internal static double RequireConfidence(double value, string parameterName)
  {
    if (double.IsNaN(value) || double.IsInfinity(value) || value < 0 || value > 1)
      throw new ArgumentOutOfRangeException(parameterName, value, "Confidence must be in the inclusive range [0, 1].");
    return value;
  }

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
