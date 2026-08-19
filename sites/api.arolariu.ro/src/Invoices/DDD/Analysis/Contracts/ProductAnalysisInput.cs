namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using System;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Represents a transient product input passed into a product-level analysis capability.
/// </summary>
/// <remarks>
/// <para>The <see cref="CorrelationToken"/> is not a persisted product identifier. It exists only to correlate structured outputs back to the in-memory product that initiated the analysis call.</para>
/// <para>The supplied <see cref="Product"/> instance is stored by reference as-is. The contract does not clone the product or assign a new identity.</para>
/// <para>Products remain identity-free at this stage of the redesign.</para>
/// </remarks>
public sealed record ProductAnalysisInput
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ProductAnalysisInput"/> record.
  /// </summary>
  /// <param name="correlationToken">The transient token used to correlate downstream structured outputs to the source product.</param>
  /// <param name="product">The product instance submitted for analysis.</param>
  /// <exception cref="ArgumentException">Thrown when <paramref name="correlationToken"/> is null, empty, or whitespace.</exception>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="product"/> is null.</exception>
  public ProductAnalysisInput(string correlationToken, Product product)
  {
    CorrelationToken = AnalysisContractGuards.RequireText(correlationToken, nameof(correlationToken));
    Product = product ?? throw new ArgumentNullException(nameof(product));
  }

  /// <summary>
  /// Gets the transient correlation token used for in-memory result correlation.
  /// </summary>
  public string CorrelationToken { get; }

  /// <summary>
  /// Gets the supplied product instance submitted for analysis.
  /// </summary>
  public Product Product { get; }
}
