namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Correlates transient <see cref="ProductAnalysisInput"/> batches back to their resolved <see cref="ProductClassificationResult"/> values.
/// </summary>
/// <remarks>
/// <para>This mapper is a pure, side-effect-free adapter over the reusable structured classification engine's output. It performs
/// no persistence, no allergen/recipe enrichment, and no invoice-level aggregation.</para>
/// </remarks>
public static class ProductResultMapper
{
  /// <summary>
  /// Maps a batch of product analysis inputs to their resolved classifications, preserving input order.
  /// </summary>
  /// <param name="products">The transient product analysis inputs originally submitted for classification.</param>
  /// <param name="classifications">The classification result produced for the same batch.</param>
  /// <returns>An ordered, read-only projection pairing each product with its resolved classification.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="products"/> or <paramref name="classifications"/> is null.</exception>
  /// <exception cref="ArgumentException">Thrown when <paramref name="classifications"/> does not contain a value for one or more requested correlation tokens.</exception>
  public static IReadOnlyList<ClassifiedProductAnalysisResult> Map(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications)
  {
    ArgumentNullException.ThrowIfNull(products);
    ArgumentNullException.ThrowIfNull(classifications);

    var mapped = new ClassifiedProductAnalysisResult[products.Count];

    for (int index = 0; index < products.Count; index++)
    {
      ProductAnalysisInput input = products[index];

      if (!classifications.Classifications.TryGetValue(input.CorrelationToken, out StandardClassification? classification))
      {
        throw new ArgumentException(
          $"No classification was produced for correlation token '{input.CorrelationToken}'.",
          nameof(classifications));
      }

      mapped[index] = new ClassifiedProductAnalysisResult(input.Product, classification);
    }

    return new ReadOnlyCollection<ClassifiedProductAnalysisResult>(mapped);
  }
}

/// <summary>
/// Represents one product paired with its resolved canonical GPC classification.
/// </summary>
/// <param name="Product">The product instance that was classified.</param>
/// <param name="Classification">The canonical GPC classification resolved for <paramref name="Product"/>.</param>
public sealed record ClassifiedProductAnalysisResult(Product Product, StandardClassification Classification);
