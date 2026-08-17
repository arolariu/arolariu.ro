namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies orchestration exception classification for run-infrastructure passthrough failures.
/// </summary>
[TestClass]
public sealed class AnalysisOrchestrationExceptionClassificationTests
{
  /// <summary>Verifies foundation validation failures are wrapped as orchestration validation failures.</summary>
  [TestMethod]
  public async Task EnsureRunStoreAsync_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    var service = AnalysisOrchestrationTestData.CreateRunFailureService(
      new AnalysisFoundationValidationException(new InvalidOperationException("validation")));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisOrchestrationValidationException>(
      () => service.EnsureRunStoreAsync(CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<InvalidOperationException>(exception.InnerException);
  }

  /// <summary>Verifies foundation dependency-validation failures are wrapped as orchestration dependency-validation failures.</summary>
  [TestMethod]
  public async Task EnsureRunStoreAsync_FoundationDependencyValidationException_ThrowsOrchestrationDependencyValidationException()
  {
    var service = AnalysisOrchestrationTestData.CreateRunFailureService(
      new AnalysisFoundationDependencyValidationException(new InvalidOperationException("dependency validation")));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisOrchestrationDependencyValidationException>(
      () => service.EnsureRunStoreAsync(CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<InvalidOperationException>(exception.InnerException);
  }

  /// <summary>Verifies foundation dependency failures are wrapped as orchestration dependency failures.</summary>
  [TestMethod]
  public async Task EnsureRunStoreAsync_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    var service = AnalysisOrchestrationTestData.CreateRunFailureService(
      new AnalysisFoundationDependencyException(new InvalidOperationException("dependency")));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisOrchestrationDependencyException>(
      () => service.EnsureRunStoreAsync(CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<InvalidOperationException>(exception.InnerException);
  }

  /// <summary>Verifies foundation service failures are wrapped as orchestration service failures.</summary>
  [TestMethod]
  public async Task EnsureRunStoreAsync_FoundationServiceException_ThrowsOrchestrationServiceException()
  {
    var service = AnalysisOrchestrationTestData.CreateRunFailureService(
      new AnalysisFoundationServiceException(new InvalidOperationException("service")));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisOrchestrationServiceException>(
      () => service.EnsureRunStoreAsync(CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<InvalidOperationException>(exception.InnerException);
  }

  /// <summary>Verifies argument failures are wrapped as orchestration validation failures.</summary>
  [TestMethod]
  public async Task EnsureRunStoreAsync_ArgumentException_ThrowsOrchestrationValidationException()
  {
    var service = AnalysisOrchestrationTestData.CreateRunFailureService(new ArgumentException("bad argument"));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisOrchestrationValidationException>(
      () => service.EnsureRunStoreAsync(CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<ArgumentException>(exception.InnerException);
  }

  /// <summary>Verifies unknown failures are wrapped as orchestration service failures.</summary>
  [TestMethod]
  public async Task EnsureRunStoreAsync_UnknownException_ThrowsOrchestrationServiceException()
  {
    var service = AnalysisOrchestrationTestData.CreateRunFailureService(new InvalidOperationException("boom"));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisOrchestrationServiceException>(
      () => service.EnsureRunStoreAsync(CancellationToken.None)).ConfigureAwait(true);

    Assert.IsInstanceOfType<InvalidOperationException>(exception.InnerException);
  }

  /// <summary>Verifies cancellation propagates without orchestration wrapping.</summary>
  [TestMethod]
  public async Task EnsureRunStoreAsync_OperationCanceledException_PropagatesOperationCanceledException()
  {
    var service = AnalysisOrchestrationTestData.CreateRunFailureService(new OperationCanceledException());

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.EnsureRunStoreAsync(CancellationToken.None)).ConfigureAwait(true);
  }
}
