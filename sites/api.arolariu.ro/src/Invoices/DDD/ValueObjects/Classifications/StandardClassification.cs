namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

/// <summary>
/// Represents a canonical, immutable taxonomy classification assigned to an invoice domain value.
/// </summary>
/// <remarks>
/// <para>This value object is the canonical backend representation for automated classification output, manual picker selections, storage validation, and DTO projection.</para>
/// <para><b>Immutability:</b> The constructor snapshots hierarchy and evidence collections into read-only copies so later caller mutations do not change the classification.</para>
/// <para><b>Confidence Contract:</b> Manual classifications MUST NOT carry confidence values, while analysis-produced classifications MUST provide confidence in the inclusive range <c>[0, 1]</c>.</para>
/// </remarks>
public sealed record StandardClassification
{
  /// <summary>
  /// Initializes a new instance of the <see cref="StandardClassification"/> record.
  /// </summary>
  /// <param name="system">The taxonomy system from which the code and label originate.</param>
  /// <param name="version">The canonical taxonomy artifact version.</param>
  /// <param name="code">The canonical taxonomy code selected for the classified value.</param>
  /// <param name="officialLabel">The official taxonomy label associated with <paramref name="code"/>.</param>
  /// <param name="hierarchy">The canonical hierarchy path ending at <paramref name="code"/>.</param>
  /// <param name="origin">The classification origin describing whether the assignment was manual or analysis-driven.</param>
  /// <param name="confidence">The analysis confidence in the inclusive range <c>[0, 1]</c>; MUST be null for manual assignments.</param>
  /// <param name="evidence">The evidence items supporting the classification decision.</param>
  /// <exception cref="ArgumentException">Thrown when required text fields are missing, hierarchy is empty, origin/confidence rules are violated, or hierarchy does not end with the selected code.</exception>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="hierarchy"/> or <paramref name="evidence"/> is null.</exception>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="confidence"/> is outside the inclusive range <c>[0, 1]</c>.</exception>
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
    {
      throw new ArgumentException("Classification hierarchy must contain at least one node.", nameof(hierarchy));
    }

    if (!string.Equals(Hierarchy[^1].Code, Code, StringComparison.Ordinal))
    {
      throw new ArgumentException("Classification hierarchy must end with the selected code.", nameof(hierarchy));
    }
  }

  /// <summary>Gets the taxonomy system from which this classification originates.</summary>
  public ClassificationSystem System { get; }

  /// <summary>Gets the canonical taxonomy artifact version for this classification.</summary>
  public string Version { get; }

  /// <summary>Gets the canonical taxonomy code selected for this classification.</summary>
  public string Code { get; }

  /// <summary>Gets the official taxonomy label associated with <see cref="Code"/>.</summary>
  public string OfficialLabel { get; }

  /// <summary>Gets the canonical hierarchy path ending at <see cref="Code"/>.</summary>
  public IReadOnlyList<ClassificationNode> Hierarchy { get; }

  /// <summary>Gets the source of the classification decision.</summary>
  public ClassificationOrigin Origin { get; }

  /// <summary>Gets the confidence score for automated classifications, or null for manual selections.</summary>
  public double? Confidence { get; }

  /// <summary>Gets the evidence items captured for the classification decision.</summary>
  public IReadOnlyList<ClassificationEvidence> Evidence { get; }

  private static double? ValidateConfidence(ClassificationOrigin origin, double? confidence)
  {
    if (origin == ClassificationOrigin.Manual && confidence is not null)
    {
      throw new ArgumentException("Manual classifications must not include confidence.", nameof(confidence));
    }

    if (origin == ClassificationOrigin.Analysis && confidence is null)
    {
      throw new ArgumentException("Analysis classifications must include confidence.", nameof(confidence));
    }

    if (confidence is null)
    {
      return null;
    }

    return ClassificationContracts.RequireConfidence(confidence.Value, nameof(confidence));
  }
}

internal static class ClassificationContracts
{
  internal static string RequireText(string value, string parameterName)
  {
    ArgumentNullException.ThrowIfNull(value);

    if (string.IsNullOrWhiteSpace(value))
    {
      throw new ArgumentException("Value must not be empty or whitespace.", parameterName);
    }

    return value.Trim();
  }

  internal static double RequireConfidence(double value, string parameterName)
  {
    if (double.IsNaN(value) || double.IsInfinity(value) || value < 0 || value > 1)
    {
      throw new ArgumentOutOfRangeException(parameterName, value, "Confidence must be in the inclusive range [0, 1].");
    }

    return value;
  }

  internal static IReadOnlyList<TItem> Snapshot<TItem>(IReadOnlyList<TItem> items, string parameterName)
    where TItem : class
  {
    ArgumentNullException.ThrowIfNull(items);

    var snapshot = new TItem[items.Count];

    for (int index = 0; index < items.Count; index++)
    {
      TItem item = items[index] ?? throw new ArgumentException("Collection items must not be null.", parameterName);
      snapshot[index] = item;
    }

    return new ReadOnlyCollection<TItem>(snapshot);
  }
}
