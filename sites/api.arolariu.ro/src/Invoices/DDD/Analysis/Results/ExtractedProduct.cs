namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Represents one normalized transient product extracted from receipt scans.
/// </summary>
public sealed record ExtractedProduct
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ExtractedProduct"/> record.
  /// </summary>
  /// <param name="name">The normalized product name.</param>
  /// <param name="quantity">The normalized non-negative quantity.</param>
  /// <param name="quantityUnit">The normalized quantity unit.</param>
  /// <param name="productCode">The normalized product code.</param>
  /// <param name="price">The normalized non-negative unit price.</param>
  /// <param name="confidence">The confidence for the extracted product line.</param>
  public ExtractedProduct(
    string name,
    decimal quantity,
    string quantityUnit,
    string productCode,
    decimal price,
    double confidence)
  {
    Name = AnalysisContractGuards.RequireText(name, nameof(name));
    QuantityUnit = AnalysisContractGuards.NormalizeOptionalText(quantityUnit) ?? string.Empty;
    ProductCode = AnalysisContractGuards.NormalizeOptionalText(productCode) ?? string.Empty;

    if (quantity < 0)
    {
      throw new ArgumentOutOfRangeException(nameof(quantity), quantity, "Quantity must be greater than or equal to zero.");
    }

    if (price < 0)
    {
      throw new ArgumentOutOfRangeException(nameof(price), price, "Price must be greater than or equal to zero.");
    }

    Quantity = quantity;
    Price = price;
    Confidence = AnalysisContractGuards.RequireConfidence(confidence, nameof(confidence));
  }

  /// <summary>
  /// Gets the normalized product name.
  /// </summary>
  public string Name { get; }

  /// <summary>
  /// Gets the normalized non-negative quantity.
  /// </summary>
  public decimal Quantity { get; }

  /// <summary>
  /// Gets the normalized quantity unit.
  /// </summary>
  public string QuantityUnit { get; }

  /// <summary>
  /// Gets the normalized product code.
  /// </summary>
  public string ProductCode { get; }

  /// <summary>
  /// Gets the normalized non-negative unit price.
  /// </summary>
  public decimal Price { get; }

  /// <summary>
  /// Gets the confidence for the extracted product line.
  /// </summary>
  public double Confidence { get; }
}
