namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Defines behavioural tests for the analysis processing service: request-time queueing, worker-time execution,
/// patch application semantics, lease heartbeating, and durable failure handling.
/// </summary>
[TestClass]
public sealed class AnalysisProcessingServiceTests
{
  private const string LeaseOwner = "worker-1";

  private static readonly string[] ExpectedInvoiceQueueTimeline = ["read-invoice", "queue-invoice-run"];
  private static readonly string[] ExpectedMerchantQueueTimeline = ["read-merchant", "queue-merchant-run"];

  /// <summary>
  /// Verifies that ensuring the analysis store is delegated verbatim to the analysis orchestration service.
  /// </summary>
  [TestMethod]
  public async Task EnsureAnalysisStoreAsync_Always_DelegatesToAnalysisOrchestration()
  {
    // Arrange
    var harness = new ProcessingHarness();

    // Act
    await harness.Service.EnsureAnalysisStoreAsync(CancellationToken.None).ConfigureAwait(false);

    // Assert
    Assert.AreEqual(1, harness.Analysis.EnsureRunStoreCallCount);
  }

  /// <summary>
  /// Verifies that queueing an invoice analysis validates the target through the invoice orchestration service
  /// before persisting the run, and returns the accepted-run projection of the persisted durable run.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceAnalysisAsync_ValidTarget_ValidatesTargetThenPersistsRun()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Invoice invoice = harness.SeedInvoice();

    // Act
    AnalysisAcceptedResponseDto response = await harness.Service.QueueInvoiceAnalysisAsync(
      invoice.id,
      invoice.UserIdentifier,
      new AnalyzeInvoiceRequestDto(AnalysisProfile.Fast, Overrides: null),
      CancellationToken.None).ConfigureAwait(false);

    // Assert
    CollectionAssert.AreEqual(ExpectedInvoiceQueueTimeline, harness.Timeline.ToArray());
    Assert.AreEqual(AnalysisTargetType.Invoice, response.TargetType);
    Assert.AreEqual(invoice.id, response.TargetId);
    Assert.AreEqual(AnalysisRunStatus.Queued, response.Status);
    Assert.AreEqual(AnalysisProfile.Fast, response.Profile);
    Assert.IsTrue(response.AcceptedCapabilities.Contains(AnalysisCapability.DocumentExtraction));
    Assert.IsFalse(response.AcceptedCapabilities.Contains(AnalysisCapability.RecipeGeneration));
  }

  /// <summary>
  /// Verifies that a missing invoice target aborts before any durable run is persisted.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceAnalysisAsync_MissingTarget_DoesNotPersistRun()
  {
    // Arrange
    var harness = new ProcessingHarness();
    harness.Invoices.ReadFailure = new InvalidOperationException("missing invoice");

    // Act + Assert
    await Assert.ThrowsExactlyAsync<AnalysisProcessingServiceException>(async () =>
      await harness.Service.QueueInvoiceAnalysisAsync(
        Guid.CreateVersion7(),
        Guid.CreateVersion7(),
        new AnalyzeInvoiceRequestDto(Profile: null, Overrides: null),
        CancellationToken.None).ConfigureAwait(false)).ConfigureAwait(false);

    Assert.AreEqual(0, harness.Analysis.QueuedInvoiceRuns.Count);
  }

  /// <summary>
  /// Verifies that the durable run records the authenticated caller supplied by the exposer and a non-blank
  /// distributed trace identifier, because the request body carries neither.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceAnalysisAsync_Always_RecordsCallerIdentifierAndNonBlankTraceId()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Invoice invoice = harness.SeedInvoice();
    var caller = Guid.CreateVersion7();

    // Act
    await harness.Service.QueueInvoiceAnalysisAsync(
      invoice.id,
      caller,
      new AnalyzeInvoiceRequestDto(Profile: null, Overrides: null),
      CancellationToken.None).ConfigureAwait(false);

    // Assert
    QueuedInvoiceRun queued = harness.Analysis.QueuedInvoiceRuns.Single();
    Assert.AreEqual(caller, queued.OwnerIdentifier);
    Assert.IsFalse(string.IsNullOrWhiteSpace(queued.TraceId));
  }

  /// <summary>
  /// Verifies that queueing a merchant analysis persists the merchant's parent company as the run's target
  /// partition identifier so worker-time point updates need no partition re-resolution.
  /// </summary>
  [TestMethod]
  public async Task QueueMerchantAnalysisAsync_ValidTarget_PersistsParentCompanyAsTargetPartition()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Merchant merchant = harness.SeedMerchant();

    // Act
    AnalysisAcceptedResponseDto response = await harness.Service.QueueMerchantAnalysisAsync(
      merchant.id,
      Guid.CreateVersion7(),
      new AnalyzeMerchantRequestDto(Profile: null, Overrides: null),
      CancellationToken.None).ConfigureAwait(false);

    // Assert
    CollectionAssert.AreEqual(ExpectedMerchantQueueTimeline, harness.Timeline.ToArray());
    QueuedMerchantRun queued = harness.Analysis.QueuedMerchantRuns.Single();
    Assert.AreEqual(merchant.ParentCompanyId, queued.ParentCompanyId);
    Assert.AreEqual(AnalysisTargetType.Merchant, response.TargetType);
    Assert.AreEqual(AnalysisRunStatus.Queued, response.Status);
  }

  /// <summary>
  /// Verifies that the worker entry point reports no work when the durable queue is empty.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_NoRunAvailable_ReturnsFalse()
  {
    // Arrange
    var harness = new ProcessingHarness();

    // Act
    bool processed = await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    Assert.IsFalse(processed);
    Assert.AreEqual(0, harness.Analysis.CompletedRuns.Count);
  }

  /// <summary>
  /// Verifies that an invoice run creates and links a previously unknown merchant, applies every successful
  /// capability section to the invoice aggregate, persists both aggregates, and completes the run.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_InvoiceRunWithUnknownMerchant_CreatesLinksAndPersists()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Invoice invoice = harness.SeedInvoice();
    harness.Analysis.ClaimableRun = AnalysisRun.CreateInvoice(
      invoice.id,
      invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Comprehensive(),
      traceParent: null);
    harness.Analysis.InvoiceResult = ProcessingHarness.FullInvoiceResult();

    // Act
    bool processed = await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    Assert.IsTrue(processed);
    Merchant created = harness.Merchants.CreatedMerchants.Single();
    Assert.AreEqual("Test Merchant", created.Name);
    Invoice persisted = harness.Invoices.UpdatedInvoices.Single();
    Assert.AreEqual(created.id, persisted.MerchantReference);
    Assert.AreEqual("Weekly groceries", persisted.Name);
    Assert.IsNotNull(persisted.Classification);
    Assert.AreEqual("01.1.1", persisted.Classification!.Code);
    Assert.AreEqual(1, persisted.Items.Count);
    Assert.AreEqual("10000025", persisted.Items.First().Classification!.Code);
    Assert.IsNotNull(persisted.Items.First().AllergenAssessment);
    Assert.AreEqual(1, persisted.PossibleRecipes.Count);
    Assert.AreEqual(1, harness.Analysis.CompletedRuns.Count);
    Assert.AreEqual(0, harness.Analysis.FailedRuns.Count);
  }

  /// <summary>
  /// Verifies that a merchant already known under its normalized name is linked instead of duplicated.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_InvoiceRunWithKnownMerchant_LinksWithoutCreating()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Invoice invoice = harness.SeedInvoice();
    Merchant existing = harness.SeedMerchant("Test Merchant");
    harness.Analysis.ClaimableRun = AnalysisRun.CreateInvoice(
      invoice.id,
      invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Comprehensive(),
      traceParent: null);
    harness.Analysis.InvoiceResult = ProcessingHarness.FullInvoiceResult();

    // Act
    await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    // Assert
    Assert.AreEqual(0, harness.Merchants.CreatedMerchants.Count);
    Assert.AreEqual(existing.id, harness.Invoices.UpdatedInvoices.Single().MerchantReference);
  }

  /// <summary>
  /// Verifies that a capability that failed during analysis (and therefore contributes no result section) leaves
  /// the previously persisted field untouched instead of clearing it.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_FailedCapabilitySection_LeavesExistingFieldUnchanged()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Invoice invoice = harness.SeedInvoice();
    StandardClassification previous = ProcessingHarness.EcoicopClassification("02.1.1");
    invoice.Classification = previous;
    harness.Analysis.ClaimableRun = AnalysisRun.CreateInvoice(
      invoice.id,
      invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Comprehensive(),
      traceParent: null);
    harness.Analysis.InvoiceResult = ProcessingHarness.FullInvoiceResult() with
    {
      InvoiceClassificationResult = null,
      CompletedCapabilities = new ReadOnlyCollection<AnalysisCapability>(
        [AnalysisCapability.DocumentExtraction, AnalysisCapability.MerchantResolution]),
    };

    // Act
    await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    // Assert
    Assert.AreEqual("02.1.1", harness.Invoices.UpdatedInvoices.Single().Classification!.Code);
  }

  /// <summary>
  /// Verifies that a successful recipe capability returning zero recipes replaces the previously persisted
  /// recipe collection, because an empty successful section is an authoritative result.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_SuccessfulEmptyRecipes_ReplacesExistingRecipes()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Invoice invoice = harness.SeedInvoice();
    invoice.PossibleRecipes = [ProcessingHarness.SampleRecipe("Old recipe")];
    harness.Analysis.ClaimableRun = AnalysisRun.CreateInvoice(
      invoice.id,
      invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Comprehensive(),
      traceParent: null);
    harness.Analysis.InvoiceResult = ProcessingHarness.FullInvoiceResult() with
    {
      RecipeGenerationResult = new RecipeGenerationResult([]),
    };

    // Act
    await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    // Assert
    Assert.AreEqual(0, harness.Invoices.UpdatedInvoices.Single().PossibleRecipes.Count);
  }

  /// <summary>
  /// Verifies that a merchant run writes the NACE classification and generated description, persisting through
  /// the partition identifier that was captured on the durable run at queue time.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_MerchantRun_WritesClassificationAndDescriptionUsingPersistedPartition()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Merchant merchant = harness.SeedMerchant();
    harness.Analysis.ClaimableRun = AnalysisRun.CreateMerchant(
      merchant.id,
      Guid.CreateVersion7(),
      Guid.CreateVersion7(),
      merchant.ParentCompanyId,
      MerchantAnalysisOptions.Comprehensive(),
      traceParent: null);
    harness.Analysis.MerchantResult = new MerchantAnalysisResult(
      new MerchantClassificationResult(ProcessingHarness.NaceClassification()),
      new MerchantDescriptionResult("A neighbourhood grocery retailer."),
      new ReadOnlyCollection<AnalysisCapability>(
        [AnalysisCapability.MerchantClassification, AnalysisCapability.DescriptionGeneration]));

    // Act
    bool processed = await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    Assert.IsTrue(processed);
    UpdatedMerchant updated = harness.Merchants.UpdatedMerchants.Single();
    Assert.AreEqual(merchant.ParentCompanyId, updated.ParentCompanyId);
    Assert.AreEqual(ClassificationSystem.Nace21, updated.Merchant.Classification!.System);
    Assert.AreEqual("47", updated.Merchant.Classification!.Code);
    Assert.AreEqual("A neighbourhood grocery retailer.", updated.Merchant.Description);
    Assert.AreEqual(1, harness.Analysis.CompletedRuns.Count);
  }

  /// <summary>
  /// Verifies that a failure while persisting the analyzed target fails the durable run instead of silently
  /// completing it.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_TargetPersistenceFails_FailsRun()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Invoice invoice = harness.SeedInvoice();
    harness.Invoices.UpdateFailure = new InvalidOperationException("cosmos rejected the write");
    harness.Analysis.ClaimableRun = AnalysisRun.CreateInvoice(
      invoice.id,
      invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Comprehensive(),
      traceParent: null);
    harness.Analysis.InvoiceResult = ProcessingHarness.FullInvoiceResult();

    // Act
    bool processed = await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    Assert.IsTrue(processed);
    Assert.AreEqual(0, harness.Analysis.CompletedRuns.Count);
    Assert.AreEqual(1, harness.Analysis.FailedRuns.Count);
    Assert.IsFalse(string.IsNullOrWhiteSpace(harness.Analysis.FailedRuns.Single().FailureCode));
  }

  /// <summary>
  /// Verifies that the run lease is renewed while capability execution is in flight and that renewal stops once
  /// execution finishes.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_LongRunningExecution_RenewsLeaseThenStops()
  {
    // Arrange
    var harness = new ProcessingHarness(TimeSpan.FromMilliseconds(15));
    Merchant merchant = harness.SeedMerchant();
    harness.Analysis.ClaimableRun = AnalysisRun.CreateMerchant(
      merchant.id,
      Guid.CreateVersion7(),
      Guid.CreateVersion7(),
      merchant.ParentCompanyId,
      MerchantAnalysisOptions.Fast(),
      traceParent: null);
    harness.Analysis.MerchantResult = new MerchantAnalysisResult(
      new MerchantClassificationResult(ProcessingHarness.NaceClassification()),
      DescriptionResult: null,
      new ReadOnlyCollection<AnalysisCapability>([AnalysisCapability.MerchantClassification]));
    harness.Analysis.AnalyzeDelay = TimeSpan.FromMilliseconds(180);

    // Act
    await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None).ConfigureAwait(false);
    int renewalsAtCompletion = harness.Analysis.RenewalCount;
    await Task.Delay(120).ConfigureAwait(false);

    // Assert
    Assert.IsTrue(renewalsAtCompletion >= 1, $"Expected at least one lease renewal, observed {renewalsAtCompletion}.");
    Assert.AreEqual(renewalsAtCompletion, harness.Analysis.RenewalCount);
  }

  /// <summary>
  /// Verifies that losing the lease mid-execution aborts the run before the analyzed target is persisted, so two
  /// workers can never write the same target concurrently.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_LeaseOwnerMismatch_AbortsBeforePersistingTarget()
  {
    // Arrange
    var harness = new ProcessingHarness(TimeSpan.FromMilliseconds(15));
    Merchant merchant = harness.SeedMerchant();
    harness.Analysis.ClaimableRun = AnalysisRun.CreateMerchant(
      merchant.id,
      Guid.CreateVersion7(),
      Guid.CreateVersion7(),
      merchant.ParentCompanyId,
      MerchantAnalysisOptions.Fast(),
      traceParent: null);
    harness.Analysis.MerchantResult = new MerchantAnalysisResult(
      new MerchantClassificationResult(ProcessingHarness.NaceClassification()),
      DescriptionResult: null,
      new ReadOnlyCollection<AnalysisCapability>([AnalysisCapability.MerchantClassification]));
    harness.Analysis.AnalyzeDelay = TimeSpan.FromMilliseconds(400);
    harness.Analysis.RenewalFailure = new InvalidOperationException("lease owner mismatch");

    // Act + Assert
    await Assert.ThrowsExactlyAsync<AnalysisProcessingDependencyException>(async () =>
      await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None).ConfigureAwait(false))
      .ConfigureAwait(false);

    Assert.AreEqual(0, harness.Merchants.UpdatedMerchants.Count);
    Assert.AreEqual(0, harness.Analysis.CompletedRuns.Count);
  }

  /// <summary>
  /// Verifies that cancellation propagates unchanged out of the processing layer.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_CancelledToken_PropagatesCancellation()
  {
    // Arrange
    var harness = new ProcessingHarness();
    using var cancellation = new CancellationTokenSource();
    await cancellation.CancelAsync().ConfigureAwait(false);

    // Act + Assert
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(async () =>
      await harness.Service.TryExecuteNextRunAsync(LeaseOwner, cancellation.Token).ConfigureAwait(false))
      .ConfigureAwait(false);
  }

  private sealed record QueuedInvoiceRun(Guid InvoiceId, Guid OwnerIdentifier, string TraceId);

  private sealed record QueuedMerchantRun(Guid MerchantId, Guid OwnerIdentifier, Guid ParentCompanyId, string TraceId);

  private sealed record UpdatedMerchant(Merchant Merchant, Guid? ParentCompanyId);

  private sealed record FailedRun(Guid RunId, string FailureCode);

  private sealed class ProcessingHarness
  {
    internal ProcessingHarness(TimeSpan? renewalInterval = null)
    {
      Timeline = [];
      Invoices = new FakeInvoiceOrchestrationService(Timeline);
      Merchants = new FakeMerchantOrchestrationService(Timeline);
      Analysis = new FakeAnalysisOrchestrationService(Timeline);
      Service = renewalInterval is null
        ? new AnalysisProcessingService(Invoices, Merchants, Analysis, NullLoggerFactory.Instance)
        : new AnalysisProcessingService(
          Invoices,
          Merchants,
          Analysis,
          NullLoggerFactory.Instance,
          renewalInterval.Value,
          TimeSpan.FromMinutes(2));
    }

    internal List<string> Timeline { get; }

    internal FakeInvoiceOrchestrationService Invoices { get; }

    internal FakeMerchantOrchestrationService Merchants { get; }

    internal FakeAnalysisOrchestrationService Analysis { get; }

    internal AnalysisProcessingService Service { get; }

    internal Invoice SeedInvoice()
    {
      var invoice = new Invoice
      {
        id = Guid.CreateVersion7(),
        UserIdentifier = Guid.CreateVersion7(),
        Name = "Old name",
      };

      Invoices.Invoices[invoice.id] = invoice;
      return invoice;
    }

    internal Merchant SeedMerchant(string name = "Seeded Merchant")
    {
      var merchant = new Merchant
      {
        id = Guid.CreateVersion7(),
        ParentCompanyId = Guid.CreateVersion7(),
        Name = name,
      };

      Merchants.Merchants[merchant.id] = merchant;
      return merchant;
    }

    internal static StandardClassification EcoicopClassification(string code) =>
      new(
        ClassificationSystem.EcoicopV2,
        "2018",
        code,
        "Sample ECOICOP label",
        [
          new ClassificationNode("division", "01", "Food and non-alcoholic beverages"),
          new ClassificationNode("group", "01.1", "Food"),
          new ClassificationNode("class", code, "Sample ECOICOP label"),
        ],
        ClassificationOrigin.Analysis,
        0.9,
        []);

    internal static StandardClassification GpcClassification() =>
      new(
        ClassificationSystem.Gs1Gpc,
        "2024",
        "10000025",
        "Sample GPC brick",
        [
          new ClassificationNode("segment", "50000000", "Food/Beverage/Tobacco"),
          new ClassificationNode("family", "51000000", "Milk/Butter/Cream"),
          new ClassificationNode("brick", "10000025", "Sample GPC brick"),
        ],
        ClassificationOrigin.Analysis,
        0.8,
        []);

    internal static StandardClassification NaceClassification() =>
      new(
        ClassificationSystem.Nace21,
        "2.1",
        "47",
        "Retail trade",
        [
          new ClassificationNode("section", "G", "Wholesale and retail trade"),
          new ClassificationNode("division", "47", "Retail trade"),
        ],
        ClassificationOrigin.Analysis,
        0.85,
        []);

    internal static RecipeSuggestion SampleRecipe(string name) =>
      new(
        name,
        "A simple sample recipe.",
        2,
        10,
        20,
        30,
        RecipeDifficulty.Easy,
        [],
        [],
        [],
        [new RecipeStep(1, "Cook everything.", null)],
        [],
        Guid.CreateVersion7());

    internal static InvoiceAnalysisResult FullInvoiceResult()
    {
      var candidate = new MerchantCandidate("Test Merchant", "1 Test Street", "+40000000000", 0.9, 0.8, 0.7);
      var extraction = new ReceiptExtractionResult(
        candidate,
        [new ExtractedProduct("Milk", 1m, "pcs", "MILK-1", 4.5m, 0.95)],
        new PaymentInformation(),
        "receipt",
        "RO",
        [],
        []);

      return new InvoiceAnalysisResult(
        extraction,
        candidate,
        new InvoiceSummaryResult("Weekly groceries", "Groceries bought for the week."),
        new ProductClassificationResult(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
        {
          ["product-0000"] = GpcClassification(),
        }),
        new ProductAllergenAssessmentResult(new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal)
        {
          ["product-0000"] = ProductAllergenAssessment.SignalsFound(
          [
            new ProductAllergenSignal(
              AllergenCode.Milk,
              ProductAllergenEvidenceTier.Declared,
              0.99,
              [new AllergenEvidence("product-name", "Milk")]),
          ]),
        }),
        new InvoiceClassificationResult(EcoicopClassification("01.1.1")),
        new RecipeGenerationResult([SampleRecipe("Milk pudding")]),
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

  private sealed class FakeInvoiceOrchestrationService(List<string> timeline) : IInvoiceOrchestrationService
  {
    internal Dictionary<Guid, Invoice> Invoices { get; } = [];

    internal List<Invoice> UpdatedInvoices { get; } = [];

    internal Exception? ReadFailure { get; set; }

    internal Exception? UpdateFailure { get; set; }

    public Task<Invoice> CreateInvoiceObject(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) =>
      Task.FromResult(invoice);

    public Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      timeline.Add("read-invoice");

      if (ReadFailure is not null)
      {
        throw ReadFailure;
      }

      return Task.FromResult(Invoices[identifier]);
    }

    public Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid userIdentifier, CancellationToken cancellationToken) =>
      Task.FromResult<IEnumerable<Invoice>>([.. Invoices.Values]);

    public Task<Invoice> UpdateInvoiceObject(
      Invoice updatedInvoice,
      Guid invoiceIdentifier,
      Guid? userIdentifier,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      timeline.Add("update-invoice");

      if (UpdateFailure is not null)
      {
        throw UpdateFailure;
      }

      UpdatedInvoices.Add(updatedInvoice);
      return Task.FromResult(updatedInvoice);
    }

    public Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
      Task.CompletedTask;
  }

  private sealed class FakeMerchantOrchestrationService(List<string> timeline) : IMerchantOrchestrationService
  {
    internal Dictionary<Guid, Merchant> Merchants { get; } = [];

    internal List<Merchant> CreatedMerchants { get; } = [];

    internal List<UpdatedMerchant> UpdatedMerchants { get; } = [];

    internal Exception? UpdateFailure { get; set; }

    public Task CreateMerchantObject(Merchant merchant, Guid? parentCompanyId, CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      timeline.Add("create-merchant");
      CreatedMerchants.Add(merchant);
      Merchants[merchant.id] = merchant;
      return Task.CompletedTask;
    }

    public Task<Merchant> ReadMerchantObject(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      timeline.Add("read-merchant");
      return Task.FromResult(Merchants[identifier]);
    }

    public Task<IEnumerable<Merchant>> ReadAllMerchantObjects(Guid parentCompanyId, CancellationToken cancellationToken) =>
      Task.FromResult<IEnumerable<Merchant>>([.. Merchants.Values]);

    public Task<Merchant?> FindMerchantByNormalizedNameObject(string normalizedName, CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      timeline.Add("find-merchant");

      Merchant? match = Merchants.Values.FirstOrDefault(merchant =>
        string.Equals(
          merchant.Name.ToUpperInvariant().Replace(" ", string.Empty, StringComparison.Ordinal),
          normalizedName.ToUpperInvariant().Replace(" ", string.Empty, StringComparison.Ordinal),
          StringComparison.Ordinal));

      return Task.FromResult(match);
    }

    public Task<Merchant> UpdateMerchantObject(
      Merchant updatedMerchant,
      Guid merchantIdentifier,
      Guid? parentCompanyId,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      timeline.Add("update-merchant");

      if (UpdateFailure is not null)
      {
        throw UpdateFailure;
      }

      UpdatedMerchants.Add(new UpdatedMerchant(updatedMerchant, parentCompanyId));
      Merchants[merchantIdentifier] = updatedMerchant;
      return Task.FromResult(updatedMerchant);
    }

    public Task DeleteMerchantObject(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
      Task.CompletedTask;
  }

  private sealed class FakeAnalysisOrchestrationService(List<string> timeline) : IAnalysisOrchestrationService
  {
    private int renewalCount;

    internal int EnsureRunStoreCallCount { get; private set; }

    internal List<QueuedInvoiceRun> QueuedInvoiceRuns { get; } = [];

    internal List<QueuedMerchantRun> QueuedMerchantRuns { get; } = [];

    internal List<Guid> CompletedRuns { get; } = [];

    internal List<FailedRun> FailedRuns { get; } = [];

    internal AnalysisRun? ClaimableRun { get; set; }

    internal InvoiceAnalysisResult? InvoiceResult { get; set; }

    internal MerchantAnalysisResult? MerchantResult { get; set; }

    internal TimeSpan AnalyzeDelay { get; set; }

    internal Exception? RenewalFailure { get; set; }

    internal int RenewalCount => Volatile.Read(ref renewalCount);

    public Task EnsureRunStoreAsync(CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      EnsureRunStoreCallCount++;
      return Task.CompletedTask;
    }

    public Task<AnalysisRun> QueueInvoiceRunAsync(
      Guid invoiceId,
      Guid ownerIdentifier,
      InvoiceAnalysisOptions options,
      string traceId,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      timeline.Add("queue-invoice-run");
      QueuedInvoiceRuns.Add(new QueuedInvoiceRun(invoiceId, ownerIdentifier, traceId));
      return Task.FromResult(AnalysisRun.CreateInvoice(
        invoiceId,
        ownerIdentifier,
        Guid.CreateVersion7(),
        options,
        traceId));
    }

    public Task<AnalysisRun> QueueMerchantRunAsync(
      Guid merchantId,
      Guid ownerIdentifier,
      Guid parentCompanyId,
      MerchantAnalysisOptions options,
      string traceId,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      timeline.Add("queue-merchant-run");
      QueuedMerchantRuns.Add(new QueuedMerchantRun(merchantId, ownerIdentifier, parentCompanyId, traceId));
      return Task.FromResult(AnalysisRun.CreateMerchant(
        merchantId,
        ownerIdentifier,
        Guid.CreateVersion7(),
        parentCompanyId,
        options,
        traceId));
    }

    public Task<AnalysisRun?> ClaimNextRunAsync(
      string leaseOwner,
      DateTimeOffset now,
      TimeSpan leaseDuration,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      timeline.Add("claim-run");

      if (ClaimableRun is null)
      {
        return Task.FromResult<AnalysisRun?>(null);
      }

      AnalysisRun claimed = ClaimableRun.Claim(leaseOwner, now, leaseDuration);
      ClaimableRun = null;
      return Task.FromResult<AnalysisRun?>(claimed);
    }

    public async Task<InvoiceAnalysisResult> AnalyzeInvoiceAsync(
      AnalysisRun run,
      Invoice invoice,
      CancellationToken cancellationToken)
    {
      timeline.Add("analyze-invoice");

      if (AnalyzeDelay > TimeSpan.Zero)
      {
        await Task.Delay(AnalyzeDelay, cancellationToken).ConfigureAwait(false);
      }

      cancellationToken.ThrowIfCancellationRequested();
      return InvoiceResult!;
    }

    public async Task<MerchantAnalysisResult> AnalyzeMerchantAsync(
      AnalysisRun run,
      Merchant merchant,
      CancellationToken cancellationToken)
    {
      timeline.Add("analyze-merchant");

      if (AnalyzeDelay > TimeSpan.Zero)
      {
        await Task.Delay(AnalyzeDelay, cancellationToken).ConfigureAwait(false);
      }

      cancellationToken.ThrowIfCancellationRequested();
      return MerchantResult!;
    }

    public Task RenewRunLeaseAsync(
      Guid runId,
      string leaseOwner,
      DateTimeOffset now,
      TimeSpan leaseDuration,
      CancellationToken cancellationToken)
    {
      Interlocked.Increment(ref renewalCount);

      if (RenewalFailure is not null)
      {
        throw RenewalFailure;
      }

      return Task.CompletedTask;
    }

    public Task CompleteRunAsync(
      Guid runId,
      string leaseOwner,
      IReadOnlyCollection<AnalysisCapability> completedCapabilities,
      DateTimeOffset completedAt,
      CancellationToken cancellationToken)
    {
      timeline.Add("complete-run");
      CompletedRuns.Add(runId);
      return Task.CompletedTask;
    }

    public Task FailRunAsync(
      Guid runId,
      string leaseOwner,
      string failureCode,
      DateTimeOffset failedAt,
      CancellationToken cancellationToken)
    {
      timeline.Add("fail-run");
      FailedRuns.Add(new FailedRun(runId, failureCode));
      return Task.CompletedTask;
    }
  }
}
