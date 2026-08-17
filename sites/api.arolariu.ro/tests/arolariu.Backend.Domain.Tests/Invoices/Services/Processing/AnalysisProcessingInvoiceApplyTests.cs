namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies invoice patch semantics through the public processing worker and real analysis layers.
/// </summary>
[TestClass]
[DoNotParallelize]
public sealed class AnalysisProcessingInvoiceApplyTests
{
  /// <summary>
  /// Verifies failed external extraction leaves invoice state untouched rather than clearing fields.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_NoCapabilitySections_LeavesInvoiceUnchanged()
  {
    var scenario = new AnalysisProcessingScenario();
    string originalName = scenario.Invoice.Name;
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateInvoiceRun(scenario.Invoice);
    scenario.InvoiceResult = AnalysisProcessingTestData.InvoiceResultWithCompletedCapabilities([]);

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual(originalName, scenario.Aggregates.UpdatedInvoices.Single().Name);
    Assert.AreEqual(2, scenario.Aggregates.UpdatedInvoices.Single().Items.Count);
  }

  /// <summary>
  /// Verifies successful capability results persist summary, merchant linkage, classifications, allergens, and extraction.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_AllSectionsPresent_AppliesEveryObservableSection()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisRun.CreateInvoice(
      scenario.Invoice.id,
      scenario.Invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Comprehensive(),
      traceParent: null);
    scenario.InvoiceResult = FullResult(ProductAllergenAssessment.SignalsFound(
    [
      new ProductAllergenSignal(
        AllergenCode.Milk,
        ProductAllergenEvidenceTier.Likely,
        0.95,
        [new AllergenEvidence("productName", "Milk")]),
    ]));

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    var persisted = scenario.Aggregates.UpdatedInvoices.Single();
    Assert.AreEqual("New invoice", persisted.Name);
    Assert.AreEqual("New description", persisted.Description);
    Assert.AreNotEqual(Guid.Empty, persisted.MerchantReference);
    Assert.IsNotNull(persisted.Classification);
    Assert.AreEqual("MILK-1", persisted.Items.Single().ProductCode);
    Assert.IsNotNull(persisted.Items.Single().Classification);
    Assert.AreEqual(AllergenAssessmentStatus.Detected, persisted.Items.Single().AllergenAssessment!.Status);
    Assert.AreEqual("invoice", persisted.ReceiptType);
    Assert.AreEqual("RO", persisted.CountryRegion);
  }

  /// <summary>
  /// Verifies a successful empty extraction authoritatively replaces existing line items.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_EmptyExtraction_ReplacesItemsWithEmptyCollection()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateInvoiceRun(scenario.Invoice);
    scenario.InvoiceResult = new InvoiceAnalysisResult(
      AnalysisProcessingTestData.CreateExtraction(),
      MerchantCandidateResult: null,
      SummaryResult: null,
      ProductClassificationResult: null,
      AllergenAssessmentResult: null,
      InvoiceClassificationResult: null,
      RecipeGenerationResult: null,
      new ReadOnlyCollection<AnalysisCapability>([AnalysisCapability.DocumentExtraction]));

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual(0, scenario.Aggregates.UpdatedInvoices.Single().Items.Count);
  }

  /// <summary>
  /// Verifies classifications emitted by the provider are applied to the corresponding extracted products.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_ProductClassificationResult_UpdatesExtractedProducts()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateInvoiceRun(scenario.Invoice);
    scenario.InvoiceResult = ProductAnalysisResult(
      new ProductClassificationResult(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
      {
        ["product-0000"] = AnalysisProcessingTestData.Classification(ClassificationSystem.Gs1Gpc, "10000025"),
      }),
      allergenResult: null);

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual("10000025", scenario.Aggregates.UpdatedInvoices.Single().Items.Single().Classification!.Code);
  }

  /// <summary>
  /// Verifies reconciliation accepts a non-list previous item collection before public worker persistence.
  /// </summary>
  [TestMethod]
  public void Reconcile_NonListProductCollection_PreservesCompatiblePriorItemState()
  {
    var prior = new Product
    {
      Name = "Milk",
      Quantity = 1m,
      QuantityUnit = "pcs",
      ProductCode = "MILK-1",
      Price = 4.5m,
      Metadata = new ProductMetadata { IsComplete = true },
    };

    List<Product> reconciled = ExtractedProductReconciler.Reconcile(
      new HashSet<Product> { prior },
      [AnalysisProcessingTestData.ExtractedProduct("Milk", "MILK-1")]);

    Assert.IsTrue(reconciled.Single().Metadata.IsComplete);
  }

  /// <summary>
  /// Verifies a no-signals provider assessment persists its durable no-signals state and provenance.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_NoSignalsAllergenAssessment_PersistsNoSignalsStatus()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisRun.CreateInvoice(
      scenario.Invoice.id,
      scenario.Invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Balanced(),
      traceParent: null);
    scenario.InvoiceResult = ProductAnalysisResult(
      ProductClassification(),
      new ProductAllergenAssessmentResult(new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal)
      {
        ["product-0000"] = ProductAllergenAssessment.NoSignalsInAvailableEvidence(),
      }));

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    AllergenAssessment assessment = scenario.Aggregates.UpdatedInvoices.Single().Items.Single().AllergenAssessment!;
    Assert.AreEqual(AllergenAssessmentStatus.NoSignals, assessment.Status);
    Assert.AreNotEqual(Guid.Empty, assessment.SourceRunId);
  }

  /// <summary>
  /// Verifies insufficient provider evidence persists the durable insufficient-data state.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_InsufficientAllergenAssessment_PersistsInsufficientStatus()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisRun.CreateInvoice(
      scenario.Invoice.id,
      scenario.Invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Balanced(),
      traceParent: null);
    scenario.InvoiceResult = ProductAnalysisResult(
      ProductClassification(),
      new ProductAllergenAssessmentResult(new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal)
      {
        ["product-0000"] = ProductAllergenAssessment.InsufficientData(),
      }));

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual(
      AllergenAssessmentStatus.InsufficientData,
      scenario.Aggregates.UpdatedInvoices.Single().Items.Single().AllergenAssessment!.Status);
  }

  /// <summary>
  /// Verifies a likely transient evidence tier is persisted as inferred evidence.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_LikelyAllergenEvidence_PersistsInferredEvidence()
  {
    AllergenAssessment assessment = await ExecuteSignalAssessmentAsync(ProductAllergenEvidenceTier.Likely)
      .ConfigureAwait(false);

    Assert.AreEqual(AllergenEvidenceLevel.Inferred, assessment.Signals.Single().EvidenceLevel);
  }

  /// <summary>
  /// Verifies a possible transient evidence tier is persisted as precautionary evidence.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_PossibleAllergenEvidence_PersistsPrecautionaryEvidence()
  {
    AllergenAssessment assessment = await ExecuteSignalAssessmentAsync(ProductAllergenEvidenceTier.Possible)
      .ConfigureAwait(false);

    Assert.AreEqual(AllergenEvidenceLevel.Precautionary, assessment.Signals.Single().EvidenceLevel);
  }

  /// <summary>
  /// Verifies an unavailable allergen provider leaves a reconciled prior assessment untouched.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_UnavailableAllergenProvider_LeavesExistingAssessmentUnchanged()
  {
    var scenario = new AnalysisProcessingScenario();
    AllergenAssessment existing = AllergenAssessment.NoSignals(Guid.CreateVersion7());
    scenario.Invoice.Items.First().AllergenAssessment = existing;
    scenario.Invoice.Items.First().Name = "Milk";
    scenario.Invoice.Items.First().ProductCode = "MILK-1";
    scenario.Invoice.Items.First().Price = 4.5m;
    scenario.ClaimableRun = AnalysisRun.CreateInvoice(
      scenario.Invoice.id,
      scenario.Invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Balanced(),
      traceParent: null);
    scenario.InvoiceResult = ProductAnalysisResult(ProductClassification(), allergenResult: null);

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual(existing, scenario.Aggregates.UpdatedInvoices.Single().Items.Single().AllergenAssessment);
  }

  /// <summary>
  /// Verifies a successful recipe capability with no eligible food classifications clears existing recipes.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_SuccessfulEmptyRecipes_ReplacesExistingRecipes()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.Invoice.PossibleRecipes = [AnalysisProcessingTestData.Recipe("Old recipe")];
    scenario.ClaimableRun = AnalysisRun.CreateInvoice(
      scenario.Invoice.id,
      scenario.Invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Comprehensive(),
      traceParent: null);
    scenario.InvoiceResult = FullResult(ProductAllergenAssessment.NoSignalsInAvailableEvidence()) with
    {
      RecipeGenerationResult = new RecipeGenerationResult([]),
    };

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual(0, scenario.Aggregates.UpdatedInvoices.Single().PossibleRecipes.Count);
  }

  private static async Task<AllergenAssessment> ExecuteSignalAssessmentAsync(ProductAllergenEvidenceTier tier)
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisRun.CreateInvoice(
      scenario.Invoice.id,
      scenario.Invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Balanced(),
      traceParent: null);
    scenario.InvoiceResult = ProductAnalysisResult(
      ProductClassification(),
      new ProductAllergenAssessmentResult(new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal)
      {
        ["product-0000"] = ProductAllergenAssessment.SignalsFound(
        [
          new ProductAllergenSignal(
            AllergenCode.Milk,
            tier,
            0.9,
            [new AllergenEvidence("productName", "Milk")]),
        ]),
      }));

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    return scenario.Aggregates.UpdatedInvoices.Single().Items.Single().AllergenAssessment!;
  }

  private static ProductClassificationResult ProductClassification() =>
    new(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
    {
      ["product-0000"] = AnalysisProcessingTestData.Classification(ClassificationSystem.Gs1Gpc, "10000025"),
    });

  private static InvoiceAnalysisResult ProductAnalysisResult(
    ProductClassificationResult classifications,
    ProductAllergenAssessmentResult? allergenResult)
  {
    var completedCapabilities = new List<AnalysisCapability>
    {
      AnalysisCapability.DocumentExtraction,
      AnalysisCapability.ProductClassification,
    };

    if (allergenResult is not null)
    {
      completedCapabilities.Add(AnalysisCapability.AllergenAssessment);
    }

    return new InvoiceAnalysisResult(
      AnalysisProcessingTestData.CreateExtraction(AnalysisProcessingTestData.ExtractedProduct("Milk", "MILK-1")),
      MerchantCandidateResult: null,
      SummaryResult: null,
      classifications,
      allergenResult,
      InvoiceClassificationResult: null,
      RecipeGenerationResult: null,
      new ReadOnlyCollection<AnalysisCapability>(completedCapabilities));
  }

  private static InvoiceAnalysisResult FullResult(ProductAllergenAssessment assessment)
  {
    var extraction = new ReceiptExtractionResult(
      new MerchantCandidate("Test Merchant", "1 Test Street", "+40000000000", 0.9, 0.8, 0.7),
      [AnalysisProcessingTestData.ExtractedProduct("Milk", "MILK-1", confidence: 0.77)],
      new PaymentInformation(),
      "invoice",
      "RO",
      [],
      []);

    return new InvoiceAnalysisResult(
      extraction,
      extraction.MerchantCandidate,
      new InvoiceSummaryResult("New invoice", "New description"),
      ProductClassification(),
      new ProductAllergenAssessmentResult(new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal)
      {
        ["product-0000"] = assessment,
      }),
      new InvoiceClassificationResult(AnalysisProcessingTestData.Classification(ClassificationSystem.EcoicopV2, "01.1.1")),
      new RecipeGenerationResult([AnalysisProcessingTestData.Recipe("Milk pudding")]),
      new ReadOnlyCollection<AnalysisCapability>(
      [
        AnalysisCapability.DocumentExtraction,
        AnalysisCapability.MerchantResolution,
        AnalysisCapability.InvoiceSummary,
        AnalysisCapability.ProductClassification,
        AnalysisCapability.AllergenAssessment,
        AnalysisCapability.InvoiceClassification,
        AnalysisCapability.RecipeGeneration,
      ]));
  }
}
