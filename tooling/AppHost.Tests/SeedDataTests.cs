namespace AppHost.Tests;

using System.Text.Json;

using LocalDevelopment.Bootstrap;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the deterministic local development scenario.
/// </summary>
[TestClass]
public sealed class SeedDataTests
{
  private static readonly string ScenarioPath = Path.GetFullPath(
    Path.Combine(
      AppContext.BaseDirectory,
      "..",
      "..",
      "..",
      "..",
      "LocalDevelopment.Bootstrap",
      "SeedData",
      "scenario.v1.json"));

  /// <summary>
  /// Verifies the approved fixture gives Alice rich data, Bob a clean slate,
  /// and Charlie a light account.
  /// </summary>
  [TestMethod]
  public void LoadAndMaterialize_ApprovedScenario_HasExpectedPersonaCounts()
  {
    SeedScenarioManifest manifest = SeedData.LoadManifest(ScenarioPath);
    MaterializedSeedScenario scenario = SeedData.Materialize(
      manifest,
      new DateOnly(2026, 8, 21));

    Assert.AreEqual(
      8,
      scenario.Invoices.Count(invoice =>
        invoice.UserIdentifier == PersonaIds.Alice));
    Assert.AreEqual(
      0,
      scenario.Invoices.Count(invoice =>
        invoice.UserIdentifier == PersonaIds.Bob));
    Assert.AreEqual(
      3,
      scenario.Invoices.Count(invoice =>
        invoice.UserIdentifier == PersonaIds.Charlie));
    Assert.AreEqual(
      7,
      scenario.Invoices.Count(invoice =>
        invoice.UserIdentifier == PersonaIds.Alice
        && !invoice.IsSoftDeleted));
    Assert.AreEqual(
      0,
      scenario.Invoices.Count(invoice =>
        invoice.UserIdentifier == PersonaIds.Bob
        && !invoice.IsSoftDeleted));
    Assert.AreEqual(
      3,
      scenario.Invoices.Count(invoice =>
        invoice.UserIdentifier == PersonaIds.Charlie
        && !invoice.IsSoftDeleted));
    Assert.AreEqual(
      5,
      scenario.Merchants.Count(merchant =>
        merchant.CreatedBy == PersonaIds.Alice));
    Assert.AreEqual(
      2,
      scenario.Merchants.Count(merchant =>
        merchant.CreatedBy == PersonaIds.Charlie));
  }

  /// <summary>
  /// Verifies the same UTC anchor produces the same fixture-controlled values.
  /// </summary>
  [TestMethod]
  public void Materialize_SameAnchor_ProducesEquivalentBusinessProjection()
  {
    SeedScenarioManifest manifest = SeedData.LoadManifest(ScenarioPath);
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
    SeedScenarioManifest manifest = SeedData.LoadManifest(ScenarioPath);
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
    SeedScenarioManifest manifest = SeedData.LoadManifest(ScenarioPath);
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
    SeedScenarioManifest manifest = SeedData.LoadManifest(ScenarioPath);
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

  /// <summary>
  /// Verifies the clean-slate persona cannot accidentally gain owned records.
  /// </summary>
  [TestMethod]
  public void Validate_BobOwnsInvoice_ThrowsInvalidDataException()
  {
    SeedScenarioManifest manifest = SeedData.LoadManifest(ScenarioPath);
    SeedInvoiceDefinition bobInvoice = manifest.Invoices[0] with
    {
      OwnerKey = "bob",
    };

    Assert.ThrowsExactly<InvalidDataException>(
      () => SeedManifestValidator.Validate(manifest with
      {
        Invoices = [bobInvoice, .. manifest.Invoices.Skip(1)],
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
        invoice.IsImportant,
        invoice.IsSoftDeleted,
        invoice.AdditionalMetadata,
      }),
      Blobs = scenario.Blobs,
    });
}
