namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using Microsoft.AspNetCore.Http;

/// <summary>
/// Represents a full client-editable replacement for the first invoice product matching
/// <see cref="OriginalProductName"/>.
/// </summary>
/// <remarks>
/// The original name identifies the persisted line item. Commercial values, an optional canonical classification
/// selection, and an optional structured allergen assessment are applied while server-owned workflow metadata remains
/// preserved by the Processing layer.
/// </remarks>
/// <param name="OriginalProductName">The current product name used to locate the first matching line item.</param>
/// <param name="Name">The replacement product name.</param>
/// <param name="ClassificationCode">Optional GS1 GPC classification code.</param>
/// <param name="Quantity">The required replacement quantity.</param>
/// <param name="QuantityUnit">The optional replacement unit of measure.</param>
/// <param name="ProductCode">The optional replacement SKU or barcode.</param>
/// <param name="Price">The required replacement unit price.</param>
/// <param name="AllergenAssessment">Optional replacement structured allergen assessment.</param>
/// <seealso cref="CreateProductRequestDto"/>
/// <seealso cref="DeleteProductRequestDto"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct UpdateProductRequestDto(
  [Required] string OriginalProductName,
  [Required] string Name,
  string? ClassificationCode,
  [Required] decimal Quantity,
  string? QuantityUnit,
  string? ProductCode,
  [Required] decimal Price,
  AllergenAssessment? AllergenAssessment)
{
  private const string PlaceholderVersion = "unresolved";
  private const string PlaceholderLabel = "unresolved";

  /// <summary>Maps client-editable fields to a transient product update.</summary>
  public Product ToProduct() => new()
  {
    Name = Name?.Trim() ?? string.Empty,
    Classification = CreateManualClassification(ClassificationCode),
    Quantity = Quantity,
    QuantityUnit = QuantityUnit?.Trim() ?? string.Empty,
    ProductCode = ProductCode?.Trim() ?? string.Empty,
    Price = Price,
    AllergenAssessment = AllergenAssessment,
  };

  private static StandardClassification? CreateManualClassification(string? code)
  {
    if (code is null)
    {
      return null;
    }

    if (string.IsNullOrWhiteSpace(code))
    {
      throw new BadHttpRequestException("Classification code must not be empty or whitespace.");
    }

    string normalizedCode = code.Trim();
    IReadOnlyList<ClassificationNode> hierarchy =
      [new ClassificationNode(PlaceholderVersion, normalizedCode, PlaceholderLabel)];

    return new StandardClassification(
      ClassificationSystem.Gs1Gpc,
      PlaceholderVersion,
      normalizedCode,
      PlaceholderLabel,
      hierarchy,
      ClassificationOrigin.Manual,
      confidence: null,
      evidence: []);
  }
}
