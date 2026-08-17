namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers merchant analysis DAG branches with custom merchant capability selections.
/// </summary>
[TestClass]
public sealed class AnalysisOrchestrationMerchantCoverageTests
{
  /// <summary>
  /// Verifies merchant analysis can run description generation without merchant classification.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeMerchantAsync_DescriptionOnly_RunsDescriptionAndSuppressesClassification()
  {
    var options = new MerchantAnalysisOptions(
      AnalysisProfile.Custom,
      merchantClassification: false,
      descriptionGeneration: true);
    AnalysisServiceHarness harness = AnalysisServiceHarness.ForMerchant(
      options,
      new HashSet<string>(StringComparer.Ordinal));

    MerchantAnalysisResult result = await harness.ExecuteMerchantAsync().ConfigureAwait(false);

    Assert.IsNull(result.ClassificationResult);
    Assert.IsNotNull(result.DescriptionResult);
    AnalysisCapability[] completedCapabilities = [.. result.CompletedCapabilities];

    Assert.AreEqual(1, completedCapabilities.Length);
    Assert.AreEqual(AnalysisCapability.DescriptionGeneration, completedCapabilities[0]);
  }

  /// <summary>
  /// Verifies merchant analysis returns an empty best-effort result when a custom run disables both capabilities.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeMerchantAsync_AllCapabilitiesDisabled_ReturnsEmptyResult()
  {
    var options = new MerchantAnalysisOptions(
      AnalysisProfile.Custom,
      merchantClassification: false,
      descriptionGeneration: false);
    AnalysisServiceHarness harness = AnalysisServiceHarness.ForMerchant(
      options,
      new HashSet<string>(StringComparer.Ordinal));

    MerchantAnalysisResult result = await harness.ExecuteMerchantAsync().ConfigureAwait(false);

    Assert.IsNull(result.ClassificationResult);
    Assert.IsNull(result.DescriptionResult);
    Assert.AreEqual(0, result.CompletedCapabilities.Count);
  }

  /// <summary>
  /// Verifies null merchant arguments propagate as argument null exceptions from the merchant DAG.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeMerchantAsync_NullMerchant_ThrowsArgumentNullException()
  {
    AnalysisServiceHarness harness = AnalysisServiceHarness.ComprehensiveMerchant();

    await Assert.ThrowsExactlyAsync<ArgumentNullException>(() =>
      harness.Service.AnalyzeMerchantAsync(harness.Run, null!, CancellationToken.None)).ConfigureAwait(false);
  }

  /// <summary>
  /// Verifies invoice-targeted runs are rejected by the merchant DAG before capability execution.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeMerchantAsync_RunWithoutMerchantOptions_ThrowsArgumentException()
  {
    AnalysisServiceHarness harness = AnalysisServiceHarness.Comprehensive();

    await Assert.ThrowsExactlyAsync<ArgumentException>(() =>
      harness.Service.AnalyzeMerchantAsync(harness.Run, harness.Merchant, CancellationToken.None)).ConfigureAwait(false);
  }
}


