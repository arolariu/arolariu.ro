namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers branch-sensitive analysis-processing behavior through public worker and reconciliation contracts.
/// </summary>
[TestClass]
[DoNotParallelize]
public sealed class AnalysisProcessingRemainingBranchCoverageTests
{
  private const string RunOutcomeInstrument = "invoices.analysis.runs";

  /// <summary>
  /// Verifies the public successful completion path emits a terminal success outcome after a claimed run starts.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_CompletedRun_EmitsSuccessOutcome()
  {
    var scenario = new AnalysisProcessingScenario();
    AnalysisRun run = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.ClaimableRun = run;
    scenario.MerchantResult = MerchantResult(AnalysisCapability.MerchantClassification);

    using var recorder = new InvoiceMetricRecorder(RunOutcomeInstrument);
    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual(1, recorder.For(RunOutcomeInstrument).Count);
    Assert.IsNotNull(scenario.Runs.Runs.Single().StartedAt);
  }

  /// <summary>
  /// Verifies a real target persistence failure emits the bounded terminal failure outcome.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_TargetPersistenceFailure_EmitsFailureOutcome()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.MerchantResult = MerchantResult(AnalysisCapability.MerchantClassification);
    scenario.Aggregates.UpdateMerchantFailure = new InvalidOperationException("storage unavailable");

    using var recorder = new InvoiceMetricRecorder(RunOutcomeInstrument);
    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual(1, recorder.For(RunOutcomeInstrument).Count);
    Assert.AreEqual(AnalysisRunStatus.Failed, scenario.Runs.Runs.Single().Status);
  }

  /// <summary>
  /// Verifies a broker renewal failure is surfaced as a classified processing dependency failure.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_RenewLeaseBrokerFails_ThrowsAnalysisProcessingDependencyException()
  {
    var scenario = new AnalysisProcessingScenario(TimeSpan.FromMilliseconds(1));
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.MerchantResult = MerchantResult(AnalysisCapability.MerchantClassification);
    scenario.AnalyzeMerchantDelay = TimeSpan.FromMilliseconds(100);
    scenario.FailLeaseRenewal(new InvalidOperationException("lease lost"));

    await Assert.ThrowsExactlyAsync<AnalysisProcessingDependencyException>(
      () => scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None))
      .ConfigureAwait(false);
    Assert.IsTrue(scenario.Runs.RenewalAttemptCount >= 1);
  }

  /// <summary>
  /// Verifies a blocked external generative operation causes a real heartbeat renewal before completion.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_BlockedMerchantRun_RenewsLeaseBeforeCompletion()
  {
    var scenario = new AnalysisProcessingScenario(TimeSpan.FromMilliseconds(1));
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.MerchantResult = MerchantResult(AnalysisCapability.MerchantClassification);
    scenario.AnalyzeMerchantDelay = TimeSpan.FromMilliseconds(100);

    Assert.IsTrue(await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false));
    Assert.IsTrue(scenario.Runs.RenewalCount >= 1);
  }

  /// <summary>
  /// Verifies an immediate successful operation cancels the heartbeat before the first renewal interval elapses.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_FastMerchantRun_CancelsHeartbeatBeforeRenewal()
  {
    var scenario = new AnalysisProcessingScenario(TimeSpan.FromSeconds(1));
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.MerchantResult = MerchantResult(AnalysisCapability.MerchantClassification);

    Assert.IsTrue(await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false));

    Assert.AreEqual(0, scenario.Runs.RenewalAttemptCount);
  }

  /// <summary>
  /// Verifies a candidate whose normalized merchant name is empty does not create a merchant.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_MerchantCandidateNormalizesToEmpty_DoesNotCreateMerchant()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateInvoiceRun(scenario.Invoice);
    var extraction = new ReceiptExtractionResult(
      new MerchantCandidate("\u0301", "address", "phone", 0.9, 0.8, 0.7),
      [],
      new arolariu.Backend.Domain.Invoices.DDD.ValueObjects.PaymentInformation(),
      "receipt",
      "RO",
      [],
      []);
    scenario.InvoiceResult = new InvoiceAnalysisResult(
      extraction,
      extraction.MerchantCandidate,
      SummaryResult: null,
      ProductClassificationResult: null,
      AllergenAssessmentResult: null,
      InvoiceClassificationResult: null,
      RecipeGenerationResult: null,
      new ReadOnlyCollection<AnalysisCapability>([AnalysisCapability.DocumentExtraction, AnalysisCapability.MerchantResolution]));

    Assert.IsTrue(await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false));

    Assert.AreEqual(0, scenario.Aggregates.CreatedMerchants.Count);
  }

  /// <summary>
  /// Verifies public invoice worker behavior persists a no-signals allergen assessment.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_AllergenAssessment_UpdatesListBackedInvoiceItems()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateInvoiceRun(scenario.Invoice) with
    {
      InvoiceOptions = InvoiceAnalysisOptions.Balanced(),
    };
    scenario.InvoiceResult = InvoiceResultWithNoSignals();

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Product product = scenario.Aggregates.UpdatedInvoices.Single().Items.Single();
    Assert.AreEqual(AllergenAssessmentStatus.NoSignals, product.AllergenAssessment!.Status);
  }

  /// <summary>
  /// Verifies public product reconciliation works when the previous collection is not list-backed.
  /// </summary>
  [TestMethod]
  public void Reconcile_NonListPreviousItems_PreservesMatchingMetadata()
  {
    var previous = new Product
    {
      Name = "Milk",
      Quantity = 1m,
      ProductCode = "MILK-1",
      Price = 2m,
      Metadata = new ProductMetadata { IsComplete = true },
    };

    List<Product> reconciled = ExtractedProductReconciler.Reconcile(
      new HashSet<Product> { previous },
      [new ExtractedProduct("Milk", 1m, "pcs", "MILK-1", 2m, 0.9)]);

    Assert.IsTrue(reconciled.Single().Metadata.IsComplete);
  }

  /// <summary>
  /// Verifies product reconciliation builds fallback keys for previous products without a normalized name.
  /// </summary>
  [TestMethod]
  public void Reconcile_PreviousProductWithWhitespaceName_UsesEmptyNormalizedNameBranch()
  {
    var previous = new Product
    {
      Name = "   ",
      Quantity = 1m,
      ProductCode = string.Empty,
      Price = 2m,
      Metadata = new ProductMetadata { IsComplete = true },
    };

    List<Product> reconciled = ExtractedProductReconciler.Reconcile(
      [previous],
      [new ExtractedProduct("Milk", 1m, "pcs", string.Empty, 2m, 0.9)]);

    Assert.AreEqual(1, reconciled.Count);
    Assert.IsFalse(reconciled[0].Metadata.IsComplete);
  }

  private static MerchantAnalysisResult MerchantResult(params AnalysisCapability[] completedCapabilities) =>
    new(
      new MerchantClassificationResult(
        AnalysisProcessingTestData.Classification(ClassificationSystem.Nace21, "01")),
      DescriptionResult: null,
      new ReadOnlyCollection<AnalysisCapability>(completedCapabilities));

  private static InvoiceAnalysisResult InvoiceResultWithNoSignals()
  {
    ReceiptExtractionResult extraction = AnalysisProcessingTestData.CreateExtraction(
      AnalysisProcessingTestData.ExtractedProduct("Milk", "MILK-1"));
    var classifications = new ProductClassificationResult(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
    {
      ["product-0000"] = AnalysisProcessingTestData.Classification(ClassificationSystem.Gs1Gpc, "10000025"),
    });
    var allergens = new ProductAllergenAssessmentResult(new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal)
    {
      ["product-0000"] = ProductAllergenAssessment.NoSignalsInAvailableEvidence(),
    });

    return new InvoiceAnalysisResult(
      extraction,
      MerchantCandidateResult: null,
      SummaryResult: null,
      classifications,
      allergens,
      InvoiceClassificationResult: null,
      RecipeGenerationResult: null,
      new ReadOnlyCollection<AnalysisCapability>(
      [
        AnalysisCapability.DocumentExtraction,
        AnalysisCapability.ProductClassification,
        AnalysisCapability.AllergenAssessment,
      ]));
  }
}
