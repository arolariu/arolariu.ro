namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Represents the immutable transient result of GS1 Global Product Classification (GPC) analysis for a batch of products.
/// </summary>
/// <remarks>
/// <para>Classifications are keyed by the transient <see cref="Contracts.ProductAnalysisInput.CorrelationToken"/> supplied
/// for each product in the originating batch. Exactly one classification is present per requested correlation token.</para>
/// </remarks>
public sealed record ProductClassificationResult
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ProductClassificationResult"/> record.
  /// </summary>
  /// <param name="classifications">The canonical GPC classifications keyed by transient correlation token.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="classifications"/> or any classification value is null.</exception>
  /// <exception cref="ArgumentException">Thrown when any correlation token key is null, empty, or whitespace.</exception>
  public ProductClassificationResult(IReadOnlyDictionary<string, StandardClassification> classifications)
  {
    ArgumentNullException.ThrowIfNull(classifications);

    var snapshot = new Dictionary<string, StandardClassification>(StringComparer.Ordinal);

    foreach (KeyValuePair<string, StandardClassification> entry in classifications)
    {
      if (string.IsNullOrWhiteSpace(entry.Key))
      {
        throw new ArgumentException("Classification correlation tokens must not be null, empty, or whitespace.", nameof(classifications));
      }

      ArgumentNullException.ThrowIfNull(entry.Value);
      snapshot.Add(entry.Key, entry.Value);
    }

    Classifications = new ReadOnlyDictionary<string, StandardClassification>(snapshot);
  }

  /// <summary>Gets the canonical GPC classifications keyed by transient correlation token.</summary>
  public IReadOnlyDictionary<string, StandardClassification> Classifications { get; }
}
