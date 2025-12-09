namespace arolariu.Backend.Domain.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// The CreateProduct DTO class represents the product data transfer object used when creating a product.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage] // DTOs are not tested - they are used to transfer data between the client and the server.
public readonly record struct CreateProductDto(
  string RawName,
string GenericName,
  IEnumerable<Allergen> DetectedAllergens,
  ProductCategory Category,
    decimal Quantity,
    string QuantityUnit,
    string ProductCode,
    decimal Price,
IDictionary<string, decimal> Metadata
)
{
  /// <summary>
  /// Method to convert the DTO to a Product.
  /// </summary>
  /// <returns></returns>
  public Product ToProduct() => new Product()
  {
    RawName = this.RawName,
    GenericName = this.GenericName,
    DetectedAllergens = [],
    Category = this.Category,
    Quantity = this.Quantity,
    QuantityUnit = this.QuantityUnit,
    ProductCode = this.ProductCode,
    Price = this.Price,
  };
}
