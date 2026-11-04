namespace LocalDevelopment.Data.Tests.Scenarios.Invoices;

using System.Text.Json.Nodes;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using global::LocalDevelopment.Data.Scenarios.Invoices;
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

  /// <summary>Fuel-style precision is valid when the purchased quantity produces exact cents.</summary>
  [TestMethod]
  public void Validate_HigherPrecisionUnitPriceWithCentExactTotal_PreservesValue()
  {
    SeedScenarioManifest manifest = Load();
    SeedInvoiceDefinition invoice = manifest.Invoices.First(candidate =>
      candidate.CurrencyCode == "EUR" && candidate.Products.Any(product => product.ProductCode == "FUEL-000"));
    SeedProductDefinition[] products = invoice.Products.Select(product => product.ProductCode == "FUEL-000"
      ? product with { Quantity = 10m, Price = 1.959m } : product).ToArray();
    SeedScenarioManifest changed = Replace(manifest, invoice with
    {
      Products = products,
      TotalAmount = products.Sum(product => product.Quantity * product.Price),
      TaxAmount = SeedFinancials.CreateTaxDetails(products).Sum(detail => detail.Amount),
    });

    SeedManifestValidator.Validate(changed);
    var actual = SeedData.Materialize(changed, new DateOnly(2026, 11, 4))
      .Invoices.Single(candidate => candidate.id == invoice.Id).Items.Single(product => product.ProductCode == "FUEL-000");

    Assert.AreEqual(1.959m, actual.Price);
    Assert.AreEqual(19.59m, actual.TotalPrice);
  }

  /// <summary>Validation accepts the same recognized spelling variants as domain materialization.</summary>
  [TestMethod]
  [DataRow("split", "detected", "Detected")]
  [DataRow("Split", "detected", "Detected")]
  [DataRow("SPLIT", "DETECTED", "Detected")]
  [DataRow("SPLIT", "NONE", "NoSignals")]
  [DataRow("SPLIT", "INSUFFICIENT", "InsufficientData")]
  [DataRow("SPLIT", "UNASSESSED", "Unassessed")]
  public void Validate_RecognizedPaymentAndAllergenCasing_RemainsCompatible(string payment, string state, string expectedStatus)
  {
    SeedScenarioManifest manifest = Load();
    SeedInvoiceDefinition invoice = manifest.Invoices[0];
    SeedProductDefinition product = invoice.Products[0] with
    {
      AllergenState = state,
      AllergenCodes = string.Equals(state, "detected", StringComparison.OrdinalIgnoreCase)
        ? [AllergenCode.CerealsContainingGluten] : [],
    };
    SeedScenarioManifest changed = Replace(manifest, invoice with
    {
      PaymentType = payment,
      Products = [product, .. invoice.Products.Skip(1)],
    });

    SeedManifestValidator.Validate(changed);
    var actual = SeedData.Materialize(changed, new DateOnly(2026, 11, 4)).Invoices.Single(candidate => candidate.id == invoice.Id);

    Assert.AreEqual(2, actual.Payments.Count);
    Assert.AreEqual(actual.PaymentInformation.TotalCostAmount, actual.Payments.Sum(detail => detail.Amount));
    Assert.AreEqual(expectedStatus, actual.Items.First().AllergenAssessment?.Status.ToString() ?? "Unassessed");
  }

  /// <summary>Accepting recognized casing variants does not permit unknown payment or allergen values.</summary>
  [TestMethod]
  [DataRow(false)]
  [DataRow(true)]
  public void Validate_UnknownPaymentOrAllergenState_StillThrows(bool allergen)
  {
    SeedScenarioManifest manifest = Load();
    SeedInvoiceDefinition invoice = manifest.Invoices[0];
    Assert.ThrowsExactly<InvalidDataException>(() => SeedManifestValidator.Validate(Replace(manifest, allergen
      ? invoice with { Products = [invoice.Products[0] with { AllergenState = "invented" }, .. invoice.Products.Skip(1)] }
      : invoice with { PaymentType = "invented" })));
  }

  /// <summary>A selected leaf alone is not the complete canonical classification path.</summary>
  [TestMethod]
  [DataRow("merchant")]
  [DataRow("invoice")]
  [DataRow("product")]
  public void Validate_TruncatedCanonicalHierarchy_Throws(string target)
  {
    SeedScenarioManifest manifest = Load();
    if (target == "merchant")
    {
      SeedMerchantDefinition merchant = manifest.Merchants[0];
      AssertInvalid(manifest with
      {
        Merchants = [merchant with { ClassificationPath = [merchant.ClassificationPath[^1]] }, .. manifest.Merchants.Skip(1)],
      }, "canonical");
      return;
    }

    SeedInvoiceDefinition invoice = manifest.Invoices.First(candidate => target == "invoice"
      ? candidate.ClassificationPath?.Count > 1
      : candidate.Products.Any(product => product.ClassificationPath?.Count > 1));
    if (target == "invoice")
    {
      var path = invoice.ClassificationPath ?? throw new InvalidDataException();
      AssertInvalid(Replace(manifest, invoice with { ClassificationPath = [path[^1]] }), "canonical");
    }
    else
    {
      SeedProductDefinition product = invoice.Products.First(candidate => candidate.ClassificationPath?.Count > 1);
      var path = product.ClassificationPath ?? throw new InvalidDataException();
      AssertInvalid(Replace(manifest, invoice with
      {
        Products = invoice.Products.Select(candidate => candidate.ProductCode == product.ProductCode
          ? candidate with { ClassificationPath = [path[^1]] } : candidate).ToArray(),
      }), "canonical");
    }
  }

  /// <summary>The selected code cannot validate fabricated ancestor labels.</summary>
  [TestMethod]
  public void Validate_NoncanonicalAncestorLabel_Throws()
  {
    SeedScenarioManifest manifest = Load();
    SeedMerchantDefinition merchant = manifest.Merchants[0];
    var ancestor = merchant.ClassificationPath[0];
    AssertInvalid(manifest with
    {
      Merchants = [merchant with
      {
        ClassificationPath = [new(ancestor.Level, ancestor.Code, "Fabricated ancestor label"), .. merchant.ClassificationPath.Skip(1)],
      }, .. manifest.Merchants.Skip(1)],
    }, "canonical");
  }

  /// <summary>Day-zero checkout times cannot become future transactions on an early startup.</summary>
  [TestMethod]
  public void Validate_DayZeroWithNonmidnightTime_Throws()
  {
    SeedScenarioManifest manifest = Load();
    SeedInvoiceDefinition invoice = manifest.Invoices[0];
    AssertInvalid(Replace(manifest, invoice with { DaysAgo = 0, TransactionTimeUtc = new TimeOnly(12, 0) }), "day-zero");
  }

  private static SeedScenarioManifest Replace(SeedScenarioManifest manifest, SeedInvoiceDefinition changed) =>
    manifest with { Invoices = manifest.Invoices.Select(invoice => invoice.Key == changed.Key ? changed : invoice).ToArray() };

  private static void AssertInvalid(SeedScenarioManifest manifest, string context)
  {
    InvalidDataException failure = Assert.ThrowsExactly<InvalidDataException>(() => SeedManifestValidator.Validate(manifest));
    StringAssert.Contains(failure.Message, context);
  }
}
