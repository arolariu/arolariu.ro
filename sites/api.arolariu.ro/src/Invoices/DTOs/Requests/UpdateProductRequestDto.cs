namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Replaces the first product matching <see cref="OriginalProductName"/>.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct UpdateProductRequestDto(
  [Required] string OriginalProductName,
  [Required] string Name,
  ClassificationSystem? ClassificationSystem,
  string? ClassificationCode,
  decimal Quantity,
  string? QuantityUnit,
  string? ProductCode,
  decimal Price)
{
  /// <summary>Maps client-editable fields to a transient product update.</summary>
  public Product ToProduct() => new()
  {
    Name = Name?.Trim() ?? string.Empty,
    Classification = RequestClassificationMapper.ToManualSelection(
      ClassificationSystem,
      ClassificationCode,
      DDD.ValueObjects.Classifications.ClassificationSystem.Gs1Gpc),
    Quantity = Quantity,
    QuantityUnit = QuantityUnit?.Trim() ?? string.Empty,
    ProductCode = ProductCode?.Trim() ?? string.Empty,
    Price = Price,
  };
}
