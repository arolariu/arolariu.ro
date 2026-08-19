namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies canonical classification workflows owned by Analysis Orchestration.
/// </summary>
[TestClass]
public sealed class AnalysisOrchestrationClassificationTests
{
  /// <summary>
  /// Verifies a manual classification from the wrong taxonomy is rejected before resolution.
  /// </summary>
  [TestMethod]
  public async Task ResolveManualClassificationAsync_MismatchedSystem_ThrowsValidationException()
  {
    StandardClassification classification = new(
      ClassificationSystem.Nace21,
      "2.1",
      "47.11",
      "Retail sale in non-specialised stores with food predominating",
      [new ClassificationNode("class", "47.11", "Retail sale in non-specialised stores with food predominating")],
      ClassificationOrigin.Manual,
      confidence: null,
      evidence: []);
    var service = new AnalysisOrchestrationService(
      Mock.Of<IAnalysisFoundationService>(),
      Mock.Of<IAnalysisQueueFoundationService>(),
      NullLoggerFactory.Instance);

    AnalysisOrchestrationValidationException exception =
      await Assert.ThrowsExactlyAsync<AnalysisOrchestrationValidationException>(() =>
        service.ResolveManualClassificationAsync(
          classification,
          ClassificationSystem.EcoicopV2,
          CancellationToken.None));

    Assert.IsInstanceOfType<TaxonomyCodeNotFoundException>(exception.InnerException);
  }
}
