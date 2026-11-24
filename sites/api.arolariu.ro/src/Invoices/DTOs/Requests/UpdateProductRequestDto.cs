namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Represents a category change or a full product edit addressed by its current name.
/// </summary>
/// <remarks>
/// A category-only edit preserves commercial data. The name must identify exactly one product.
/// </remarks>
/// <param name="OriginalProductName">The current name used to locate the product by case-insensitive exact match.</param>
/// <param name="Name">The replacement product name.</param>
/// <param name="Category">A valid product category ID to assign, or -1 to clear. Omitted or null preserves it.</param>
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
  string? Name,
  int? Category,
  decimal? Quantity,
  string? QuantityUnit,
  string? ProductCode,
  decimal? Price,
  AllergenAssessment? AllergenAssessment)
{
  // Only a category-only edit can omit the replacement name, quantity, and price.
  private bool IsCategoryOnly => Category.HasValue && Name is null && Quantity is null && Price is null
    && QuantityUnit is null && ProductCode is null && AllergenAssessment is null;

  internal bool IsValid => !string.IsNullOrWhiteSpace(OriginalProductName)
    && (Category is null or -1 || Enum.IsDefined((ProductCategory)Category.Value))
    && (IsCategoryOnly || (!string.IsNullOrWhiteSpace(Name) && Quantity.HasValue && Price.HasValue));

  /// <summary>Maps client-editable fields onto a replacement while preserving server-owned product state.</summary>
  /// <param name="persistedProduct">The persisted product returned by the Management read operation.</param>
  /// <returns>The replacement for the existing product line.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="persistedProduct"/> is null.</exception>
  public Product ToProduct(Product persistedProduct)
  {
    ArgumentNullException.ThrowIfNull(persistedProduct);

    ProductMetadata metadata = persistedProduct.Metadata;
    metadata.IsEdited = true;

    return new Product
    {
      Name = IsCategoryOnly ? persistedProduct.Name : Name?.Trim() ?? string.Empty,
      Category = Category switch
      {
        null => persistedProduct.Category,
        -1 => null,
        int id => (ProductCategory)id,
      },
      Quantity = Quantity ?? persistedProduct.Quantity,
      QuantityUnit = IsCategoryOnly ? persistedProduct.QuantityUnit : QuantityUnit?.Trim() ?? string.Empty,
      ProductCode = IsCategoryOnly ? persistedProduct.ProductCode : ProductCode?.Trim() ?? string.Empty,
      Price = Price ?? persistedProduct.Price,
      AllergenAssessment = AllergenAssessment ?? persistedProduct.AllergenAssessment,
      Metadata = metadata,
    };
  }
}
