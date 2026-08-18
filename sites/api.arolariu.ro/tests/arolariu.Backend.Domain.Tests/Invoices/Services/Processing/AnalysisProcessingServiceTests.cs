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
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

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
    AnalysisRun queued = harness.Analysis.QueuedInvoiceRuns.Single();
    Assert.AreEqual(caller, queued.RequestedBy);
    Assert.IsFalse(string.IsNullOrWhiteSpace(queued.TraceParent));
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
    AnalysisRun queued = harness.Analysis.QueuedMerchantRuns.Single();
    Assert.AreEqual(merchant.ParentCompanyId, queued.TargetPartitionIdentifier);
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
    Assert.AreEqual(0, persisted.PossibleRecipes.Count);
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
    StandardClassification previous = ProcessingHarness.EcoicopClassification("01.1.1");
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
    Assert.AreEqual("01.1.1", harness.Invoices.UpdatedInvoices.Single().Classification!.Code);
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
      new MerchantDescriptionResult("Likely a neighbourhood grocery retailer."),
      new ReadOnlyCollection<AnalysisCapability>(
        [AnalysisCapability.MerchantClassification, AnalysisCapability.DescriptionGeneration]));

    // Act
    bool processed = await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    Assert.IsTrue(processed);
    Merchant updated = harness.Merchants.UpdatedMerchants.Single();
    Assert.AreEqual(merchant.ParentCompanyId, updated.ParentCompanyId);
    Assert.AreEqual(ClassificationSystem.Nace21, updated.Classification!.System);
    Assert.AreEqual("01", updated.Classification!.Code);
    Assert.AreEqual("Likely a neighbourhood grocery retailer.", updated.Description);
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
    harness.Pipeline.GenerativeBroker.Delay = TimeSpan.FromMilliseconds(100);

    // Act
    await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None).ConfigureAwait(false);
    int renewalsAtCompletion = harness.Analysis.RenewalCount;

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
    harness.Analysis.RenewalFailure = new InvalidOperationException("lease owner mismatch");
    harness.Pipeline.GenerativeBroker.Delay = TimeSpan.FromMilliseconds(100);

    // Act + Assert
    Task execution = harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None);
    await Assert.ThrowsExactlyAsync<AnalysisProcessingDependencyException>(() => execution).ConfigureAwait(false);

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

  #region Independent merchant partition (ParentCompanyId == Guid.Empty)

  /// <summary>
  /// Verifies that the merchant analyze route accepts an independent merchant - one whose
  /// <c>ParentCompanyId</c> is <see cref="Guid.Empty"/>, which is the default for every merchant auto-created
  /// during invoice analysis - and persists that empty partition verbatim on the durable run.
  /// </summary>
  /// <remarks>
  /// <para>This regression deliberately wires the <b>real</b> <see cref="AnalysisOrchestrationService"/> rather than
  /// the forgiving in-file fake, because the defect this covers lived in the orchestration layer's queue-time
  /// validation and a fake orchestration would have accepted the request regardless.</para>
  /// </remarks>
  [TestMethod]
  public async Task QueueMerchantAnalysisAsync_IndependentMerchant_QueuesRunThroughRealOrchestration()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Merchant merchant = harness.SeedMerchant("Independent Corner Shop", Guid.Empty);

    // Act
    AnalysisAcceptedResponseDto response = await harness.Service.QueueMerchantAnalysisAsync(
      merchant.id,
      Guid.CreateVersion7(),
      new AnalyzeMerchantRequestDto(AnalysisProfile.Comprehensive, Overrides: null),
      CancellationToken.None).ConfigureAwait(false);

    // Assert
    AnalysisRun persistedRun = harness.Analysis.QueuedMerchantRuns.Single();
    Assert.AreEqual(Guid.Empty, persistedRun.TargetPartitionIdentifier);
    Assert.AreEqual(merchant.id, response.TargetId);
    Assert.AreEqual(AnalysisRunStatus.Queued, response.Status);
  }

  /// <summary>
  /// Verifies that an independent merchant's run executes worker-side and point-updates against the empty
  /// partition captured at queue time instead of falling back to a cross-partition write.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_IndependentMerchantRun_PersistsUsingEmptyPartition()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Merchant merchant = harness.SeedMerchant(parentCompanyId: Guid.Empty);
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

    // Act
    bool processed = await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    Assert.IsTrue(processed);
    Merchant updated = harness.Merchants.UpdatedMerchants.Single();
    Assert.AreEqual(Guid.Empty, updated.ParentCompanyId);
    Assert.AreEqual(1, harness.Analysis.CompletedRuns.Count);
    Assert.AreEqual(0, harness.Analysis.FailedRuns.Count);
  }

  #endregion

  #region Merchant resolution capability toggle

  /// <summary>
  /// Verifies that a run with merchant resolution disabled never creates, links, or updates a merchant, even
  /// though document extraction succeeded and its extraction result still carries a merchant candidate.
  /// </summary>
  /// <remarks>
  /// <para>The orchestration layer expresses "merchant resolution is off" by leaving
  /// <see cref="InvoiceAnalysisResult.MerchantCandidateResult"/> null while
  /// <see cref="ReceiptExtractionResult.MerchantCandidate"/> remains populated. Reading through to the extraction
  /// result would silently re-enable a capability the caller explicitly turned off.</para>
  /// </remarks>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_MerchantResolutionDisabled_DoesNotCreateLinkOrUpdateMerchant()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Invoice invoice = harness.SeedInvoice();
    var previousMerchantReference = Guid.CreateVersion7();
    invoice.MerchantReference = previousMerchantReference;
    harness.SeedMerchant("Test Merchant");

    harness.Analysis.ClaimableRun = AnalysisRun.CreateInvoice(
      invoice.id,
      invoice.UserIdentifier,
      Guid.CreateVersion7(),
      ProcessingHarness.ExtractionOnlyWithoutMerchantResolution(),
      traceParent: null);

    // Extraction still observed a merchant candidate; merchant resolution being disabled means it is not used.
    harness.Analysis.InvoiceResult = ProcessingHarness.FullInvoiceResult() with
    {
      MerchantCandidateResult = null,
      CompletedCapabilities = new ReadOnlyCollection<AnalysisCapability>([AnalysisCapability.DocumentExtraction]),
    };

    // Act
    await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    // Assert
    Assert.AreEqual(0, harness.Merchants.CreatedMerchants.Count);
    Assert.AreEqual(0, harness.Merchants.UpdatedMerchants.Count);
    Assert.IsFalse(harness.Timeline.Contains("find-merchant"), "Merchant lookup must not run when the capability is disabled.");
    Assert.AreEqual(previousMerchantReference, harness.Invoices.UpdatedInvoices.Single().MerchantReference);
  }

  #endregion

  #region Extraction re-application: per-item carry-over

  /// <summary>
  /// Verifies that a Fast re-analysis (extraction plus classification, no allergen assessment) applied over an
  /// invoice previously enriched by a Balanced run preserves the earlier allergen assessment and the user's
  /// per-item metadata flags for recognizably identical line items.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_FastRunAfterBalancedRun_PreservesPriorPerItemAnalysisAndMetadata()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Invoice invoice = harness.SeedInvoice();
    AllergenAssessment previousAssessment = AllergenAssessment.NoSignals(Guid.CreateVersion7());
    invoice.Items =
    [
      new Product
      {
        Name = "Milk",
        Quantity = 1m,
        QuantityUnit = "pcs",
        ProductCode = "MILK-1",
        Price = 4.5m,
        Classification = ProcessingHarness.GpcClassification(),
        AllergenAssessment = previousAssessment,
        Metadata = new ProductMetadata
        {
          IsEdited = true,
          IsComplete = true,
          IsSoftDeleted = true,
          Confidence = 0.11,
        },
      },
    ];

    harness.Analysis.ClaimableRun = AnalysisRun.CreateInvoice(
      invoice.id,
      invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Fast(),
      traceParent: null);

    // A Fast run: extraction succeeded, allergen assessment never ran and therefore has no section.
    harness.Analysis.InvoiceResult = ProcessingHarness.FullInvoiceResult() with
    {
      AllergenAssessmentResult = null,
      RecipeGenerationResult = null,
      CompletedCapabilities = new ReadOnlyCollection<AnalysisCapability>(
      [
        AnalysisCapability.DocumentExtraction,
        AnalysisCapability.MerchantResolution,
        AnalysisCapability.ProductClassification,
        AnalysisCapability.InvoiceClassification,
      ]),
    };

    // Act
    await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    // Assert
    Product persisted = harness.Invoices.UpdatedInvoices.Single().Items.Single();
    Assert.AreEqual(previousAssessment, persisted.AllergenAssessment);
    Assert.IsTrue(persisted.Metadata.IsEdited);
    Assert.IsTrue(persisted.Metadata.IsComplete);
    Assert.IsTrue(persisted.Metadata.IsSoftDeleted);
    Assert.AreEqual(0.95, persisted.Metadata.Confidence, "OCR confidence must be refreshed from the new extraction.");
  }

  /// <summary>
  /// Verifies that a succeeding product classification section still overwrites a preserved classification, so
  /// carry-over never shadows a fresh authoritative result.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_SuccessfulClassificationSection_OverwritesPreservedClassification()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Invoice invoice = harness.SeedInvoice();
    invoice.Items =
    [
      new Product
      {
        Name = "Milk",
        Quantity = 1m,
        QuantityUnit = "pcs",
        ProductCode = "MILK-1",
        Price = 4.5m,
        Classification = ProcessingHarness.StaleGpcClassification(),
      },
    ];

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
    Product persisted = harness.Invoices.UpdatedInvoices.Single().Items.Single();
    Assert.AreEqual("10000025", persisted.Classification!.Code);
  }

  /// <summary>
  /// Verifies that a line item the new extraction no longer recognizes is dropped, and that an unmatched new line
  /// item starts from a clean per-item state rather than inheriting an unrelated product's analysis.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_UnrecognizedPreviousItem_DoesNotLeakAnalysisOntoNewItem()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Invoice invoice = harness.SeedInvoice();
    invoice.Items =
    [
      new Product
      {
        Name = "Bread",
        Quantity = 2m,
        QuantityUnit = "pcs",
        ProductCode = "BREAD-9",
        Price = 7.5m,
        Classification = ProcessingHarness.StaleGpcClassification(),
        AllergenAssessment = AllergenAssessment.NoSignals(Guid.CreateVersion7()),
        Metadata = new ProductMetadata { IsEdited = true, IsComplete = true },
      },
    ];

    harness.Analysis.ClaimableRun = AnalysisRun.CreateInvoice(
      invoice.id,
      invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Fast(),
      traceParent: null);
    harness.Analysis.InvoiceResult = ProcessingHarness.FullInvoiceResult() with
    {
      AllergenAssessmentResult = null,
      RecipeGenerationResult = null,
      CompletedCapabilities = new ReadOnlyCollection<AnalysisCapability>(
      [
        AnalysisCapability.DocumentExtraction,
        AnalysisCapability.MerchantResolution,
        AnalysisCapability.ProductClassification,
        AnalysisCapability.InvoiceClassification,
      ]),
    };

    // Act
    await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    // Assert
    Product persisted = harness.Invoices.UpdatedInvoices.Single().Items.Single();
    Assert.AreEqual("Milk", persisted.Name);
    Assert.IsNull(persisted.AllergenAssessment);
    Assert.IsFalse(persisted.Metadata.IsEdited);
    Assert.IsFalse(persisted.Metadata.IsComplete);
  }

  /// <summary>
  /// Verifies that a successful extraction returning zero products replaces the previously persisted line items,
  /// because an empty successful section is an authoritative result rather than a missing one.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_SuccessfulEmptyExtraction_ReplacesExistingItems()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Invoice invoice = harness.SeedInvoice();
    invoice.Items =
    [
      new Product
      {
        Name = "Milk",
        Quantity = 1m,
        QuantityUnit = "pcs",
        ProductCode = "MILK-1",
        Price = 4.5m,
        Classification = ProcessingHarness.GpcClassification(),
      },
    ];

    harness.Analysis.ClaimableRun = AnalysisRun.CreateInvoice(
      invoice.id,
      invoice.UserIdentifier,
      Guid.CreateVersion7(),
      InvoiceAnalysisOptions.Fast(),
      traceParent: null);
    harness.Analysis.InvoiceResult = ProcessingHarness.EmptyExtractionInvoiceResult();

    // Act
    await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    // Assert
    Assert.AreEqual(0, harness.Invoices.UpdatedInvoices.Single().Items.Count);
  }

  /// <summary>
  /// Verifies that duplicate line items sharing a product code are carried over in first-in-first-out order, so a
  /// repeated product never receives another occurrence's analysis.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_DuplicateProductCodes_CarriesOverInQueueOrder()
  {
    // Arrange
    var harness = new ProcessingHarness();
    Invoice invoice = harness.SeedInvoice();
    invoice.Items =
    [
      new Product
      {
        Name = "Milk",
        Quantity = 1m,
        QuantityUnit = "pcs",
        ProductCode = "MILK-1",
        Price = 4.5m,
        Metadata = new ProductMetadata { IsEdited = true },
      },
      new Product
      {
        Name = "Milk",
        Quantity = 1m,
        QuantityUnit = "pcs",
        ProductCode = "MILK-1",
        Price = 4.5m,
        Metadata = new ProductMetadata { IsComplete = true },
      },
    ];

    // Act
    List<Product> persisted = ExtractedProductReconciler.Reconcile(
      invoice.Items,
      [
        new ExtractedProduct("Milk", 1m, "pcs", "MILK-1", 4.5m, 0.95),
        new ExtractedProduct("Milk", 1m, "pcs", "MILK-1", 4.5m, 0.95),
      ]);

    // Assert
    Assert.AreEqual(2, persisted.Count);
    Assert.IsTrue(persisted[0].Metadata.IsEdited);
    Assert.IsFalse(persisted[0].Metadata.IsComplete);
    Assert.IsFalse(persisted[1].Metadata.IsEdited);
    Assert.IsTrue(persisted[1].Metadata.IsComplete);
  }

  /// <summary>
  /// Verifies that the persisted line items carry the OCR confidence reported by document extraction, which the
  /// shared extracted-product mapper is responsible for projecting onto product metadata.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_SuccessfulExtraction_PersistsOcrConfidenceOnProductMetadata()
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
    await harness.Service.TryExecuteNextRunAsync(LeaseOwner, CancellationToken.None).ConfigureAwait(false);

    // Assert
    Assert.AreEqual(0.95, harness.Invoices.UpdatedInvoices.Single().Items.Single().Metadata.Confidence);
  }

  #endregion

  private sealed class ProcessingHarness
  {
    internal ProcessingHarness(TimeSpan? renewalInterval = null)
    {
      Pipeline = new AnalysisPipelineHarness(renewalInterval);
      Timeline = Pipeline.Timeline;
      Invoices = Pipeline.AggregateBroker;
      Merchants = Pipeline.AggregateBroker;
      Analysis = new ProcessingAnalysisBoundary(Pipeline);
      Service = Pipeline.Service;
    }

    internal AnalysisPipelineHarness Pipeline { get; }

    internal List<string> Timeline { get; }

    internal InMemoryAggregateBroker Invoices { get; }

    internal InMemoryAggregateBroker Merchants { get; }

    internal ProcessingAnalysisBoundary Analysis { get; }

    internal AnalysisProcessingService Service { get; }

    internal Invoice SeedInvoice()
    {
      var invoice = new Invoice
      {
        id = Guid.CreateVersion7(),
        UserIdentifier = Guid.CreateVersion7(),
        Name = "Old name",
      };

      Pipeline.SeedInvoice(invoice);
      return invoice;
    }

    internal Merchant SeedMerchant(string name = "Seeded Merchant", Guid? parentCompanyId = null)
    {
      var merchant = new Merchant
      {
        id = Guid.CreateVersion7(),
        ParentCompanyId = parentCompanyId ?? Guid.CreateVersion7(),
        Name = name,
      };

      Pipeline.SeedMerchant(merchant);
      return merchant;
    }

    /// <summary>
    /// Builds a custom capability selection with document extraction enabled but merchant resolution disabled.
    /// </summary>
    /// <returns>A custom invoice analysis option set with merchant resolution off.</returns>
    internal static InvoiceAnalysisOptions ExtractionOnlyWithoutMerchantResolution() =>
      new(
        AnalysisProfile.Custom,
        documentExtraction: true,
        merchantResolution: false,
        invoiceSummary: false,
        productClassification: false,
        allergenAssessment: false,
        invoiceClassification: false,
        recipeGeneration: false,
        maximumRecipes: 0);

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

    internal static StandardClassification StaleGpcClassification() =>
      new(
        ClassificationSystem.Gs1Gpc,
        "2024",
        "99999999",
        "Stale GPC brick",
        [new ClassificationNode("brick", "99999999", "Stale GPC brick")],
        ClassificationOrigin.Analysis,
        0.2,
        []);

    internal static StandardClassification NaceClassification() =>
      new(
        ClassificationSystem.Nace21,
        "2.1",
        "01",
        "Crop and animal production, hunting and related service activities",
        [
          new ClassificationNode("section", "A", "AGRICULTURE, FORESTRY AND FISHING"),
          new ClassificationNode("division", "01", "Crop and animal production, hunting and related service activities"),
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

    /// <summary>
    /// Builds an invoice analysis result whose extraction succeeded but produced no line items.
    /// </summary>
    /// <returns>An invoice analysis result carrying an authoritative empty extraction.</returns>
    internal static InvoiceAnalysisResult EmptyExtractionInvoiceResult()
    {
      var extraction = new ReceiptExtractionResult(
        merchantCandidate: null,
        [],
        new PaymentInformation(),
        "receipt",
        "RO",
        [],
        []);

      return new InvoiceAnalysisResult(
        extraction,
        MerchantCandidateResult: null,
        SummaryResult: null,
        ProductClassificationResult: null,
        AllergenAssessmentResult: null,
        InvoiceClassificationResult: null,
        RecipeGenerationResult: null,
        new ReadOnlyCollection<AnalysisCapability>([AnalysisCapability.DocumentExtraction]));
    }

    /// <summary>
    /// Builds an invoice analysis result whose extraction produced two identical line items.
    /// </summary>
    /// <returns>An invoice analysis result carrying duplicate extracted products.</returns>
    internal static InvoiceAnalysisResult DuplicateProductInvoiceResult()
    {
      var extraction = new ReceiptExtractionResult(
        merchantCandidate: null,
        [
          new ExtractedProduct("Milk", 1m, "pcs", "MILK-1", 4.5m, 0.95),
          new ExtractedProduct("Milk", 1m, "pcs", "MILK-1", 4.5m, 0.95),
        ],
        new PaymentInformation(),
        "receipt",
        "RO",
        [],
        []);

      return new InvoiceAnalysisResult(
        extraction,
        MerchantCandidateResult: null,
        SummaryResult: null,
        ProductClassificationResult: null,
        AllergenAssessmentResult: null,
        InvoiceClassificationResult: null,
        RecipeGenerationResult: null,
        new ReadOnlyCollection<AnalysisCapability>([AnalysisCapability.DocumentExtraction]));
    }
  }

  private sealed class ProcessingAnalysisBoundary(AnalysisPipelineHarness pipeline)
  {
    internal int EnsureRunStoreCallCount => pipeline.RunBroker.EnsureStoreCallCount;

    internal IReadOnlyList<AnalysisRun> QueuedInvoiceRuns =>
      [.. pipeline.RunBroker.Runs.Where(run => run.TargetType == AnalysisTargetType.Invoice)];

    internal IReadOnlyList<AnalysisRun> QueuedMerchantRuns =>
      [.. pipeline.RunBroker.Runs.Where(run => run.TargetType == AnalysisTargetType.Merchant)];

    internal IReadOnlyList<AnalysisRun> CompletedRuns =>
      [.. pipeline.RunBroker.Runs.Where(run => run.Status == AnalysisRunStatus.Completed)];

    internal IReadOnlyList<AnalysisRun> FailedRuns =>
      [.. pipeline.RunBroker.Runs.Where(run => run.Status == AnalysisRunStatus.Failed)];

    internal AnalysisRun? ClaimableRun
    {
      get => pipeline.RunBroker.Runs.SingleOrDefault();
      set
      {
        pipeline.SetClaimableRun(value);
      }
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

    internal Exception? RenewalFailure
    {
      get => pipeline.RunBroker.RenewalFailure;
      set => pipeline.RunBroker.RenewalFailure = value;
    }

    internal int RenewalCount => pipeline.RunBroker.RenewalCount;

    internal Task BlockNextGenerativeInvocationAsync() => pipeline.GenerativeBroker.BlockNextInvocation();

    internal void ReleaseGenerativeInvocation() => pipeline.GenerativeBroker.ReleaseInvocation();
  }

}
