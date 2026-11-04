namespace LocalDevelopment.Bootstrap.Tests.Scenarios.Invoices;

using System.Text.Json.Nodes;
using global::LocalDevelopment.Bootstrap.Scenarios.Invoices;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Rejects corrupt seed records without relying on count changes to expose them.</summary>
[TestClass]
public sealed class SeedManifestValidatorTests
{
  private static SeedScenarioManifest Load() =>
    SeedData.LoadScenario(Path.Combine(AppContext.BaseDirectory, "SeedData"));

  /// <summary>Existing merchants are not interchangeable between owners, even at identical counts.</summary>
  [TestMethod]
  public void Validate_SameCountCrossOwnerMerchantSwap_Throws()
  {
    SeedScenarioManifest manifest = Load();
    SeedInvoiceDefinition alice = manifest.Invoices.First(invoice => invoice.OwnerKey == "alice");
    SeedInvoiceDefinition bob = manifest.Invoices.First(invoice => invoice.OwnerKey == "bob");
    SeedScenarioManifest invalid = manifest with
    {
      Invoices = manifest.Invoices.Select(invoice => invoice.Key == alice.Key
        ? invoice with { MerchantKey = bob.MerchantKey }
        : invoice.Key == bob.Key ? invoice with { MerchantKey = alice.MerchantKey } : invoice).ToArray(),
    };

    AssertInvalid(invalid, "owner");
  }

  /// <summary>Quantities cannot hide fractional cents behind rounded header values.</summary>
  [TestMethod]
  public void Validate_FractionalCentLine_Throws()
  {
    SeedScenarioManifest manifest = Load();
    SeedInvoiceDefinition invoice = manifest.Invoices[0];
    AssertInvalid(Replace(manifest, invoice with
    {
      Products = [invoice.Products[0] with { Quantity = 0.5m, Price = 1.01m }, .. invoice.Products.Skip(1)],
    }), "fractional");
  }

  /// <summary>A one-cent discrepancy is a real incomplete-basket or tax error.</summary>
  [TestMethod]
  [DataRow(false)]
  [DataRow(true)]
  public void Validate_HeaderTotalOrTaxMismatch_Throws(bool tax)
  {
    SeedScenarioManifest manifest = Load();
    SeedInvoiceDefinition invoice = manifest.Invoices[0];
    AssertInvalid(Replace(manifest, tax
      ? invoice with { TaxAmount = invoice.TaxAmount + 0.01m }
      : invoice with { TotalAmount = invoice.TotalAmount + 0.01m }), "financial");
  }

  /// <summary>Basket limits and aggregate line targets are independent of invoice counts.</summary>
  [TestMethod]
  [DataRow(false)]
  [DataRow(true)]
  public void Validate_ProfileBasketOrLineTargetMismatch_Throws(bool aggregate)
  {
    SeedScenarioManifest manifest = Load();
    SeedInvoiceDefinition invoice = manifest.Invoices.First(candidate =>
      candidate.OwnerKey == "dmitryi" && candidate.Recipe is null && candidate.Products.Count > 2);
    if (!aggregate)
    {
      invoice = manifest.Invoices.First(candidate => candidate.OwnerKey == "dmitryi" && candidate.Products.Count == 100);
      AssertInvalid(Replace(manifest, invoice with
      {
        Products = [.. invoice.Products, invoice.Products[0] with { ProductCode = "ADDITIONAL-SKU" }],
      }), "product count");
      return;
    }

    SeedInvoiceDefinition changed = invoice with { Products = invoice.Products.Skip(1).ToArray() };
    changed = changed with
    {
      TotalAmount = changed.Products.Sum(product => product.Quantity * product.Price),
      TaxAmount = SeedFinancials.CreateTaxDetails(changed.Products).Sum(detail => detail.Amount),
    };
    AssertInvalid(Replace(manifest, changed), "dmitryi");
  }

  /// <summary>Unused declared regions do not satisfy geographic coverage.</summary>
  [TestMethod]
  public void Validate_DeclaredGeographyNotUsed_Throws()
  {
    SeedScenarioManifest manifest = Load();
    AssertInvalid(manifest with
    {
      Merchants = manifest.Merchants.Select(merchant => merchant.OwnerKey == "charlie"
        ? merchant with { Region = "Bucuresti-Ilfov" } : merchant).ToArray(),
    }, "geograph");
  }

  /// <summary>Dates and currency must agree with the owner's history and merchant.</summary>
  [TestMethod]
  [DataRow(false)]
  [DataRow(true)]
  public void Validate_AgeOrCurrencyMismatch_Throws(bool currency)
  {
    SeedScenarioManifest manifest = Load();
    SeedInvoiceDefinition invoice = manifest.Invoices.First(candidate => candidate.OwnerKey == "bob");
    AssertInvalid(Replace(manifest, currency
      ? invoice with { CurrencyCode = "EUR" }
      : invoice with { DaysAgo = 31 }), currency ? "currency" : "history");
  }

  /// <summary>Enrichment declarations cannot contradict their product evidence.</summary>
  [TestMethod]
  [DataRow(false)]
  [DataRow(true)]
  public void Validate_DetectedAllergenWithoutCodesOrMissingRecipeProduct_Throws(bool recipe)
  {
    SeedScenarioManifest manifest = Load();
    SeedInvoiceDefinition invoice = manifest.Invoices.First(candidate => candidate.Recipe is not null);
    if (recipe)
    {
      SeedRecipeDefinition definition = invoice.Recipe ?? throw new InvalidDataException();
      AssertInvalid(Replace(manifest, invoice with
      {
        Recipe = definition with
        {
          PurchasedIngredients = [definition.PurchasedIngredients[0] with { ProductCode = "MISSING" }],
        },
      }), "recipe");
      return;
    }

    AssertInvalid(Replace(manifest, invoice with
    {
      Products = [invoice.Products[0] with { AllergenState = "detected", AllergenCodes = [] }, .. invoice.Products.Skip(1)],
    }), "allergen");
  }

  /// <summary>Repeated purchases belong on other receipts, not duplicated SKU rows.</summary>
  [TestMethod]
  public void Validate_DuplicateSkuWithinReceipt_Throws()
  {
    SeedScenarioManifest manifest = Load();
    SeedInvoiceDefinition invoice = manifest.Invoices[0];
    AssertInvalid(Replace(manifest, invoice with
    {
      Products = [invoice.Products[0], invoice.Products[1] with { ProductCode = invoice.Products[0].ProductCode }, .. invoice.Products.Skip(2)],
    }), "SKU");
  }

  /// <summary>Invalid rates are rejected before gross-tax extraction can divide or miscalculate.</summary>
  [TestMethod]
  [DataRow(-1)]
  [DataRow(101)]
  public void Validate_InvalidRate_Throws(int rate)
  {
    SeedScenarioManifest manifest = Load();
    SeedInvoiceDefinition invoice = manifest.Invoices[0];
    AssertInvalid(Replace(manifest, invoice with
    {
      Products = [invoice.Products[0] with { TaxRate = rate }, .. invoice.Products.Skip(1)],
    }), "rate");
  }

  /// <summary>Null entries in nested arrays are malformed records, not unhandled application failures.</summary>
  [TestMethod]
  [DataRow("sharing")]
  [DataRow("purchased")]
  [DataRow("pantry")]
  public void LoadScenario_NullNestedRecord_ThrowsInvalidDataException(string target)
  {
    using var files = new SeedScenarioDirectory();
    files.Mutate("alice", part =>
    {
      JsonObject invoice = SeedScenarioDirectory.FirstInvoice(part);
      if (target == "sharing")
      {
        (invoice["sharedWith"]?.AsArray() ?? throw new InvalidDataException()).Add((JsonNode?)null);
      }
      else
      {
        JsonObject recipe = invoice["recipe"]?.AsObject() ?? throw new InvalidDataException();
        JsonArray ingredients = recipe[target == "purchased" ? "purchasedIngredients" : "pantryIngredients"]?.AsArray()
          ?? throw new InvalidDataException();
        ingredients[0] = null;
      }
    });

    Assert.ThrowsExactly<InvalidDataException>(() => SeedData.LoadScenario(files.Path));
  }

  private static SeedScenarioManifest Replace(SeedScenarioManifest manifest, SeedInvoiceDefinition changed) =>
    manifest with { Invoices = manifest.Invoices.Select(invoice => invoice.Key == changed.Key ? changed : invoice).ToArray() };

  private static void AssertInvalid(SeedScenarioManifest manifest, string context)
  {
    InvalidDataException failure = Assert.ThrowsExactly<InvalidDataException>(() => SeedManifestValidator.Validate(manifest));
    StringAssert.Contains(failure.Message, context);
  }
}
