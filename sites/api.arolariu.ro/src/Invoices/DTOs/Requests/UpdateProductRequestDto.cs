namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;

/// <summary>
/// Replaces the first product matching <see cref="OriginalProductName"/>.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct UpdateProductRequestDto(
  [Required] string OriginalProductName,
  [Required] string Name,
  ClassificationSelectionDto? Classification,
  decimal Quantity,
  string? QuantityUnit,
  string? ProductCode,
  decimal Price)
{
  /// <summary>Maps client-editable fields to a transient product update.</summary>
  public Product ToProduct() => new()
  {
    Name = Name?.Trim() ?? string.Empty,
    Classification = Classification?.System == ClassificationSystem.Gs1Gpc
      ? Classification.Value.ToManualSelection()
      : null,
    Quantity = Quantity,
    QuantityUnit = QuantityUnit?.Trim() ?? string.Empty,
    ProductCode = ProductCode?.Trim() ?? string.Empty,
    Price = Price,
  };
}
