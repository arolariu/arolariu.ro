namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System.Collections.ObjectModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Verifies merchant patch application through the public real-layer processing pipeline.
/// </summary>
[TestClass]
[DoNotParallelize]
public sealed class AnalysisProcessingMerchantApplyTests
{
  /// <summary>
  /// Verifies unavailable merchant capabilities leave persisted enrichment unchanged.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_NoSections_LeavesMerchantUnchanged()
  {
    var scenario = new AnalysisProcessingScenario();
    string originalDescription = scenario.Merchant.Description;
    scenario.ClaimableRun = AnalysisProcessingTestData.CreateMerchantRun(scenario.Merchant);
    scenario.MerchantResult = new MerchantAnalysisResult(
      ClassificationResult: null,
      DescriptionResult: null,
      new ReadOnlyCollection<AnalysisCapability>([]));

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsNull(scenario.Aggregates.UpdatedMerchants.Single().Classification);
    Assert.AreEqual(originalDescription, scenario.Aggregates.UpdatedMerchants.Single().Description);
  }

  /// <summary>
  /// Verifies classification and generated description are both persisted when both capabilities succeed.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_AllSectionsPresent_AppliesClassificationAndDescription()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisRun.CreateMerchant(
      scenario.Merchant.id,
      scenario.Merchant.ParentCompanyId,
      System.Guid.CreateVersion7(),
      scenario.Merchant.ParentCompanyId,
      MerchantAnalysisOptions.Comprehensive(),
      traceParent: null);
    scenario.MerchantResult = Result(
      new MerchantClassificationResult(AnalysisProcessingTestData.Classification(ClassificationSystem.Nace21, "01")),
      new MerchantDescriptionResult("A concise grocery merchant."));

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual("01", scenario.Aggregates.UpdatedMerchants.Single().Classification!.Code);
    Assert.AreEqual("A concise grocery merchant.", scenario.Aggregates.UpdatedMerchants.Single().Description);
  }

  /// <summary>
  /// Verifies a classification-only result preserves the prior description.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_OnlyClassificationPresent_PreservesExistingDescription()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.ClaimableRun = AnalysisRun.CreateMerchant(
      scenario.Merchant.id,
      scenario.Merchant.ParentCompanyId,
      System.Guid.CreateVersion7(),
      scenario.Merchant.ParentCompanyId,
      MerchantAnalysisOptions.Comprehensive(),
      traceParent: null);
    scenario.MerchantResult = Result(
      new MerchantClassificationResult(AnalysisProcessingTestData.Classification(ClassificationSystem.Nace21, "01")),
      descriptionResult: null);

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual("01", scenario.Aggregates.UpdatedMerchants.Single().Classification!.Code);
    Assert.AreEqual("Original merchant description", scenario.Aggregates.UpdatedMerchants.Single().Description);
  }

  /// <summary>
  /// Verifies a description-only result preserves the prior classification.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_OnlyDescriptionPresent_PreservesExistingClassification()
  {
    var scenario = new AnalysisProcessingScenario();
    scenario.Merchant.Classification = AnalysisProcessingTestData.Classification(ClassificationSystem.Nace21, "01");
    scenario.ClaimableRun = AnalysisRun.CreateMerchant(
      scenario.Merchant.id,
      scenario.Merchant.ParentCompanyId,
      System.Guid.CreateVersion7(),
      scenario.Merchant.ParentCompanyId,
      MerchantAnalysisOptions.Comprehensive(),
      traceParent: null);
    scenario.MerchantResult = Result(
      classificationResult: null,
      new MerchantDescriptionResult("Updated merchant description."));

    await scenario.Service.TryExecuteNextRunAsync(AnalysisProcessingTestData.LeaseOwner, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual("01", scenario.Aggregates.UpdatedMerchants.Single().Classification!.Code);
    Assert.AreEqual("Updated merchant description.", scenario.Aggregates.UpdatedMerchants.Single().Description);
  }

  private static MerchantAnalysisResult Result(
    MerchantClassificationResult? classificationResult,
    MerchantDescriptionResult? descriptionResult)
  {
    var completedCapabilities = new System.Collections.Generic.List<AnalysisCapability>();

    if (classificationResult is not null)
    {
      completedCapabilities.Add(AnalysisCapability.MerchantClassification);
    }

    if (descriptionResult is not null)
    {
      completedCapabilities.Add(AnalysisCapability.DescriptionGeneration);
    }

    return new MerchantAnalysisResult(
      classificationResult,
      descriptionResult,
      new ReadOnlyCollection<AnalysisCapability>(completedCapabilities));
  }
}
