namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies <see cref="AnalysisOrchestrationService"/>'s constructor guards, run-infrastructure passthrough and
/// exception classification, cancellation propagation, and its best-effort invoice/merchant capability DAGs.
/// </summary>
[TestClass]
public sealed class AnalysisOrchestrationServiceTests
{
  private const string SampleTraceId = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";

  private static readonly string[] ComprehensiveInvoiceOrder =
    ["document", "merchant-resolution", "summary", "product-classification", "allergens", "invoice-classification", "recipes"];

  private static readonly string[] FastInvoiceOrder =
    ["document", "merchant-resolution", "product-classification", "invoice-classification"];

  private static readonly string[] BalancedInvoiceOrder =
    ["document", "merchant-resolution", "summary", "product-classification", "allergens", "invoice-classification"];

  private static readonly string[] ComprehensiveMerchantOrder = ["merchant-classification", "description-generation"];

  private static readonly string[] FastMerchantOrder = ["merchant-classification"];


  #region Constructor Tests

  /// <summary>Verifies the constructor throws when the analysis run foundation dependency is null.</summary>
  [TestMethod]
  public void Constructor_NullAnalysisRunFoundationService_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() =>
      new AnalysisOrchestrationService(
        null!,
        Mock.Of<IDocumentAnalysisFoundationService>(),
        Mock.Of<IGenerativeAnalysisFoundationService>(),
        NullLoggerFactory.Instance));

  /// <summary>Verifies the constructor throws when the document analysis foundation dependency is null.</summary>
  [TestMethod]
  public void Constructor_NullDocumentAnalysisFoundationService_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() =>
      new AnalysisOrchestrationService(
        Mock.Of<IAnalysisRunFoundationService>(),
        null!,
        Mock.Of<IGenerativeAnalysisFoundationService>(),
        NullLoggerFactory.Instance));

  /// <summary>Verifies the constructor throws when the generative analysis foundation dependency is null.</summary>
  [TestMethod]
  public void Constructor_NullGenerativeAnalysisFoundationService_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() =>
      new AnalysisOrchestrationService(
        Mock.Of<IAnalysisRunFoundationService>(),
        Mock.Of<IDocumentAnalysisFoundationService>(),
        null!,
        NullLoggerFactory.Instance));

  /// <summary>Verifies the constructor throws when the logger factory dependency is null.</summary>
  [TestMethod]
  public void Constructor_NullLoggerFactory_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() =>
      new AnalysisOrchestrationService(
        Mock.Of<IAnalysisRunFoundationService>(),
        Mock.Of<IDocumentAnalysisFoundationService>(),
        Mock.Of<IGenerativeAnalysisFoundationService>(),
        null!));

  #endregion

  #region Invoice DAG Tests

  /// <summary>
  /// Verifies that a comprehensive invoice analysis run completes independent stages (document extraction, then
  /// summary and product classification concurrently) before its dependent stages (allergens, invoice
  /// classification, recipes), in the exact order the DAG contract requires.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_Comprehensive_RunsIndependentStagesBeforeDependents()
  {
    AnalysisServiceHarness harness = AnalysisServiceHarness.Comprehensive();

    await harness.ExecuteInvoiceAsync(CancellationToken.None).ConfigureAwait(true);

    CollectionAssert.AreEqual(
      ComprehensiveInvoiceOrder,
      (System.Collections.ICollection)harness.CompletedCapabilities);
  }

  /// <summary>
  /// Verifies that a failed allergen assessment does not prevent the invoice summary and product classification
  /// sections — captured before the allergen stage runs — from being returned in the final result.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_AllergenFailure_StillReturnsSummaryAndClassifications()
  {
    AnalysisServiceHarness harness = AnalysisServiceHarness.WithFailedAllergens();

    InvoiceAnalysisResult result = await harness.ExecuteInvoiceAsync().ConfigureAwait(true);

    Assert.IsNotNull(result.SummaryResult);
    Assert.IsNotNull(result.ProductClassificationResult);
    Assert.IsNull(result.AllergenAssessmentResult);
  }

  /// <summary>
  /// Verifies that the fast invoice profile never invokes summary, allergen, or recipe capabilities, and that the
  /// completed-capabilities set contains only document extraction, product classification, and invoice
  /// classification.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_Fast_OnlyRunsExtractionClassificationAndInvoiceClassification()
  {
    AnalysisServiceHarness harness = AnalysisServiceHarness.Fast();

    InvoiceAnalysisResult result = await harness.ExecuteInvoiceAsync().ConfigureAwait(true);

    CollectionAssert.AreEqual(
      FastInvoiceOrder,
      (System.Collections.ICollection)harness.CompletedCapabilities);
    Assert.IsNull(result.SummaryResult);
    Assert.IsNull(result.AllergenAssessmentResult);
    Assert.IsNull(result.RecipeGenerationResult);
  }

  /// <summary>
  /// Verifies that the balanced invoice profile runs summary and allergen assessment (unlike fast) but never
  /// invokes recipe generation, matching the published balanced preset shape (<c>maximumRecipes=0</c>).
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_Balanced_RunsAllergensButSkipsRecipes()
  {
    AnalysisServiceHarness harness = AnalysisServiceHarness.Balanced();

    InvoiceAnalysisResult result = await harness.ExecuteInvoiceAsync().ConfigureAwait(true);

    CollectionAssert.AreEqual(
      BalancedInvoiceOrder,
      (System.Collections.ICollection)harness.CompletedCapabilities);
    Assert.IsNotNull(result.AllergenAssessmentResult);
    Assert.IsNull(result.RecipeGenerationResult);
  }

  /// <summary>
  /// Verifies that <see cref="InvoiceAnalysisResult.MerchantCandidateResult"/> is returned when
  /// <see cref="InvoiceAnalysisOptions.MerchantResolution"/> is enabled and document extraction succeeds, carrying
  /// through the merchant candidate observed during extraction unchanged.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_MerchantResolutionEnabledAndExtractionSucceeds_ReturnsMerchantCandidateResult()
  {
    AnalysisServiceHarness harness = AnalysisServiceHarness.Comprehensive();

    InvoiceAnalysisResult result = await harness.ExecuteInvoiceAsync().ConfigureAwait(true);

    Assert.IsNotNull(result.ExtractionResult);
    Assert.IsNotNull(result.MerchantCandidateResult);
    Assert.AreEqual("Test Merchant", result.MerchantCandidateResult!.Name);
  }

  /// <summary>
  /// Verifies that <see cref="InvoiceAnalysisResult.MerchantCandidateResult"/> is suppressed when
  /// <see cref="InvoiceAnalysisOptions.MerchantResolution"/> is disabled, even though document extraction still
  /// succeeds and observes a merchant candidate internally.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_MerchantResolutionDisabled_SuppressesMerchantCandidateResult()
  {
    InvoiceAnalysisOptions options = new(
      AnalysisProfile.Custom,
      documentExtraction: true,
      merchantResolution: false,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0);

    AnalysisServiceHarness harness = AnalysisServiceHarness.ForInvoice(
      options, new HashSet<string>(StringComparer.Ordinal));

    InvoiceAnalysisResult result = await harness.ExecuteInvoiceAsync().ConfigureAwait(true);

    Assert.IsNotNull(result.ExtractionResult);
    Assert.IsNull(result.MerchantCandidateResult);
  }

  /// <summary>
  /// Verifies that a null <see cref="AnalysisRun"/> argument throws <see cref="ArgumentNullException"/> without
  /// being reclassified into an orchestration exception (best-effort methods propagate their own validation bare).
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_NullRun_ThrowsArgumentNullException()
  {
    AnalysisServiceHarness harness = AnalysisServiceHarness.Comprehensive();

    await Assert.ThrowsExactlyAsync<ArgumentNullException>(
      () => harness.Service.AnalyzeInvoiceAsync(null!, harness.Invoice, CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that a run whose <see cref="AnalysisRun.InvoiceOptions"/> is unset (a merchant-targeted run supplied
  /// to the invoice DAG by mistake) throws a bare <see cref="ArgumentException"/>, never a wrapped orchestration
  /// exception.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_RunWithoutInvoiceOptions_ThrowsArgumentException()
  {
    AnalysisServiceHarness harness = AnalysisServiceHarness.ComprehensiveMerchant();

    await Assert.ThrowsExactlyAsync<ArgumentException>(
      () => harness.Service.AnalyzeInvoiceAsync(harness.Run, harness.Invoice, CancellationToken.None)).ConfigureAwait(true);
  }

  #endregion

  #region Merchant DAG Tests

  /// <summary>
  /// Verifies that a comprehensive merchant analysis run executes NACE classification and description generation,
  /// both of which are independent and therefore both recorded as completed.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeMerchantAsync_Comprehensive_RunsClassificationAndDescriptionConcurrently()
  {
    AnalysisServiceHarness harness = AnalysisServiceHarness.ComprehensiveMerchant();

    MerchantAnalysisResult result = await harness.ExecuteMerchantAsync().ConfigureAwait(true);

    CollectionAssert.AreEqual(
      ComprehensiveMerchantOrder,
      (System.Collections.ICollection)harness.CompletedCapabilities);
    Assert.IsNotNull(result.ClassificationResult);
    Assert.IsNotNull(result.DescriptionResult);
  }

  /// <summary>
  /// Verifies that a failed NACE classification does not prevent the independently-started description generation
  /// from still producing a usable result — the two merchant capabilities fail independently.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeMerchantAsync_ClassificationFailure_StillReturnsDescription()
  {
    AnalysisServiceHarness harness = AnalysisServiceHarness.ForMerchant(
      MerchantAnalysisOptions.Comprehensive(),
      new HashSet<string>(StringComparer.Ordinal) { "merchant-classification" });

    MerchantAnalysisResult result = await harness.ExecuteMerchantAsync().ConfigureAwait(true);

    Assert.IsNull(result.ClassificationResult);
    Assert.IsNotNull(result.DescriptionResult);
  }

  /// <summary>
  /// Verifies that the fast merchant profile runs only NACE classification, never description generation.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeMerchantAsync_Fast_OnlyRunsClassification()
  {
    AnalysisServiceHarness harness = AnalysisServiceHarness.ForMerchant(
      MerchantAnalysisOptions.Fast(),
      new HashSet<string>(StringComparer.Ordinal));

    MerchantAnalysisResult result = await harness.ExecuteMerchantAsync().ConfigureAwait(true);

    CollectionAssert.AreEqual(
      FastMerchantOrder,
      (System.Collections.ICollection)harness.CompletedCapabilities);
    Assert.IsNotNull(result.ClassificationResult);
    Assert.IsNull(result.DescriptionResult);
  }

  #endregion

  #region Cancellation Passthrough Tests

  /// <summary>
  /// Verifies that <see cref="OperationCanceledException"/> raised by a best-effort document extraction call
  /// propagates unchanged from <see cref="AnalysisOrchestrationService.AnalyzeInvoiceAsync"/> instead of being
  /// swallowed as a best-effort capability failure or reclassified into an orchestration exception.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_WhenDocumentExtractionCancels_PropagatesOperationCanceledException()
  {
    var documentAnalysis = new Mock<IDocumentAnalysisFoundationService>();
    documentAnalysis
      .Setup(d => d.ExtractInvoiceAsync(It.IsAny<IReadOnlyList<InvoiceScan>>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var service = new AnalysisOrchestrationService(
      Mock.Of<IAnalysisRunFoundationService>(),
      documentAnalysis.Object,
      Mock.Of<IGenerativeAnalysisFoundationService>(),
      NullLoggerFactory.Instance);

    AnalysisRun run = AnalysisRun.CreateInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      traceParent: null);
    var invoice = new Invoice { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() };

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.AnalyzeInvoiceAsync(run, invoice, CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="OperationCanceledException"/> raised by the run foundation service propagates
  /// unchanged from <see cref="AnalysisOrchestrationService.EnsureRunStoreAsync"/> instead of being reclassified
  /// into an <see cref="AnalysisOrchestrationServiceException"/>.
  /// </summary>
  [TestMethod]
  public async Task EnsureRunStoreAsync_WhenFoundationCancels_PropagatesOperationCanceledException()
  {
    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.EnsureStoreAsync(It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var service = new AnalysisOrchestrationService(
      analysisRunFoundation.Object,
      Mock.Of<IDocumentAnalysisFoundationService>(),
      Mock.Of<IGenerativeAnalysisFoundationService>(),
      NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.EnsureRunStoreAsync(CancellationToken.None)).ConfigureAwait(true);
  }

  #endregion

  #region Run Infrastructure Passthrough and Exception Classification Tests

  /// <summary>
  /// Verifies that <see cref="AnalysisOrchestrationService.EnsureRunStoreAsync"/> delegates to the analysis run
  /// foundation service.
  /// </summary>
  [TestMethod]
  public async Task EnsureRunStoreAsync_Always_DelegatesToFoundationService()
  {
    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.EnsureStoreAsync(It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);

    var service = new AnalysisOrchestrationService(
      analysisRunFoundation.Object,
      Mock.Of<IDocumentAnalysisFoundationService>(),
      Mock.Of<IGenerativeAnalysisFoundationService>(),
      NullLoggerFactory.Instance);

    await service.EnsureRunStoreAsync(CancellationToken.None).ConfigureAwait(true);

    analysisRunFoundation.Verify(a => a.EnsureStoreAsync(It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Verifies that an unclassified exception raised by the run foundation service is wrapped into an
  /// <see cref="AnalysisOrchestrationServiceException"/> by the run-infrastructure passthrough methods (which,
  /// unlike the best-effort DAG methods, always classify their failures).
  /// </summary>
  [TestMethod]
  public async Task EnsureRunStoreAsync_WhenFoundationThrowsUnknown_ThrowsAnalysisOrchestrationServiceException()
  {
    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.EnsureStoreAsync(It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("boom"));

    var service = new AnalysisOrchestrationService(
      analysisRunFoundation.Object,
      Mock.Of<IDocumentAnalysisFoundationService>(),
      Mock.Of<IGenerativeAnalysisFoundationService>(),
      NullLoggerFactory.Instance);

    var ex = await Assert.ThrowsExactlyAsync<AnalysisOrchestrationServiceException>(
      () => service.EnsureRunStoreAsync(CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<InvalidOperationException>(ex.InnerException);
  }

  /// <summary>
  /// Verifies that <see cref="AnalysisOrchestrationService.QueueInvoiceRunAsync"/> resolves the named
  /// <see cref="AnalysisProfile.Fast"/> preset into its effective options exactly once at queue time, and persists
  /// those already-resolved effective options on the created run — never the caller-supplied options as-is when
  /// they differ from the canonical preset, and never deferred/recomputed at claim time.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceRunAsync_FastProfile_PersistsResolvedFastPresetOptions()
  {
    AnalysisRun? persistedRun = null;

    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.CreateRunAsync(It.IsAny<AnalysisRun>(), It.IsAny<CancellationToken>()))
      .Callback<AnalysisRun, CancellationToken>((run, _) => persistedRun = run)
      .ReturnsAsync((AnalysisRun run, CancellationToken _) => run);

    var service = new AnalysisOrchestrationService(
      analysisRunFoundation.Object,
      Mock.Of<IDocumentAnalysisFoundationService>(),
      Mock.Of<IGenerativeAnalysisFoundationService>(),
      NullLoggerFactory.Instance);

    await service.QueueInvoiceRunAsync(
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      SampleTraceId,
      CancellationToken.None).ConfigureAwait(true);

    Assert.IsNotNull(persistedRun);
    Assert.IsNotNull(persistedRun.InvoiceOptions);
    Assert.AreEqual(AnalysisProfile.Fast, persistedRun.InvoiceOptions!.Profile);
    Assert.IsTrue(persistedRun.InvoiceOptions.DocumentExtraction);
    Assert.IsFalse(persistedRun.InvoiceOptions.InvoiceSummary);
    Assert.IsFalse(persistedRun.InvoiceOptions.AllergenAssessment);
    Assert.AreEqual(0, persistedRun.InvoiceOptions.MaximumRecipes);
  }

  /// <summary>
  /// Verifies that <see cref="AnalysisOrchestrationService.QueueMerchantRunAsync"/> accepts
  /// <see cref="Guid.Empty"/> as a legitimate merchant partition and persists it verbatim on the queued run.
  /// </summary>
  /// <remarks>
  /// <para><b>Why this is not a validation failure:</b> <c>Merchant.ParentCompanyId</c> defaults to
  /// <see cref="Guid.Empty"/> and is the real Cosmos partition key for every independent merchant, including every
  /// merchant auto-created during invoice analysis. Rejecting it here made the merchant analyze route permanently
  /// unusable for exactly those merchants.</para>
  /// </remarks>
  [TestMethod]
  public async Task QueueMerchantRunAsync_EmptyParentCompanyId_PersistsEmptyTargetPartitionIdentifier()
  {
    AnalysisRun? persistedRun = null;

    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.CreateRunAsync(It.IsAny<AnalysisRun>(), It.IsAny<CancellationToken>()))
      .Callback<AnalysisRun, CancellationToken>((run, _) => persistedRun = run)
      .ReturnsAsync((AnalysisRun run, CancellationToken _) => run);

    var service = CreateService(analysisRunFoundation.Object);

    AnalysisRun queued = await service.QueueMerchantRunAsync(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.Empty,
      MerchantAnalysisOptions.Comprehensive(),
      SampleTraceId,
      CancellationToken.None).ConfigureAwait(true);

    Assert.IsNotNull(persistedRun);
    Assert.AreEqual(Guid.Empty, persistedRun.TargetPartitionIdentifier);
    Assert.AreEqual(Guid.Empty, queued.TargetPartitionIdentifier);
    Assert.AreEqual(AnalysisRunStatus.Queued, queued.Status);
  }

  /// <summary>
  /// Verifies that <see cref="AnalysisOrchestrationService.QueueMerchantRunAsync"/> persists the supplied
  /// <c>parentCompanyId</c> onto the created run's <see cref="AnalysisRun.TargetPartitionIdentifier"/>, so a later
  /// Task 11 point-update against the merchant's partition does not need to re-resolve the partition scope.
  /// </summary>
  [TestMethod]
  public async Task QueueMerchantRunAsync_ValidParentCompanyId_PersistsTargetPartitionIdentifier()
  {
    AnalysisRun? persistedRun = null;
    Guid parentCompanyId = Guid.NewGuid();

    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.CreateRunAsync(It.IsAny<AnalysisRun>(), It.IsAny<CancellationToken>()))
      .Callback<AnalysisRun, CancellationToken>((run, _) => persistedRun = run)
      .ReturnsAsync((AnalysisRun run, CancellationToken _) => run);

    var service = CreateService(analysisRunFoundation.Object);

    await service.QueueMerchantRunAsync(
      Guid.NewGuid(),
      Guid.NewGuid(),
      parentCompanyId,
      MerchantAnalysisOptions.Comprehensive(),
      SampleTraceId,
      CancellationToken.None).ConfigureAwait(true);

    Assert.IsNotNull(persistedRun);
    Assert.AreEqual(parentCompanyId, persistedRun.TargetPartitionIdentifier);
  }

  #endregion

  #region Run Infrastructure Delegation and Exception Classification (Claim / Renew / Complete / Fail)

  /// <summary>
  /// Verifies that <see cref="AnalysisOrchestrationService.ClaimNextRunAsync"/> delegates its arguments unchanged
  /// to the run foundation service and returns the claimed run as-is.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_Always_DelegatesToFoundationServiceAndReturnsClaimedRun()
  {
    AnalysisRun expected = AnalysisRunTestBuilder.Queued();
    DateTimeOffset now = DateTimeOffset.UtcNow;
    TimeSpan leaseDuration = TimeSpan.FromMinutes(5);

    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.ClaimNextRunAsync("worker-a", now, leaseDuration, It.IsAny<CancellationToken>()))
      .ReturnsAsync(expected);

    var service = CreateService(analysisRunFoundation.Object);

    AnalysisRun? claimed = await service.ClaimNextRunAsync("worker-a", now, leaseDuration, CancellationToken.None).ConfigureAwait(true);

    Assert.AreSame(expected, claimed);
    analysisRunFoundation.Verify(
      a => a.ClaimNextRunAsync("worker-a", now, leaseDuration, It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Verifies that an unclassified exception raised by the run foundation service during
  /// <see cref="AnalysisOrchestrationService.ClaimNextRunAsync"/> is wrapped into an
  /// <see cref="AnalysisOrchestrationServiceException"/>.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_WhenFoundationThrowsUnknown_ThrowsAnalysisOrchestrationServiceException()
  {
    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.ClaimNextRunAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("boom"));

    var service = CreateService(analysisRunFoundation.Object);

    var ex = await Assert.ThrowsExactlyAsync<AnalysisOrchestrationServiceException>(
      () => service.ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<InvalidOperationException>(ex.InnerException);
  }

  /// <summary>
  /// Verifies that <see cref="OperationCanceledException"/> raised by the run foundation service propagates
  /// unchanged from <see cref="AnalysisOrchestrationService.ClaimNextRunAsync"/> — the one run-infrastructure
  /// method whose foundation call returns a nullable result, exercising a distinct generic <c>TryCatchAsync</c>
  /// instantiation from <see cref="EnsureRunStoreAsync_WhenFoundationCancels_PropagatesOperationCanceledException"/>.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_WhenFoundationCancels_PropagatesOperationCanceledException()
  {
    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.ClaimNextRunAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var service = CreateService(analysisRunFoundation.Object);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.ClaimNextRunAsync("worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="AnalysisOrchestrationService.RenewRunLeaseAsync"/> delegates its arguments unchanged
  /// to the run foundation service.
  /// </summary>
  [TestMethod]
  public async Task RenewRunLeaseAsync_Always_DelegatesToFoundationService()
  {
    Guid runId = Guid.NewGuid();
    DateTimeOffset now = DateTimeOffset.UtcNow;
    TimeSpan leaseDuration = TimeSpan.FromMinutes(10);

    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.RenewLeaseAsync(runId, "worker-a", now, leaseDuration, It.IsAny<CancellationToken>()))
      .ReturnsAsync(AnalysisRunTestBuilder.ActiveRunning());

    var service = CreateService(analysisRunFoundation.Object);

    await service.RenewRunLeaseAsync(runId, "worker-a", now, leaseDuration, CancellationToken.None).ConfigureAwait(true);

    analysisRunFoundation.Verify(
      a => a.RenewLeaseAsync(runId, "worker-a", now, leaseDuration, It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Verifies that an unclassified exception raised by the run foundation service during
  /// <see cref="AnalysisOrchestrationService.RenewRunLeaseAsync"/> is wrapped into an
  /// <see cref="AnalysisOrchestrationServiceException"/>.
  /// </summary>
  [TestMethod]
  public async Task RenewRunLeaseAsync_WhenFoundationThrowsUnknown_ThrowsAnalysisOrchestrationServiceException()
  {
    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.RenewLeaseAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("boom"));

    var service = CreateService(analysisRunFoundation.Object);

    var ex = await Assert.ThrowsExactlyAsync<AnalysisOrchestrationServiceException>(
      () => service.RenewRunLeaseAsync(Guid.NewGuid(), "worker-a", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<InvalidOperationException>(ex.InnerException);
  }

  /// <summary>
  /// Verifies that <see cref="AnalysisOrchestrationService.CompleteRunAsync"/> delegates its arguments unchanged
  /// to the run foundation service.
  /// </summary>
  [TestMethod]
  public async Task CompleteRunAsync_Always_DelegatesToFoundationService()
  {
    Guid runId = Guid.NewGuid();
    DateTimeOffset completedAt = DateTimeOffset.UtcNow;
    AnalysisCapability[] completedCapabilities = [AnalysisCapability.DocumentExtraction];

    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.CompleteRunAsync(runId, "worker-a", completedCapabilities, completedAt, It.IsAny<CancellationToken>()))
      .ReturnsAsync(AnalysisRunTestBuilder.Terminal(AnalysisRunStatus.Completed));

    var service = CreateService(analysisRunFoundation.Object);

    await service.CompleteRunAsync(runId, "worker-a", completedCapabilities, completedAt, CancellationToken.None).ConfigureAwait(true);

    analysisRunFoundation.Verify(
      a => a.CompleteRunAsync(runId, "worker-a", completedCapabilities, completedAt, It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Verifies that an unclassified exception raised by the run foundation service during
  /// <see cref="AnalysisOrchestrationService.CompleteRunAsync"/> is wrapped into an
  /// <see cref="AnalysisOrchestrationServiceException"/>.
  /// </summary>
  [TestMethod]
  public async Task CompleteRunAsync_WhenFoundationThrowsUnknown_ThrowsAnalysisOrchestrationServiceException()
  {
    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.CompleteRunAsync(
        It.IsAny<Guid>(),
        It.IsAny<string>(),
        It.IsAny<IReadOnlyCollection<AnalysisCapability>>(),
        It.IsAny<DateTimeOffset>(),
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("boom"));

    var service = CreateService(analysisRunFoundation.Object);

    var ex = await Assert.ThrowsExactlyAsync<AnalysisOrchestrationServiceException>(
      () => service.CompleteRunAsync(
        Guid.NewGuid(),
        "worker-a",
        [AnalysisCapability.DocumentExtraction],
        DateTimeOffset.UtcNow,
        CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<InvalidOperationException>(ex.InnerException);
  }

  /// <summary>
  /// Verifies that <see cref="AnalysisOrchestrationService.FailRunAsync"/> delegates its arguments unchanged to
  /// the run foundation service.
  /// </summary>
  [TestMethod]
  public async Task FailRunAsync_Always_DelegatesToFoundationService()
  {
    Guid runId = Guid.NewGuid();
    DateTimeOffset failedAt = DateTimeOffset.UtcNow;

    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.FailRunAsync(runId, "worker-a", "boom", failedAt, It.IsAny<CancellationToken>()))
      .ReturnsAsync(AnalysisRunTestBuilder.Terminal(AnalysisRunStatus.Failed));

    var service = CreateService(analysisRunFoundation.Object);

    await service.FailRunAsync(runId, "worker-a", "boom", failedAt, CancellationToken.None).ConfigureAwait(true);

    analysisRunFoundation.Verify(
      a => a.FailRunAsync(runId, "worker-a", "boom", failedAt, It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Verifies that an unclassified exception raised by the run foundation service during
  /// <see cref="AnalysisOrchestrationService.FailRunAsync"/> is wrapped into an
  /// <see cref="AnalysisOrchestrationServiceException"/>.
  /// </summary>
  [TestMethod]
  public async Task FailRunAsync_WhenFoundationThrowsUnknown_ThrowsAnalysisOrchestrationServiceException()
  {
    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.FailRunAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("boom"));

    var service = CreateService(analysisRunFoundation.Object);

    var ex = await Assert.ThrowsExactlyAsync<AnalysisOrchestrationServiceException>(
      () => service.FailRunAsync(Guid.NewGuid(), "worker-a", "boom", DateTimeOffset.UtcNow, CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<InvalidOperationException>(ex.InnerException);
  }

  /// <summary>
  /// Verifies that <see cref="AnalysisOrchestrationService.CountPendingRunsAsync"/> delegates its arguments
  /// unchanged to the run foundation service and returns the pending-run counts as-is.
  /// </summary>
  [TestMethod]
  public async Task CountPendingRunsAsync_Always_DelegatesToFoundationServiceAndReturnsCounts()
  {
    DateTimeOffset now = DateTimeOffset.UtcNow;
    IReadOnlyDictionary<AnalysisTargetType, long> expected = new Dictionary<AnalysisTargetType, long>
    {
      [AnalysisTargetType.Invoice] = 3,
      [AnalysisTargetType.Merchant] = 1,
    };

    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.CountPendingRunsAsync(now, It.IsAny<CancellationToken>()))
      .ReturnsAsync(expected);

    var service = CreateService(analysisRunFoundation.Object);

    IReadOnlyDictionary<AnalysisTargetType, long> pending = await service
      .CountPendingRunsAsync(now, CancellationToken.None)
      .ConfigureAwait(true);

    Assert.AreSame(expected, pending);
    analysisRunFoundation.Verify(a => a.CountPendingRunsAsync(now, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Verifies that an unclassified exception raised by the run foundation service during
  /// <see cref="AnalysisOrchestrationService.CountPendingRunsAsync"/> is wrapped into an
  /// <see cref="AnalysisOrchestrationServiceException"/>.
  /// </summary>
  [TestMethod]
  public async Task CountPendingRunsAsync_WhenFoundationThrowsUnknown_ThrowsAnalysisOrchestrationServiceException()
  {
    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    analysisRunFoundation
      .Setup(a => a.CountPendingRunsAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("boom"));

    var service = CreateService(analysisRunFoundation.Object);

    var ex = await Assert.ThrowsExactlyAsync<AnalysisOrchestrationServiceException>(
      () => service.CountPendingRunsAsync(DateTimeOffset.UtcNow, CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<InvalidOperationException>(ex.InnerException);
  }

  private static AnalysisOrchestrationService CreateService(IAnalysisRunFoundationService analysisRunFoundationService) =>
    new(
      analysisRunFoundationService,
      Mock.Of<IDocumentAnalysisFoundationService>(),
      Mock.Of<IGenerativeAnalysisFoundationService>(),
      NullLoggerFactory.Instance);

  #endregion

  #region Trace identifier validation

  /// <summary>
  /// Verifies that an absent trace identifier is rejected before an invoice run is persisted.
  /// </summary>
  /// <remarks>
  /// <para>A run without a usable trace identifier is unjoinable: nothing downstream can correlate the worker's
  /// execution back to the request that asked for it. Rejecting it at the boundary is cheaper than persisting a run
  /// that can never be traced.</para>
  /// </remarks>
  /// <param name="traceId">The rejected trace identifier.</param>
  /// <returns>Asynchronous task.</returns>
  [TestMethod]
  [DataRow(null)]
  [DataRow("")]
  [DataRow("   ")]
  public async Task QueueInvoiceRunAsync_MissingTraceId_RejectsBeforePersistence(string? traceId)
  {
    // Arrange
    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    AnalysisOrchestrationService service = CreateService(analysisRunFoundation.Object);

    // Act + Assert
    await Assert.ThrowsExactlyAsync<AnalysisOrchestrationValidationException>(
      () => service.QueueInvoiceRunAsync(
        Guid.NewGuid(),
        Guid.NewGuid(),
        InvoiceAnalysisOptions.Fast(),
        traceId!,
        CancellationToken.None)).ConfigureAwait(true);

    analysisRunFoundation.Verify(
      a => a.CreateRunAsync(It.IsAny<AnalysisRun>(), It.IsAny<CancellationToken>()),
      Times.Never,
      "A run without a usable trace identifier must never reach the store.");
  }

  /// <summary>
  /// Verifies that an absent trace identifier is rejected before a merchant run is persisted.
  /// </summary>
  /// <param name="traceId">The rejected trace identifier.</param>
  /// <returns>Asynchronous task.</returns>
  [TestMethod]
  [DataRow(null)]
  [DataRow("")]
  [DataRow("   ")]
  public async Task QueueMerchantRunAsync_MissingTraceId_RejectsBeforePersistence(string? traceId)
  {
    // Arrange
    var analysisRunFoundation = new Mock<IAnalysisRunFoundationService>();
    AnalysisOrchestrationService service = CreateService(analysisRunFoundation.Object);

    // Act + Assert
    await Assert.ThrowsExactlyAsync<AnalysisOrchestrationValidationException>(
      () => service.QueueMerchantRunAsync(
        Guid.NewGuid(),
        Guid.NewGuid(),
        Guid.Empty,
        MerchantAnalysisOptions.Comprehensive(),
        traceId!,
        CancellationToken.None)).ConfigureAwait(true);

    analysisRunFoundation.Verify(
      a => a.CreateRunAsync(It.IsAny<AnalysisRun>(), It.IsAny<CancellationToken>()),
      Times.Never,
      "A run without a usable trace identifier must never reach the store.");
  }

  #endregion
}
