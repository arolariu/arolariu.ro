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
  /// <summary>Verifies create selections remain unresolved until invoice persistence.</summary>
  [TestMethod]
  public void CreateToProduct_GpcSelection_SetsPendingSelectionOnly()
  {
    var request = new CreateProductRequestDto(
      "Milk",
      new ClassificationSelectionDto(
        ClassificationSystem.Gs1Gpc,
        TaxonomyBrokerTestFactory.GpcCode),
      1,
      "pcs",
      "",
      8.5m,
      []);

    Product product = request.ToProduct();

    Assert.IsNull(product.Classification);
    Assert.AreEqual(
      ClassificationSystem.Gs1Gpc,
      product.PendingClassificationSelection?.System);
  }

  /// <summary>Verifies a null PUT selection produces an unclassified product.</summary>
  [TestMethod]
  public void UpdateToProduct_NullSelection_LeavesProductUnclassified()
  {
    var request = new UpdateProductRequestDto(
      "Milk",
      "Milk",
      null,
      1,
      "pcs",
      "",
      8.5m,
      []);

    Product product = request.ToProduct();

    Assert.IsNull(product.Classification);
    Assert.IsNull(product.PendingClassificationSelection);
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
