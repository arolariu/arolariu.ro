namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Reflection;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
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
    AllergenAssessment assessment = AllergenAssessment.NoSignals(Guid.NewGuid());
    var request = new CreateProductRequestDto(
      "Milk",
      ClassificationCode: " 10000025 ",
      Quantity: 1m,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: 8m,
      AllergenAssessment: assessment);

    Product product = request.ToProduct();

    Assert.AreSame(assessment, product.AllergenAssessment);
    Assert.IsNull(product.Classification);
  }

  /// <summary>Verifies update mapping carries client data and preserves server-owned product state.</summary>
  [TestMethod]
  public void UpdateProductRequestDto_AllergenAssessment_MapsToProduct()
  {
    AllergenAssessment assessment = AllergenAssessment.Insufficient(Guid.NewGuid());
    var request = new UpdateProductRequestDto(
      "Old milk",
      "Milk",
      ClassificationCode: null,
      Quantity: 1m,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: 8m,
      AllergenAssessment: assessment);

    var persistedProduct = new Product
    {
      Classification = ClassificationTestData.Gpc("10000025", "Milk"),
      Metadata = new ProductMetadata { IsComplete = true },
    };
    Product product = request.ToProduct(persistedProduct);

    Assert.AreSame(assessment, product.AllergenAssessment);
    Assert.AreSame(persistedProduct.Classification, product.Classification);
    Assert.IsTrue(product.Metadata.IsEdited);
    Assert.IsTrue(product.Metadata.IsComplete);
    Assert.IsFalse(persistedProduct.Metadata.IsEdited);
  }

  /// <summary>Verifies product mapping leaves classification resolution to Processing.</summary>
  [TestMethod]
  public void CreateProductRequestDto_WhitespaceClassificationCode_DoesNotCreateClassification()
  {
    var request = new CreateProductRequestDto(
      "Milk",
      ClassificationCode: " ",
      Quantity: 1m,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: 8m,
      AllergenAssessment: null);

    Assert.IsNull(request.ToProduct().Classification);
  }

  /// <summary>Verifies quantity and price are non-nullable required contract values.</summary>
  [TestMethod]
  public void ProductRequestDtos_QuantityAndPrice_AreRequiredDecimals()
  {
    AssertRequiredDecimal<CreateProductRequestDto>(nameof(CreateProductRequestDto.Quantity));
    AssertRequiredDecimal<CreateProductRequestDto>(nameof(CreateProductRequestDto.Price));
    AssertRequiredDecimal<UpdateProductRequestDto>(nameof(UpdateProductRequestDto.Quantity));
    AssertRequiredDecimal<UpdateProductRequestDto>(nameof(UpdateProductRequestDto.Price));
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
