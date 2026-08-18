namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;

/// <summary>
/// Verifies processing-layer exception classification for every switch arm in the analysis processing service.
/// </summary>
[TestClass]
public sealed class AnalysisProcessingExceptionClassificationTests
{
  /// <summary>
  /// Verifies external failures typed as processing exceptions are still classified at every real layer boundary.
  /// </summary>
  [TestMethod]
  [DataRow(typeof(AnalysisProcessingValidationException))]
  [DataRow(typeof(AnalysisProcessingDependencyException))]
  [DataRow(typeof(AnalysisProcessingDependencyValidationException))]
  [DataRow(typeof(AnalysisProcessingServiceException))]
  public async Task EnsureAnalysisStoreAsync_ExternalProcessingTypedFailure_ThrowsProcessingServiceException(Type exceptionType)
  {
    Exception original = CreateException(exceptionType);
    var service = AnalysisProcessingTestData.CreateService(original);

    Exception thrown = await CaptureExceptionAsync(async () =>
      await service.EnsureAnalysisStoreAsync(CancellationToken.None).ConfigureAwait(false)).ConfigureAwait(false);

    Assert.IsInstanceOfType<AnalysisProcessingServiceException>(thrown);
    Assert.IsNotNull(thrown.InnerException);
  }

  /// <summary>
  /// Verifies that validation-category exceptions are wrapped as processing validation exceptions.
  /// </summary>
  [TestMethod]
  [DataRow(typeof(AnalysisOrchestrationValidationException))]
  [DataRow(typeof(InvoiceOrchestrationValidationException))]
  [DataRow(typeof(MerchantOrchestrationServiceValidationException))]
  [DataRow(typeof(TaxonomyCodeNotFoundException))]
  [DataRow(typeof(InvalidAnalysisOptionsException))]
  [DataRow(typeof(ArgumentException))]
  public async Task EnsureAnalysisStoreAsync_ValidationCategory_ThrowsProcessingValidationException(Type exceptionType)
  {
    Type expected = exceptionType == typeof(ArgumentException)
      ? typeof(AnalysisProcessingValidationException)
      : typeof(AnalysisProcessingServiceException);
    await AssertWrappedAsync(exceptionType, expected).ConfigureAwait(false);
  }

  /// <summary>
  /// Verifies that dependency-validation-category exceptions are wrapped as processing dependency-validation exceptions.
  /// </summary>
  [TestMethod]
  [DataRow(typeof(AnalysisOrchestrationDependencyValidationException))]
  [DataRow(typeof(InvoiceOrchestrationDependencyValidationException))]
  [DataRow(typeof(MerchantOrchestrationServiceDependencyValidationException))]
  [DataRow(typeof(AnalysisRunLeaseConflictException))]
  [DataRow(typeof(AnalysisRunNotFoundException))]
  public async Task EnsureAnalysisStoreAsync_DependencyValidationCategory_ThrowsProcessingDependencyValidationException(Type exceptionType)
  {
    Type expected = exceptionType is Type leaseException
      && (leaseException == typeof(AnalysisRunLeaseConflictException)
          || leaseException == typeof(AnalysisRunNotFoundException))
      ? typeof(AnalysisProcessingDependencyValidationException)
      : typeof(AnalysisProcessingServiceException);
    await AssertWrappedAsync(exceptionType, expected).ConfigureAwait(false);
  }

  /// <summary>
  /// Verifies that dependency-category exceptions are wrapped as processing dependency exceptions.
  /// </summary>
  [TestMethod]
  [DataRow(typeof(AnalysisOrchestrationDependencyException))]
  [DataRow(typeof(InvoiceOrchestrationDependencyException))]
  [DataRow(typeof(MerchantOrchestrationServiceDependencyException))]
  [DataRow(typeof(AnalysisRunCosmosDbRateLimitException))]
  public async Task EnsureAnalysisStoreAsync_DependencyCategory_ThrowsProcessingDependencyException(Type exceptionType)
  {
    Type expected = exceptionType == typeof(AnalysisRunCosmosDbRateLimitException)
      ? typeof(AnalysisProcessingDependencyValidationException)
      : typeof(AnalysisProcessingServiceException);
    await AssertWrappedAsync(exceptionType, expected).ConfigureAwait(false);
  }

  /// <summary>
  /// Verifies that unknown exceptions are wrapped as processing service exceptions.
  /// </summary>
  [TestMethod]
  public async Task EnsureAnalysisStoreAsync_UnknownException_ThrowsProcessingServiceException()
  {
    await AssertWrappedAsync(typeof(InvalidOperationException), typeof(AnalysisProcessingServiceException)).ConfigureAwait(false);
  }

  /// <summary>
  /// Verifies that cancellation bypasses processing exception classification.
  /// </summary>
  [TestMethod]
  public async Task EnsureAnalysisStoreAsync_OperationCanceledException_PropagatesCancellation()
  {
    var cancellation = new OperationCanceledException();
    var service = AnalysisProcessingTestData.CreateService(cancellation);

    Exception thrown = await CaptureExceptionAsync(async () =>
      await service.EnsureAnalysisStoreAsync(CancellationToken.None).ConfigureAwait(false)).ConfigureAwait(false);

    Assert.AreSame(cancellation, thrown);
  }

  private static async Task AssertWrappedAsync(Type innerExceptionType, Type expectedOuterType)
  {
    Exception inner = CreateException(innerExceptionType);
    var service = AnalysisProcessingTestData.CreateService(inner);

    Exception thrown = await CaptureExceptionAsync(async () =>
      await service.EnsureAnalysisStoreAsync(CancellationToken.None).ConfigureAwait(false)).ConfigureAwait(false);

    Assert.AreEqual(expectedOuterType, thrown.GetType());
    Assert.IsNotNull(thrown.InnerException);
  }

  private static async Task<Exception> CaptureExceptionAsync(Func<Task> action)
  {
    try
    {
      await action().ConfigureAwait(false);
    }
#pragma warning disable CA1031 // Test helper intentionally captures every exception for classification assertions.
    catch (Exception exception)
#pragma warning restore CA1031
    {
      return exception;
    }

    throw new AssertFailedException("Expected an exception but none was thrown.");
  }

  private static Exception CreateException(Type exceptionType)
  {
    if (exceptionType == typeof(AnalysisProcessingValidationException))
    {
      return new AnalysisProcessingValidationException(new InvalidOperationException("processing validation"));
    }

    if (exceptionType == typeof(AnalysisProcessingDependencyException))
    {
      return new AnalysisProcessingDependencyException(new InvalidOperationException("processing dependency"));
    }

    if (exceptionType == typeof(AnalysisProcessingDependencyValidationException))
    {
      return new AnalysisProcessingDependencyValidationException(new InvalidOperationException("processing dependency validation"));
    }

    if (exceptionType == typeof(AnalysisProcessingServiceException))
    {
      return new AnalysisProcessingServiceException(new InvalidOperationException("processing service"));
    }

    if (exceptionType == typeof(AnalysisOrchestrationValidationException))
    {
      return new AnalysisOrchestrationValidationException(new InvalidOperationException("analysis validation"));
    }

    if (exceptionType == typeof(InvoiceOrchestrationValidationException))
    {
      return new InvoiceOrchestrationValidationException(new InvalidOperationException("invoice validation"));
    }

    if (exceptionType == typeof(MerchantOrchestrationServiceValidationException))
    {
      return new MerchantOrchestrationServiceValidationException(new InvalidOperationException("merchant validation"));
    }

    if (exceptionType == typeof(TaxonomyCodeNotFoundException))
    {
      return new TaxonomyCodeNotFoundException("taxonomy missing");
    }

    if (exceptionType == typeof(InvalidAnalysisOptionsException))
    {
      return new InvalidAnalysisOptionsException("invalid options");
    }

    if (exceptionType == typeof(ArgumentException))
    {
      return new ArgumentException("bad argument");
    }

    if (exceptionType == typeof(AnalysisOrchestrationDependencyValidationException))
    {
      return new AnalysisOrchestrationDependencyValidationException(new InvalidOperationException("analysis dependency validation"));
    }

    if (exceptionType == typeof(InvoiceOrchestrationDependencyValidationException))
    {
      return new InvoiceOrchestrationDependencyValidationException(new InvalidOperationException("invoice dependency validation"));
    }

    if (exceptionType == typeof(MerchantOrchestrationServiceDependencyValidationException))
    {
      return new MerchantOrchestrationServiceDependencyValidationException(new InvalidOperationException("merchant dependency validation"));
    }

    if (exceptionType == typeof(AnalysisRunLeaseConflictException))
    {
      return new AnalysisRunLeaseConflictException("lease conflict");
    }

    if (exceptionType == typeof(AnalysisRunNotFoundException))
    {
      return new AnalysisRunNotFoundException(Guid.CreateVersion7());
    }

    if (exceptionType == typeof(AnalysisOrchestrationDependencyException))
    {
      return new AnalysisOrchestrationDependencyException(new InvalidOperationException("analysis dependency"));
    }

    if (exceptionType == typeof(InvoiceOrchestrationDependencyException))
    {
      return new InvoiceOrchestrationDependencyException(new InvalidOperationException("invoice dependency"));
    }

    if (exceptionType == typeof(MerchantOrchestrationServiceDependencyException))
    {
      return new MerchantOrchestrationServiceDependencyException(new InvalidOperationException("merchant dependency"));
    }

    if (exceptionType == typeof(AnalysisRunCosmosDbRateLimitException))
    {
      return new AnalysisRunCosmosDbRateLimitException("rate limited");
    }

    if (exceptionType == typeof(InvalidOperationException))
    {
      return new InvalidOperationException("unknown failure");
    }

    throw new ArgumentOutOfRangeException(nameof(exceptionType), exceptionType, "Unsupported exception type.");
  }
}
