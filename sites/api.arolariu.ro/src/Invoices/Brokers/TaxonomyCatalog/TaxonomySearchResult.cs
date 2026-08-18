namespace arolariu.Backend.Domain.Invoices.Brokers.TaxonomyCatalog;

using System;
using System.Collections.Generic;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>Represents one canonical taxonomy search result.</summary>
public sealed record TaxonomySearchResult
{
  /// <summary>Initializes an immutable search result.</summary>
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
    if (Hierarchy.Count == 0 || !string.Equals(Hierarchy[^1].Code, Code, StringComparison.Ordinal))
      throw new ArgumentException("Search result hierarchy must end with the selected code.", nameof(hierarchy));
  }

  /// <summary>Gets the taxonomy system.</summary>
  public ClassificationSystem System { get; }
  /// <summary>Gets the artifact version.</summary>
  public string Version { get; }
  /// <summary>Gets the canonical code.</summary>
  public string Code { get; }
  /// <summary>Gets the official label.</summary>
  public string OfficialLabel { get; }
  /// <summary>Gets the canonical hierarchy.</summary>
  public IReadOnlyList<ClassificationNode> Hierarchy { get; }
}
