namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Reflection;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies create and update product request mapping.</summary>
[TestClass]
public sealed class ProductRequestDtoTests
{
  /// <summary>Verifies create mapping carries the structured allergen assessment.</summary>
  [TestMethod]
  public void CreateProductRequestDto_AllergenAssessment_MapsToProduct()
  {
    AllergenAssessment assessment = AllergenAssessment.NoSignals();
    var request = new CreateProductRequestDto(
      "Milk",
      Category: ProductCategory.FreshFruit,
      Quantity: 1m,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: 8m,
      AllergenAssessment: assessment);

    Product product = request.ToProduct();

    Assert.AreSame(assessment, product.AllergenAssessment);
    Assert.AreEqual(ProductCategory.FreshFruit, product.Category);
  }

  /// <summary>Verifies update mapping carries client data and preserves server-owned product state.</summary>
  [TestMethod]
  public void UpdateProductRequestDto_AllergenAssessment_MapsToProduct()
  {
    AllergenAssessment assessment = AllergenAssessment.Insufficient();
    var request = new UpdateProductRequestDto(
      "Old milk",
      "Milk",
      Quantity: 1m,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: 8m,
      AllergenAssessment: assessment);

    var persistedProduct = new Product
    {
      Category = ProductCategory.Milk,
      Metadata = new ProductMetadata { IsComplete = true },
    };
    Product product = request.ToProduct(persistedProduct);

    Assert.AreSame(assessment, product.AllergenAssessment);
    Assert.AreEqual(persistedProduct.Category, product.Category);
    Assert.IsTrue(product.Metadata.IsEdited);
    Assert.IsTrue(product.Metadata.IsComplete);
    Assert.IsFalse(persistedProduct.Metadata.IsEdited);
  }

  /// <summary>Verifies product creation can leave the category unset.</summary>
  [TestMethod]
  public void CreateProductRequestDto_NullCategory_LeavesCategoryUnset()
  {
    var request = new CreateProductRequestDto(
      "Milk",
      Category: null,
      Quantity: 1m,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: 8m,
      AllergenAssessment: null);

    Assert.IsNull(request.ToProduct().Category);
  }

  /// <summary>Verifies quantity and price are non-nullable required contract values.</summary>
  [TestMethod]
  public void ProductRequestDtos_QuantityAndPrice_AreRequiredDecimals()
  {
    AssertRequiredDecimal<CreateProductRequestDto>(nameof(CreateProductRequestDto.Quantity));
    AssertRequiredDecimal<CreateProductRequestDto>(nameof(CreateProductRequestDto.Price));
  }

  private static void AssertRequiredDecimal<TRequest>(string propertyName)
  {
    PropertyInfo property = typeof(TRequest).GetProperty(propertyName)
      ?? throw new AssertFailedException($"Property '{propertyName}' was not found.");
    ParameterInfo parameter = typeof(TRequest)
      .GetConstructors(BindingFlags.Public | BindingFlags.Instance)
      .Single()
      .GetParameters()
      .Single(candidate => candidate.Name == propertyName);

    Assert.AreEqual(typeof(decimal), property.PropertyType);
    Assert.IsNotNull(parameter.GetCustomAttribute<RequiredAttribute>());
  }
}
