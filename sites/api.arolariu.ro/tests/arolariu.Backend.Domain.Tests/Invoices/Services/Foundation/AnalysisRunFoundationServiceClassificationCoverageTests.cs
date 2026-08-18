namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.AnalysisRunBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Covers unclassified analysis-run foundation exception wrapping.
/// </summary>
[TestClass]
public sealed class AnalysisRunFoundationServiceClassificationCoverageTests
{
  /// <summary>
  /// Verifies plain exceptions from the broker are wrapped as analysis foundation service exceptions.
  /// </summary>
  [TestMethod]
  public async Task EnsureStoreAsync_UnclassifiedException_ThrowsAnalysisFoundationServiceException()
  {
    var broker = new Mock<IAnalysisRunBroker>();
    broker
      .Setup(item => item.EnsureContainerAsync(It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("plain failure"));
    var service = new AnalysisRunFoundationService(broker.Object, NullLoggerFactory.Instance);

    AnalysisFoundationServiceException exception = await Assert
      .ThrowsExactlyAsync<AnalysisFoundationServiceException>(() => service.EnsureStoreAsync(CancellationToken.None))
      .ConfigureAwait(false);

    Assert.IsInstanceOfType<InvalidOperationException>(exception.InnerException);
  }
}
