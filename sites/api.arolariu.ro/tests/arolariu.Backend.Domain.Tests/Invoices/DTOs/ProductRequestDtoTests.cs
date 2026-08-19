namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

using Microsoft.AspNetCore.Http;
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
      ClassificationSystem: null,
      ClassificationCode: null,
      Quantity: 1m,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: 8m,
      AllergenAssessment: assessment);

    Product product = request.ToProduct();

    Assert.AreSame(assessment, product.AllergenAssessment);
  }

  /// <summary>Verifies update mapping carries the structured allergen assessment.</summary>
  [TestMethod]
  public void UpdateProductRequestDto_AllergenAssessment_MapsToProduct()
  {
    AllergenAssessment assessment = AllergenAssessment.Insufficient(Guid.NewGuid());
    var request = new UpdateProductRequestDto(
      "Old milk",
      "Milk",
      ClassificationSystem: null,
      ClassificationCode: null,
      Quantity: 1m,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: 8m,
      AllergenAssessment: assessment);

    Product product = request.ToProduct();

    Assert.AreSame(assessment, product.AllergenAssessment);
  }

  /// <summary>Verifies omitted quantity cannot silently become zero.</summary>
  [TestMethod]
  public void CreateProductRequestDto_MissingQuantity_ThrowsBadHttpRequestException()
  {
    var request = new CreateProductRequestDto(
      "Milk",
      ClassificationSystem: null,
      ClassificationCode: null,
      Quantity: null,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: 8m,
      AllergenAssessment: null);

    Assert.ThrowsExactly<BadHttpRequestException>(() => request.ToProduct());
  }

  /// <summary>Verifies omitted price cannot silently become zero.</summary>
  [TestMethod]
  public void UpdateProductRequestDto_MissingPrice_ThrowsBadHttpRequestException()
  {
    var request = new UpdateProductRequestDto(
      "Old milk",
      "Milk",
      ClassificationSystem: null,
      ClassificationCode: null,
      Quantity: 1m,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: null,
      AllergenAssessment: null);

    Assert.ThrowsExactly<BadHttpRequestException>(() => request.ToProduct());
  }
}
