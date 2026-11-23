namespace LocalDevelopment.Data.Tests.Scenarios.Invoices;

using System.Text.Json.Nodes;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;
using global::LocalDevelopment.Data.Scenarios.Invoices;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies the numeric category contract for the seed input boundary.</summary>
[TestClass]
public sealed class SeedCategoryTests
{
  /// <summary>The coordinated fixture bundle has no dependency on withdrawn catalog entries.</summary>
  [TestMethod]
  public void LoadScenario_FlatFixtures_PreservesDefinedCategories()
  {
    using var files = new SeedScenarioDirectory();
    SeedScenarioManifest manifest = SeedData.LoadScenario(files.Path);
    Assert.AreEqual("v4", manifest.Version);
    SeedInvoiceDefinition receipt = manifest.Invoices.Single(invoice => invoice.Key == "invoice/alice-riverside-topup");
    Assert.AreEqual(InvoiceCategory.Groceries, receipt.Category);
    Assert.AreEqual(ProductCategory.Milk, receipt.Products.Single(product => product.ProductCode == "PANTRY-MILK-17-2").Category);
    Assert.AreEqual(MerchantCategory.GroceryStore, manifest.Merchants.Single(merchant => merchant.Key == receipt.MerchantKey).Category);
    Assert.IsNull(manifest.Invoices.Single(invoice => invoice.Key == "invoice/alice-weekly-groceries").Category);
  }

  /// <summary>Quoted IDs and an ID from another domain are not valid receipt categories.</summary>
  [TestMethod]
  public void LoadScenario_NonNumericOrForeignCategory_RejectsFixture()
  {
    using var files = new SeedScenarioDirectory();
    files.Mutate("bob", part => SeedScenarioDirectory.FirstInvoice(part)["category"] = JsonValue.Create("3001"));
    Assert.ThrowsExactly<InvalidDataException>(() => SeedData.LoadScenario(files.Path));
    files.Mutate("bob", part => SeedScenarioDirectory.FirstInvoice(part)["category"] = JsonValue.Create(2001));
    Assert.ThrowsExactly<InvalidDataException>(() => SeedData.LoadScenario(files.Path));
  }
}
