namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

/// <summary>
/// Provides focused analysis-processing fixtures for branch-coverage tests added outside the original suite.
/// </summary>
internal static class AnalysisProcessingTestData
{
  internal const string LeaseOwner = "coverage-worker";

  internal static AnalysisProcessingService CreateService(Exception ensureStoreFailure)
  {
    var harness = new AnalysisPipelineHarness();
    harness.RunBroker.EnsureFailure = ensureStoreFailure;
    return harness.Service;
  }

  internal static Invoice CreateInvoice() => new()
  {
    id = Guid.CreateVersion7(),
    UserIdentifier = Guid.CreateVersion7(),
    Name = "Original invoice",
    Description = "Original description",
    Items =
    [
      new Product
      {
        Name = "Original milk",
        Quantity = 1m,
        QuantityUnit = "pcs",
        ProductCode = "MILK-OLD",
        Price = 3.5m,
      },
      new Product
      {
        Name = "Original bread",
        Quantity = 2m,
        QuantityUnit = "pcs",
        ProductCode = "BREAD-OLD",
        Price = 2m,
      },
    ],
  };

  internal static Merchant CreateMerchant() => new()
  {
    id = Guid.CreateVersion7(),
    ParentCompanyId = Guid.CreateVersion7(),
    Name = "Original merchant",
    Description = "Original merchant description",
  };

  internal static ReceiptExtractionResult CreateExtraction(params ExtractedProduct[] products) =>
    new(
      merchantCandidate: null,
      products,
      new PaymentInformation
      {
        PaymentType = PaymentType.CARD,
        TotalCostAmount = 42m,
        TotalTaxAmount = 8m,
        SubtotalAmount = 34m,
      },
      "invoice",
      "RO",
      [new TaxDetail { Amount = 8m, Rate = 19m, NetAmount = 34m, Description = "VAT" }],
      [new PaymentDetail { Method = "Card", Amount = 42m }]);

  internal static ExtractedProduct ExtractedProduct(
    string name,
    string productCode,
    decimal quantity = 1m,
    decimal price = 4.5m,
    double confidence = 0.9) =>
    new(name, quantity, "pcs", productCode, price, confidence);

  internal static StandardClassification Classification(ClassificationSystem system, string code) =>
    new(
      system,
      "2026",
      code,
      $"Label {code}",
      [new ClassificationNode("node", code, $"Label {code}")],
      ClassificationOrigin.Analysis,
      0.8,
      [new ClassificationEvidence("source", "evidence")]);

  internal static RecipeSuggestion Recipe(string name) =>
    new(
      name,
      "Recipe description.",
      1,
      1,
      1,
      2,
      RecipeDifficulty.Easy,
      [],
      [],
      [],
      [new RecipeStep(1, "Cook.", notes: null)],
      [],
      Guid.CreateVersion7());

  internal static ProductAllergenAssessment SignalsFound(ProductAllergenEvidenceTier tier) =>
    ProductAllergenAssessment.SignalsFound(
    [
      new ProductAllergenSignal(
        AllergenCode.Milk,
        tier,
        0.95,
        [new AllergenEvidence("label", "contains milk")]),
    ]);

  internal static InvoiceAnalysisPatch EmptyInvoicePatch() =>
    new(
      ExtractionUpdate: null,
      MerchantReferenceUpdate: null,
      SummaryUpdate: null,
      ProductClassificationUpdate: null,
      AllergenAssessmentUpdate: null,
      InvoiceClassificationUpdate: null,
      RecipeGenerationUpdate: null);

  internal static InvoiceAnalysisPatch FullInvoicePatch(ProductAllergenAssessment assessment) =>
    new(
      CreateExtraction(ExtractedProduct("Milk", "MILK-1", confidence: 0.77)),
      Guid.CreateVersion7(),
      new InvoiceSummaryResult("New invoice", "New description"),
      new ProductClassificationResult(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
      {
        ["product-0000"] = Classification(ClassificationSystem.Gs1Gpc, "10000025"),
      }),
      new ProductAllergenAssessmentResult(new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal)
      {
        ["product-0000"] = assessment,
      }),
      new InvoiceClassificationResult(Classification(ClassificationSystem.EcoicopV2, "01.1.1")),
      new RecipeGenerationResult([Recipe("Milk pudding")]));

  internal static InvoiceAnalysisResult InvoiceResultWithCompletedCapabilities(IReadOnlyCollection<AnalysisCapability> completedCapabilities) =>
    new(
      ExtractionResult: null,
      MerchantCandidateResult: null,
      SummaryResult: null,
      ProductClassificationResult: null,
      AllergenAssessmentResult: null,
      InvoiceClassificationResult: null,
      RecipeGenerationResult: null,
      completedCapabilities);

  internal static MerchantAnalysisResult MerchantResultWithCompletedCapabilities(IReadOnlyCollection<AnalysisCapability> completedCapabilities) =>
    new(
      ClassificationResult: null,
      DescriptionResult: null,
      completedCapabilities);

  internal static InvoiceAnalysisResult CompleteInvoiceResult()
  {
    var extraction = new ReceiptExtractionResult(
      new MerchantCandidate("Test Merchant", "Test street", "+40000000000", 0.9, 0.9, 0.9),
      [ExtractedProduct("Milk", "MILK-1")],
      new PaymentInformation(),
      "invoice",
      "RO",
      [],
      []);
    var productClassifications = new ProductClassificationResult(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
    {
      ["product-0000"] = Classification(ClassificationSystem.Gs1Gpc, "10000025"),
    });

    return new InvoiceAnalysisResult(
      extraction,
      MerchantCandidateResult: null,
      new InvoiceSummaryResult("Complete invoice", "Complete analysis result."),
      productClassifications,
      new ProductAllergenAssessmentResult(new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal)
      {
        ["product-0000"] = ProductAllergenAssessment.NoSignalsInAvailableEvidence(),
      }),
      new InvoiceClassificationResult(Classification(ClassificationSystem.EcoicopV2, "01.1.1")),
      new RecipeGenerationResult([]),
      []);
  }

  internal static MerchantAnalysisResult CompleteMerchantResult() =>
    new(
      new MerchantClassificationResult(Classification(ClassificationSystem.Nace21, "01")),
      new MerchantDescriptionResult("A known merchant."),
      []);

  internal static AnalysisRun CreateMerchantRun(Merchant merchant) =>
    AnalysisRun.CreateMerchant(
      merchant.id,
      Guid.CreateVersion7(),
      Guid.CreateVersion7(),
      merchant.ParentCompanyId,
      MerchantAnalysisOptions.Fast(),
      traceParent: null);

  internal static AnalysisRun CreateInvoiceRun(Invoice invoice) =>
    AnalysisRun.CreateInvoice(
      invoice.id,
      invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Fast(),
      traceParent: null);

  internal static Activity StartActivity()
  {
    var activity = new Activity("analysis-processing-test");
    activity.Start();
    return activity;
  }
}

/// <summary>
/// Captures an executable processing scenario composed from real service layers and controllable external brokers.
/// </summary>
internal sealed class AnalysisProcessingScenario
{
  private readonly AnalysisPipelineHarness pipeline;

  internal AnalysisProcessingScenario(
    TimeSpan? renewalInterval = null,
    TimeProvider? timeProvider = null,
    TimeSpan? queueDepthRefreshInterval = null)
  {
    Invoice = AnalysisProcessingTestData.CreateInvoice();
    Merchant = AnalysisProcessingTestData.CreateMerchant();
    pipeline = new AnalysisPipelineHarness(
      renewalInterval,
      timeProvider ?? new ManualTimeProvider(DateTimeOffset.UtcNow),
      queueDepthRefreshInterval);
    pipeline.SeedInvoice(Invoice);
    pipeline.SeedMerchant(Merchant);
  }

  /// <summary>
  /// Provides deterministic UTC time for processing-service tests without waiting for wall-clock time.
  /// </summary>
  /// <param name="utcNow">The initial UTC instant.</param>
  internal sealed class ManualTimeProvider(DateTimeOffset utcNow) : TimeProvider
  {
    private DateTimeOffset currentUtcNow = utcNow;

    /// <inheritdoc/>
    public override DateTimeOffset GetUtcNow() => currentUtcNow;

    /// <summary>
    /// Advances the current UTC instant by the supplied positive duration.
    /// </summary>
    /// <param name="duration">The duration to add to the current instant.</param>
    internal void Advance(TimeSpan duration)
    {
      ArgumentOutOfRangeException.ThrowIfLessThan(duration, TimeSpan.Zero);
      currentUtcNow = currentUtcNow.Add(duration);
    }
  }

  /// <summary>Gets the real processing service under test.</summary>
  internal AnalysisProcessingService Service => pipeline.Service;

  /// <summary>Gets the aggregate persistence boundary used by real invoice and merchant layers.</summary>
  internal InMemoryAggregateBroker Aggregates => pipeline.AggregateBroker;

  /// <summary>Gets the analysis-run persistence boundary used by real lifecycle layers.</summary>
  internal InMemoryAnalysisRunBroker Runs => pipeline.RunBroker;

  internal Invoice Invoice { get; }

  internal Merchant Merchant { get; }

  internal IReadOnlyList<Guid> CompletedRuns =>
    [.. Runs.Runs.Where(run => run.Status == AnalysisRunStatus.Completed).Select(run => run.Id)];

  internal IReadOnlyList<Guid> FailedRuns =>
    [.. Runs.Runs.Where(run => run.Status == AnalysisRunStatus.Failed).Select(run => run.Id)];

  internal IReadOnlyList<string> QueuedTraceIds =>
    [.. Runs.Runs.Where(run => !string.IsNullOrWhiteSpace(run.TraceParent)).Select(run => run.TraceParent!)];

  internal List<string> Timeline => pipeline.Timeline;

  internal IReadOnlyDictionary<AnalysisTargetType, long> PendingRunCounts
  {
    get => Runs.PendingRunCounts;
    set => Runs.PendingRunCounts = value;
  }

  internal InvoiceAnalysisResult? InvoiceResult
  {
    get => pipeline.GenerativeBroker.InvoiceResult;
    set => pipeline.ConfigureInvoiceResult(value);
  }

  internal MerchantAnalysisResult? MerchantResult
  {
    get => pipeline.GenerativeBroker.MerchantResult;
    set => pipeline.ConfigureMerchantResult(value);
  }

  internal Exception? AnalyzeInvoiceFailure
  {
    get => pipeline.DocumentBroker.Failure;
    set => pipeline.DocumentBroker.Failure = value;
  }

  internal TimeSpan AnalyzeMerchantDelay
  {
    get => pipeline.GenerativeBroker.Delay;
    set => pipeline.GenerativeBroker.Delay = value;
  }

  /// <summary>Blocks the next real generative broker invocation and returns when it reaches the boundary.</summary>
  internal Task BlockNextGenerativeInvocationAsync() => pipeline.GenerativeBroker.BlockNextInvocation();

  /// <summary>Releases the real generative broker invocation blocked for a heartbeat scenario.</summary>
  internal void ReleaseGenerativeInvocation() => pipeline.GenerativeBroker.ReleaseInvocation();

  internal AnalysisRun? ClaimableRun
  {
    get => Runs.Runs.SingleOrDefault();
    set => pipeline.SetClaimableRun(value);
  }

  /// <summary>Makes every subsequent lease renewal fail with the given exception, simulating a stolen lease.</summary>
  /// <param name="failure">The exception each renewal attempt should surface.</param>
  internal void FailLeaseRenewal(Exception failure) => Runs.RenewalFailure = failure;

  /// <summary>Restores healthy lease renewal after a previous <see cref="FailLeaseRenewal"/> call.</summary>
  internal void ClearLeaseRenewalFailure() => Runs.RenewalFailure = null;
}
