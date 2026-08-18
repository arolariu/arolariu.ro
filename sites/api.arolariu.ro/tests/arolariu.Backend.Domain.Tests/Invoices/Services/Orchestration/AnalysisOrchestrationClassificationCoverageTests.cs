namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Covers analysis orchestration classification arms on run lifecycle methods beyond store initialization.
/// </summary>
[TestClass]
public sealed class AnalysisOrchestrationClassificationCoverageTests
{
  /// <summary>
  /// Verifies claim operations classify foundation validation failures without an inner exception as orchestration validation failures.
  /// </summary>
  [TestMethod]
  public async Task ClaimNextRunAsync_FoundationValidationExceptionWithoutInner_ThrowsOrchestrationValidationException()
  {
    var foundation = new Mock<IAnalysisRunFoundationService>();
    foundation
      .Setup(item => item.ClaimNextRunAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new AnalysisFoundationValidationException("validation"));
    AnalysisOrchestrationService service = CreateService(foundation.Object);

    AnalysisOrchestrationValidationException exception = await Assert
      .ThrowsExactlyAsync<AnalysisOrchestrationValidationException>(() =>
        service.ClaimNextRunAsync("worker", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None))
      .ConfigureAwait(false);

    Assert.IsInstanceOfType<AnalysisFoundationValidationException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies renew operations classify foundation dependency-validation failures without an inner exception.
  /// </summary>
  [TestMethod]
  public async Task RenewRunLeaseAsync_FoundationDependencyValidationExceptionWithoutInner_ThrowsOrchestrationDependencyValidationException()
  {
    var foundation = new Mock<IAnalysisRunFoundationService>();
    foundation
      .Setup(item => item.RenewLeaseAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new AnalysisFoundationDependencyValidationException("dependency validation"));
    AnalysisOrchestrationService service = CreateService(foundation.Object);

    AnalysisOrchestrationDependencyValidationException exception = await Assert
      .ThrowsExactlyAsync<AnalysisOrchestrationDependencyValidationException>(() =>
        service.RenewRunLeaseAsync(Guid.NewGuid(), "worker", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5), CancellationToken.None))
      .ConfigureAwait(false);

    Assert.IsInstanceOfType<AnalysisFoundationDependencyValidationException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies complete operations classify foundation dependency failures without an inner exception.
  /// </summary>
  [TestMethod]
  public async Task CompleteRunAsync_FoundationDependencyExceptionWithoutInner_ThrowsOrchestrationDependencyException()
  {
    var foundation = new Mock<IAnalysisRunFoundationService>();
    foundation
      .Setup(item => item.CompleteRunAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<System.Collections.Generic.IReadOnlyCollection<AnalysisCapability>>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new AnalysisFoundationDependencyException("dependency"));
    AnalysisOrchestrationService service = CreateService(foundation.Object);

    AnalysisOrchestrationDependencyException exception = await Assert
      .ThrowsExactlyAsync<AnalysisOrchestrationDependencyException>(() =>
        service.CompleteRunAsync(Guid.NewGuid(), "worker", [], DateTimeOffset.UtcNow, CancellationToken.None))
      .ConfigureAwait(false);

    Assert.IsInstanceOfType<AnalysisFoundationDependencyException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies fail operations classify foundation service failures without an inner exception.
  /// </summary>
  [TestMethod]
  public async Task FailRunAsync_FoundationServiceExceptionWithoutInner_ThrowsOrchestrationServiceException()
  {
    var foundation = new Mock<IAnalysisRunFoundationService>();
    foundation
      .Setup(item => item.FailRunAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new AnalysisFoundationServiceException("service"));
    AnalysisOrchestrationService service = CreateService(foundation.Object);

    AnalysisOrchestrationServiceException exception = await Assert
      .ThrowsExactlyAsync<AnalysisOrchestrationServiceException>(() =>
        service.FailRunAsync(Guid.NewGuid(), "worker", "failed", DateTimeOffset.UtcNow, CancellationToken.None))
      .ConfigureAwait(false);

    Assert.IsInstanceOfType<AnalysisFoundationServiceException>(exception.InnerException);
  }

  private static AnalysisOrchestrationService CreateService(IAnalysisRunFoundationService foundation) =>
    new(
      foundation,
      Mock.Of<IDocumentAnalysisFoundationService>(),
      Mock.Of<IGenerativeAnalysisFoundationService>(),
      NullLoggerFactory.Instance);
}

