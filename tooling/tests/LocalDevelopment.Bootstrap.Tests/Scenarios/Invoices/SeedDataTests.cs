namespace LocalDevelopment.Bootstrap.Tests.Scenarios.Invoices;

using System.Text.Json;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using global::LocalDevelopment.Bootstrap.Scenarios.Invoices;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the deterministic local development scenario.
/// </summary>
[TestClass]
public sealed class SeedDataTests
{
  private static readonly string ScenarioPath =
    Path.Combine(AppContext.BaseDirectory, "SeedData");

  /// <summary>
  /// Verifies the referenced bootstrap project supplies the runtime fixture.
  /// </summary>
  [TestMethod]
  public void LoadManifest_CopiedFixture_ExistsAndLoads()
  {
    foreach (string owner in new[] { "alice", "bob", "charlie", "dmitryi" })
    {
      Assert.IsTrue(File.Exists(Path.Combine(ScenarioPath, $"{owner}.json")));
    }

    SeedScenarioManifest manifest = SeedData.LoadScenario(ScenarioPath);
    Assert.HasCount(4, manifest.Personas);
  }

  /// <summary>
  /// Verifies the complete scenario supplies the approved active ownership profiles.
  /// </summary>
  [TestMethod]
  public void LoadAndMaterialize_ApprovedScenario_HasExpectedPersonaCounts()
  {
    SeedScenarioManifest manifest = SeedData.LoadScenario(ScenarioPath);
    MaterializedSeedScenario scenario = SeedData.Materialize(
      manifest,
      new DateOnly(2026, 8, 21));

    foreach (var (owner, active, merchants) in new[]
    {
      (PersonaIds.Alice, 300, 100),
      (PersonaIds.Bob, 5, 4),
      (PersonaIds.Charlie, 20, 7),
      (Guid.Parse("32a2818b-7844-59cf-a7c0-48d061cc86ae"), 1000, 250),
    })
    {
      Assert.AreEqual(active, scenario.Invoices.Count(invoice =>
        invoice.UserIdentifier == owner && !invoice.IsSoftDeleted));
      Assert.AreEqual(merchants, scenario.Merchants.Count(merchant => merchant.CreatedBy == owner));
    }

    Assert.HasCount(1326, scenario.Invoices);
    Assert.HasCount(361, scenario.Merchants);
    Assert.AreEqual(18000, scenario.Invoices.Where(invoice =>
      invoice.UserIdentifier == PersonaIds.Dmitryi && !invoice.IsSoftDeleted).Sum(invoice => invoice.Items.Count));
  }

  /// <summary>Verifies every receipt contains its complete paid basket and reconciled taxes.</summary>
  [TestMethod]
  public void Materialize_CompleteBaskets_ReconcilesTotalsTaxesAndPayments()
  {
    MaterializedSeedScenario scenario = SeedData.Materialize(
      SeedData.LoadScenario(ScenarioPath), new DateOnly(2026, 11, 4));

    foreach (var invoice in scenario.Invoices)
    {
      Assert.AreEqual(invoice.PaymentInformation.TotalCostAmount,
        invoice.Items.Sum(product => product.Quantity * product.Price), invoice.Name);
      Assert.AreEqual(invoice.PaymentInformation.TotalCostAmount,
        invoice.Payments.Sum(payment => payment.Amount), invoice.Name);
      Assert.AreEqual(invoice.PaymentInformation.TotalCostAmount,
        invoice.PaymentInformation.SubtotalAmount + invoice.PaymentInformation.TotalTaxAmount, invoice.Name);
      Assert.AreEqual(invoice.PaymentInformation.TotalTaxAmount,
        invoice.TaxDetails.Sum(tax => tax.Amount), invoice.Name);
      Assert.AreEqual(invoice.PaymentInformation.SubtotalAmount,
        invoice.TaxDetails.Sum(tax => tax.NetAmount), invoice.Name);
    }
  }

  /// <summary>Verifies travel and checkout times survive domain mapping.</summary>
  [TestMethod]
  public void Materialize_DiverseHistory_PreservesCountriesAndTransactionTimes()
  {
    MaterializedSeedScenario scenario = SeedData.Materialize(
      SeedData.LoadScenario(ScenarioPath), new DateOnly(2026, 11, 4));

    CollectionAssert.AreEquivalent(new[] { "RO", "FR", "DE", "IT", "ES" },
      scenario.Invoices.Select(invoice => invoice.CountryRegion).Distinct().ToArray());
    Assert.IsTrue(scenario.Invoices.Any(invoice =>
      invoice.PaymentInformation.TransactionDate.TimeOfDay != TimeSpan.Zero));
    Assert.IsTrue(scenario.Invoices.Any(invoice => invoice.TaxDetails.Count > 1));
  }

  /// <summary>Verifies classifications retain navigable canonical ancestor groups.</summary>
  [TestMethod]
  public void Materialize_ClassifiedProducts_PreserveCanonicalAncestors()
  {
    MaterializedSeedScenario scenario = SeedData.Materialize(
      SeedData.LoadScenario(ScenarioPath), new DateOnly(2026, 11, 4));

    Assert.IsTrue(scenario.Invoices.SelectMany(invoice => invoice.Items)
      .Any(product => product.Classification?.Hierarchy.Count > 1));
    Assert.IsTrue(scenario.Merchants.All(merchant =>
      merchant.Classification is { Hierarchy.Count: > 1 }));
  }

  /// <summary>Verifies explicit recipes can describe a complete multi-ingredient purchase.</summary>
  [TestMethod]
  public void Materialize_FoodRecipes_IncludeMultiplePurchasedIngredients()
  {
    MaterializedSeedScenario scenario = SeedData.Materialize(
      SeedData.LoadScenario(ScenarioPath), new DateOnly(2026, 11, 4));

    Assert.IsTrue(scenario.Invoices.SelectMany(invoice => invoice.PossibleRecipes)
      .Any(recipe => recipe.PurchasedIngredients.Count >= 2));
  }

  /// <summary>Classifications preserve the actual publisher labels and navigable hierarchy.</summary>
  [TestMethod]
  public void Materialize_Classifications_UseCanonicalHierarchy()
  {
    MaterializedSeedScenario scenario = SeedData.Materialize(SeedData.LoadScenario(ScenarioPath), new DateOnly(2026, 11, 4));
    StandardClassification[] classifications = scenario.Merchants.Select(merchant => merchant.Classification)
      .Concat(scenario.Invoices.Select(invoice => invoice.Classification))
      .Concat(scenario.Invoices.SelectMany(invoice => invoice.Items).Select(product => product.Classification))
      .OfType<StandardClassification>().ToArray();
    foreach (var (system, file) in new[]
    {
      (ClassificationSystem.Gs1Gpc, "gpc-2026-05.min.json"),
      (ClassificationSystem.EcoicopV2, "ecoicop-v2.min.json"),
      (ClassificationSystem.Nace21, "nace-2.1.min.json"),
    })
    {
      using JsonDocument catalog = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Taxonomies", file)));
      Dictionary<string, JsonElement> nodes = catalog.RootElement.GetProperty("nodes").EnumerateArray()
        .ToDictionary(node => node.GetProperty("code").GetString() ?? throw new InvalidDataException(), StringComparer.Ordinal);
      foreach (StandardClassification actual in classifications.Where(value => value.System == system))
      {
        JsonElement node = nodes[actual.Code];
        Assert.AreEqual(catalog.RootElement.GetProperty("version").GetString(), actual.Version);
        Assert.AreEqual(node.GetProperty("officialLabel").GetString(), actual.OfficialLabel);
        CollectionAssert.AreEqual(node.GetProperty("hierarchyCodes").EnumerateArray().Select(code => code.GetString()).ToArray(),
          actual.Hierarchy.Select(ancestor => ancestor.Code).ToArray());
        foreach (ClassificationNode ancestor in actual.Hierarchy)
        {
          Assert.AreEqual(nodes[ancestor.Code].GetProperty("officialLabel").GetString(), ancestor.OfficialLabel);
          Assert.AreEqual(nodes[ancestor.Code].GetProperty("level").GetString(), ancestor.Level);
        }
      }
    }
  }

  /// <summary>Tax extraction uses one cent-exact rule, including the half-cent boundary.</summary>
  [TestMethod]
  public void Materialize_MixedAndZeroRateGroups_UsesGrossTaxAwayFromZeroRounding()
  {
    SeedProductDefinition template = SeedData.LoadScenario(ScenarioPath).Invoices[0].Products[0];
    var details = SeedFinancials.CreateTaxDetails(
    [
      template with { Quantity = 1, Price = 12.50m, TaxRate = 0 },
      template with { Quantity = 1, Price = 0.03m, TaxRate = 20 },
    ]);

    Assert.HasCount(2, details);
    Assert.AreEqual(12.50m, details[0].NetAmount);
    Assert.AreEqual(0m, details[0].Amount);
    Assert.AreEqual(0.02m, details[1].NetAmount);
    Assert.AreEqual(0.01m, details[1].Amount);
    Assert.AreEqual(12.53m, details.Sum(detail => detail.NetAmount + detail.Amount));
  }

  /// <summary>Every physical invoice has exactly one owner-local reciprocal merchant link.</summary>
  [TestMethod]
  public void Materialize_ApprovedScenario_HasExactReciprocalReferences()
  {
    MaterializedSeedScenario scenario = SeedData.Materialize(SeedData.LoadScenario(ScenarioPath), new DateOnly(2026, 11, 4));
    foreach (var merchant in scenario.Merchants)
    {
      var invoices = scenario.Invoices.Where(invoice => invoice.MerchantReference == merchant.id).ToArray();
      CollectionAssert.AreEquivalent(invoices.Select(invoice => invoice.id).ToArray(), merchant.ReferencedInvoices.ToArray());
      Assert.AreEqual(merchant.ReferencedInvoices.Count(), merchant.ReferencedInvoices.Distinct().Count());
      Assert.IsTrue(invoices.All(invoice => invoice.UserIdentifier == merchant.CreatedBy));
      Assert.IsTrue(invoices.Any(invoice => !invoice.IsSoftDeleted));
      Assert.IsTrue(invoices.All(invoice => merchant.CreatedAt < invoice.PaymentInformation.TransactionDate));
    }
  }

  /// <summary>Repeated SKUs never share mutable Product objects across receipts.</summary>
  [TestMethod]
  public void Materialize_RepeatedSku_DoesNotAliasProducts()
  {
    MaterializedSeedScenario scenario = SeedData.Materialize(SeedData.LoadScenario(ScenarioPath), new DateOnly(2026, 11, 4));
    var pair = scenario.Invoices.SelectMany(invoice => invoice.Items.Select(product => (invoice.id, Product: product)))
      .GroupBy(item => item.Product.ProductCode).First(group => group.Select(item => item.id).Distinct().Count() > 1)
      .GroupBy(item => item.id).Select(group => group.First().Product).Take(2).ToArray();
    string original = pair[1].Name;

    pair[0].Name = "Changed in only one receipt";

    Assert.AreEqual(original, pair[1].Name);
  }

  /// <summary>Materialized locations, history windows, and basket bounds retain the declared persona differences.</summary>
  [TestMethod]
  public void Materialize_ApprovedScenario_HasCoherentGeographyAndChronology()
  {
    DateOnly anchor = new(2026, 11, 4);
    MaterializedSeedScenario scenario = SeedData.Materialize(SeedData.LoadScenario(ScenarioPath), anchor);
    var merchants = scenario.Merchants.ToDictionary(merchant => merchant.id);
    foreach (var (owner, days, regions, countries, minimum, maximum) in new[]
    {
      (PersonaIds.Bob, 30, 1, 1, 1, 10),
      (PersonaIds.Charlie, 60, 2, 1, 1, 20),
      (PersonaIds.Alice, 365, 3, 2, 2, 50),
      (PersonaIds.Dmitryi, 1095, 6, 5, 1, 100),
    })
    {
      var invoices = scenario.Invoices.Where(invoice => invoice.UserIdentifier == owner && !invoice.IsSoftDeleted).ToArray();
      Assert.AreEqual(countries, invoices.Select(invoice => invoice.CountryRegion).Distinct().Count());
      Assert.AreEqual(regions, invoices.Select(invoice =>
        (invoice.CountryRegion, Region: invoice.AdditionalMetadata["seed.region"].ToString())).Distinct().Count());
      Assert.AreEqual(days, invoices.Max(invoice => anchor.DayNumber
        - DateOnly.FromDateTime(invoice.PaymentInformation.TransactionDate.UtcDateTime).DayNumber));
      foreach (var invoice in invoices)
      {
        int age = anchor.DayNumber - DateOnly.FromDateTime(invoice.PaymentInformation.TransactionDate.UtcDateTime).DayNumber;
        Assert.IsTrue(age >= 0 && age <= days);
        Assert.IsTrue(invoice.Items.Count >= minimum && invoice.Items.Count <= maximum);
        Assert.AreEqual(invoice.PaymentInformation.TransactionDate, invoice.CreatedAt);
        Assert.AreEqual(invoice.CountryRegion, merchants[invoice.MerchantReference].AdditionalMetadata["seed.country"]);
        Assert.AreEqual(invoice.AdditionalMetadata["seed.region"], merchants[invoice.MerchantReference].AdditionalMetadata["seed.region"]);
        Assert.AreEqual(invoice.CountryRegion == "RO" ? "RON" : "EUR", invoice.PaymentInformation.Currency.Code);
      }
    }
  }

  /// <summary>
  /// Verifies the same UTC anchor produces the same fixture-controlled values.
  /// </summary>
  [TestMethod]
  public void Materialize_SameAnchor_ProducesEquivalentBusinessProjection()
  {
    SeedScenarioManifest manifest = SeedData.LoadScenario(ScenarioPath);
    DateOnly anchor = new(2026, 8, 21);

    MaterializedSeedScenario first = SeedData.Materialize(manifest, anchor);
    MaterializedSeedScenario second = SeedData.Materialize(manifest, anchor);

    Assert.AreEqual(Project(first), Project(second));
  }

  /// <summary>
  /// Verifies merchant groups and shared invoice visibility are represented.
  /// </summary>
  [TestMethod]
  public void Materialize_ApprovedScenario_PreservesRelationships()
  {
    SeedScenarioManifest manifest = SeedData.LoadScenario(ScenarioPath);
    MaterializedSeedScenario scenario = SeedData.Materialize(
      manifest,
      new DateOnly(2026, 8, 21));

    Assert.IsTrue(
      scenario.Merchants
        .Where(merchant => merchant.CreatedBy == PersonaIds.Alice)
        .GroupBy(merchant => merchant.ParentCompanyId)
        .Count(group => group.Key != Guid.Empty && group.Count() >= 2) >= 2);
    Assert.IsTrue(
      scenario.Invoices.Any(invoice =>
        invoice.UserIdentifier == PersonaIds.Alice
        && invoice.SharedWith.Contains(PersonaIds.Charlie)));
    Assert.IsTrue(
      scenario.Invoices.All(invoice =>
        invoice.MerchantReference == Guid.Empty
        || scenario.Merchants.Any(merchant =>
          merchant.id == invoice.MerchantReference)));
  }

  /// <summary>
  /// Verifies an invoice cannot reference a merchant outside the manifest.
  /// </summary>
  [TestMethod]
  public void Validate_UnknownMerchantReference_ThrowsInvalidDataException()
  {
    SeedScenarioManifest manifest = SeedData.LoadScenario(ScenarioPath);
    SeedInvoiceDefinition invalidInvoice = manifest.Invoices[0] with
    {
      MerchantKey = "merchant/unknown",
    };

    Assert.ThrowsExactly<InvalidDataException>(
      () => SeedManifestValidator.Validate(manifest with
      {
        Invoices = [invalidInvoice, .. manifest.Invoices.Skip(1)],
      }));
  }

  /// <summary>
  /// Verifies an invoice cannot reference a blob outside the manifest.
  /// </summary>
  [TestMethod]
  public void Validate_UnknownBlobReference_ThrowsInvalidDataException()
  {
    SeedScenarioManifest manifest = SeedData.LoadScenario(ScenarioPath);
    SeedInvoiceDefinition invalidInvoice = manifest.Invoices[0] with
    {
      BlobKey = "blob/unknown",
    };

    Assert.ThrowsExactly<InvalidDataException>(
      () => SeedManifestValidator.Validate(manifest with
      {
        Invoices = [invalidInvoice, .. manifest.Invoices.Skip(1)],
      }));
  }

  private static string Project(MaterializedSeedScenario scenario) =>
    JsonSerializer.Serialize(new
    {
      Merchants = scenario.Merchants.Select(merchant => new
      {
        merchant.id,
        merchant.Name,
        merchant.Description,
        merchant.ParentCompanyId,
        merchant.CreatedBy,
        merchant.CreatedAt,
        merchant.Address,
        merchant.AdditionalMetadata,
        merchant.ReferencedInvoices,
      }),
      Invoices = scenario.Invoices.Select(invoice => new
      {
        invoice.id,
        invoice.UserIdentifier,
        invoice.Name,
        invoice.Description,
        invoice.CreatedAt,
        invoice.MerchantReference,
        invoice.SharedWith,
        invoice.Classification,
        invoice.Items,
        invoice.PossibleRecipes,
        invoice.PaymentInformation,
        invoice.Payments,
        invoice.TaxDetails,
        invoice.CountryRegion,
        invoice.IsImportant,
        invoice.IsSoftDeleted,
        invoice.AdditionalMetadata,
      }),
      Blobs = scenario.Blobs,
    });
}
