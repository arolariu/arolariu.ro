namespace arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Represents a canonical taxonomy search hit returned for manual classification pickers and validation flows.
/// </summary>
/// <remarks>
/// <para>Search results surface immutable canonical catalog data without origin, confidence, or evidence because no classification decision has been committed yet.</para>
/// <para><b>Immutability:</b> The hierarchy path is snapshotted to a read-only collection during construction.</para>
/// </remarks>
public sealed record TaxonomySearchResult
{
  /// <summary>
  /// Initializes a new instance of the <see cref="TaxonomySearchResult"/> record.
  /// </summary>
  /// <param name="system">The taxonomy system that produced the result.</param>
  /// <param name="version">The taxonomy artifact version.</param>
  /// <param name="code">The canonical taxonomy code for the result.</param>
  /// <param name="officialLabel">The canonical label for the result code.</param>
  /// <param name="hierarchy">The canonical hierarchy path ending at <paramref name="code"/>.</param>
  /// <exception cref="ArgumentException">Thrown when required text fields are missing, hierarchy is empty, or hierarchy does not end with the selected code.</exception>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="hierarchy"/> is null.</exception>
  public TaxonomySearchResult(
    ClassificationSystem system,
    string version,
    string code,
    string officialLabel,
    IReadOnlyList<ClassificationNode> hierarchy)
  {
    System = system;
    Version = ClassificationContracts.RequireText(version, nameof(version));
    Code = ClassificationContracts.RequireText(code, nameof(code));
    OfficialLabel = ClassificationContracts.RequireText(officialLabel, nameof(officialLabel));
    Hierarchy = ClassificationContracts.Snapshot(hierarchy, nameof(hierarchy));

    if (Hierarchy.Count == 0)
    {
      throw new ArgumentException("Search result hierarchy must contain at least one node.", nameof(hierarchy));
    }

    if (!string.Equals(Hierarchy[^1].Code, Code, StringComparison.Ordinal))
    {
      throw new ArgumentException("Search result hierarchy must end with the selected code.", nameof(hierarchy));
    }
  }

  /// <summary>Gets the taxonomy system that produced the search result.</summary>
  public ClassificationSystem System { get; }

  /// <summary>Gets the taxonomy artifact version from which the result was produced.</summary>
  public string Version { get; }

  /// <summary>Gets the canonical taxonomy code for the search result.</summary>
  public string Code { get; }

  /// <summary>Gets the canonical label associated with <see cref="Code"/>.</summary>
  public string OfficialLabel { get; }

  /// <summary>Gets the canonical hierarchy path ending at <see cref="Code"/>.</summary>
  public IReadOnlyList<ClassificationNode> Hierarchy { get; }
}
