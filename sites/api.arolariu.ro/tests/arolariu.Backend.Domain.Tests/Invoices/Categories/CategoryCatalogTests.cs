namespace arolariu.Backend.Domain.Tests.Invoices.Categories;

using System;
using System.Linq;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.Categories;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies the embedded catalog and category JSON contract.</summary>
[TestClass]
public sealed class CategoryCatalogTests
{
  /// <summary>Every enum member can be selected from its packaged catalog.</summary>
  [TestMethod]
  public void Catalogs_EmbeddedResources_CoverEveryDomainMember()
  {
    Assert.HasCount(100, CategoryCatalog.Products);
    Assert.HasCount(100, CategoryCatalog.Merchants);
    Assert.HasCount(100, CategoryCatalog.Invoices);
    CollectionAssert.AreEquivalent(Enum.GetValues<ProductCategory>(), CategoryCatalog.Products.Select(entry => entry.Id).ToArray());
    CollectionAssert.AreEquivalent(Enum.GetValues<MerchantCategory>(), CategoryCatalog.Merchants.Select(entry => entry.Id).ToArray());
    CollectionAssert.AreEquivalent(Enum.GetValues<InvoiceCategory>(), CategoryCatalog.Invoices.Select(entry => entry.Id).ToArray());
    Assert.AreEqual("freshFruit", CategoryCatalog.GetProduct(ProductCategory.FreshFruit).Key);
    Assert.IsTrue(CategoryCatalog.IsFood(ProductCategory.FreshFruit));
    Assert.IsFalse(CategoryCatalog.IsFood(ProductCategory.PetFood));
    Assert.IsFalse(CategoryCatalog.IsFood(ProductCategory.Other));
    Assert.IsFalse(CategoryCatalog.IsFood(null));
  }

  /// <summary>Only a number from the expected domain can represent a category.</summary>
  [TestMethod]
  [DataRow("0")]
  [DataRow("2001")]
  [DataRow("\"1001\"")]
  [DataRow("1001.5")]
  public void Deserialize_ProductCategory_RejectsNonMembers(string json) =>
    Assert.ThrowsExactly<JsonException>(() => JsonSerializer.Deserialize<ProductCategory?>(json));

  /// <summary>Other is a selectable number, distinct from no category.</summary>
  [TestMethod]
  public void Deserialize_ProductCategory_DistinguishesOtherFromNull()
  {
    Assert.AreEqual(ProductCategory.Other, JsonSerializer.Deserialize<ProductCategory?>("1100"));
    Assert.IsNull(JsonSerializer.Deserialize<ProductCategory?>("null"));
  }
}
