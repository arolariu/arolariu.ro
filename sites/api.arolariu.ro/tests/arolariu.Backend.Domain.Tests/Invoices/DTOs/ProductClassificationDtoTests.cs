namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.DTOs.Responses;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies product classification request and response contracts.</summary>
[TestClass]
public sealed class ProductClassificationDtoTests
{
  /// <summary>Verifies new products remain unclassified.</summary>
  [TestMethod]
  public void CreateToProduct_NewProduct_IsUnclassified()
  {
    var request = new CreateProductRequestDto(
      "Milk",
      1,
      "pcs",
      "",
      8.5m,
      []);

    Product product = request.ToProduct();

    Assert.IsNull(product.Classification);
  }

  /// <summary>Verifies product replacement preserves the existing canonical snapshot.</summary>
  [TestMethod]
  public void UpdateToProduct_ExistingClassification_PreservesSnapshot()
  {
    StandardClassification classification = TaxonomyBrokerTestFactory.Create().Resolve(
      ClassificationSystem.Gs1Gpc,
      TaxonomyBrokerTestFactory.GpcCode,
      ClassificationOrigin.Manual,
      null,
      []);
    var request = new UpdateProductRequestDto(
      "Milk",
      "Milk",
      1,
      "pcs",
      "",
      8.5m,
      []);

    Product product = request.ToProduct(classification);

    Assert.AreSame(classification, product.Classification);
  }

  /// <summary>Verifies response mapping exposes the complete GPC snapshot.</summary>
  [TestMethod]
  public void FromProduct_CanonicalClassification_MapsCompleteSnapshot()
  {
    var product = new Product {Name = "Milk"};
    product.Classification = TaxonomyBrokerTestFactory.Create().Resolve(
      ClassificationSystem.Gs1Gpc,
      TaxonomyBrokerTestFactory.GpcCode,
      ClassificationOrigin.Manual,
      null,
      []);

    ProductResponseDto response = ProductResponseDto.FromProduct(product);

    Assert.AreEqual(product.Classification, response.Classification);
  }
}
