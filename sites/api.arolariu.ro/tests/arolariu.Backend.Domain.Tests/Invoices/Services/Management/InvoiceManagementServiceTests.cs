namespace arolariu.Backend.Domain.Tests.Invoices.Services.Management;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Management;
using arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies the management layer that coordinates CRUD and analysis processing.
/// </summary>
[TestClass]
public sealed class InvoiceManagementServiceTests
{
  /// <summary>
  /// Verifies processing validation failures are classified at the Management boundary.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoice_ProcessingValidationFailure_ThrowsManagementValidationException()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userIdentifier = Guid.NewGuid();
    var processingException = new CrudProcessingServiceValidationException(new ArgumentException("invalid invoice"));
    var crud = new Mock<ICrudProcessingService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisProcessingService>(MockBehavior.Strict);

    crud.Setup(service => service.ReadInvoice(invoiceId, userIdentifier, It.IsAny<CancellationToken>()))
      .ThrowsAsync(processingException);

    var service = new InvoiceManagementService(crud.Object, analysis.Object);

    InvoiceManagementValidationException exception =
      await Assert.ThrowsExactlyAsync<InvoiceManagementValidationException>(
        () => service.ReadInvoice(invoiceId, userIdentifier, CancellationToken.None))
      .ConfigureAwait(false);

    Assert.AreSame(processingException, exception.InnerException);
  }

  /// <summary>
  /// Verifies merchant analysis cannot be queued by a user who does not own the target merchant.
  /// </summary>
  [TestMethod]
  public async Task QueueMerchantAnalysisAsync_ForeignMerchant_ThrowsForbiddenManagementException()
  {
    Guid merchantId = Guid.NewGuid();
    Guid merchantOwner = Guid.NewGuid();
    Guid requestingUser = Guid.NewGuid();
    var request = new AnalyzeMerchantRequestDto(AnalysisProfile.Fast, Overrides: null);
    var merchant = new Merchant
    {
      id = merchantId,
      CreatedBy = merchantOwner,
      Name = "Foreign merchant",
    };
    var crud = new Mock<ICrudProcessingService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisProcessingService>(MockBehavior.Strict);

    crud.Setup(service => service.ReadMerchant(merchantId, null, It.IsAny<CancellationToken>()))
      .ReturnsAsync(merchant);

    var service = new InvoiceManagementService(crud.Object, analysis.Object);

    InvoiceManagementDependencyValidationException exception =
      await Assert.ThrowsExactlyAsync<InvoiceManagementDependencyValidationException>(
        () => service.QueueMerchantAnalysisAsync(merchantId, requestingUser, request, CancellationToken.None))
      .ConfigureAwait(false);

    Assert.IsInstanceOfType<MerchantForbiddenAccessException>(exception.InnerException);
    analysis.Verify(
      service => service.QueueMerchantAnalysisAsync(
        It.IsAny<Merchant>(),
        It.IsAny<Guid>(),
        It.IsAny<AnalyzeMerchantRequestDto>(),
        It.IsAny<CancellationToken>()),
      Times.Never);
  }

  /// <summary>
  /// Verifies queueing an invoice analysis validates the target invoice through CRUD processing first.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceAnalysisAsync_ValidTarget_ValidatesThenQueuesRun()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userIdentifier = Guid.NewGuid();
    var request = new AnalyzeInvoiceRequestDto(AnalysisProfile.Fast, Overrides: null);
    var invoice = new Invoice { id = invoiceId, UserIdentifier = userIdentifier };
    AnalysisRun run = AnalysisRun.CreateInvoice(invoiceId, userIdentifier, Guid.NewGuid(), InvoiceAnalysisOptions.Fast(), traceParent: null);
    AnalysisAcceptedResponseDto accepted = AnalysisAcceptedResponseDto.FromRun(run);

    var crud = new Mock<ICrudProcessingService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisProcessingService>(MockBehavior.Strict);

    crud.Setup(service => service.ReadInvoice(invoiceId, userIdentifier, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    analysis.Setup(service => service.QueueInvoiceAnalysisAsync(invoiceId, userIdentifier, request, It.IsAny<CancellationToken>()))
      .ReturnsAsync(accepted);

    var service = new InvoiceManagementService(crud.Object, analysis.Object);

    AnalysisAcceptedResponseDto result = await service
      .QueueInvoiceAnalysisAsync(invoiceId, userIdentifier, request, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual(accepted.RunId, result.RunId);
    crud.Verify(service => service.ReadInvoice(invoiceId, userIdentifier, It.IsAny<CancellationToken>()), Times.Once);
    analysis.Verify(service => service.QueueInvoiceAnalysisAsync(invoiceId, userIdentifier, request, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Verifies a claimed invoice run is executed, persisted, and completed through the proper layer boundaries.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_ClaimedInvoiceRun_PersistsAndCompletes()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userIdentifier = Guid.NewGuid();
    AnalysisRun run = AnalysisRun.CreateInvoice(invoiceId, userIdentifier, Guid.NewGuid(), InvoiceAnalysisOptions.Fast(), traceParent: null);
    var invoice = new Invoice { id = invoiceId, UserIdentifier = userIdentifier };
    var execution = new InvoiceAnalysisExecutionResult(
      run,
      new InvoiceAnalysisPatch(
        ExtractionUpdate: null,
        MerchantReferenceUpdate: null,
        SummaryUpdate: new InvoiceSummaryResult("Summary", "Description"),
        ProductClassificationUpdate: null,
        AllergenAssessmentUpdate: null,
        InvoiceClassificationUpdate: null,
        RecipeGenerationUpdate: null),
      MerchantCandidate: null,
      CompletedCapabilities: [AnalysisCapability.InvoiceSummary]);

    var crud = new Mock<ICrudProcessingService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisProcessingService>(MockBehavior.Strict);

    analysis.Setup(service => service.ClaimNextRunAsync("worker-1", It.IsAny<CancellationToken>()))
      .ReturnsAsync(run);
    SetupLeaseScope(analysis, run);

    crud.Setup(service => service.ReadInvoice(invoiceId, userIdentifier, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    analysis.Setup(service => service.ExecuteInvoiceRunAsync(run, invoice, "worker-1", It.IsAny<CancellationToken>()))
      .ReturnsAsync(execution);

    crud.Setup(service => service.PersistInvoiceAnalysisAsync(execution, It.IsAny<CancellationToken>()))
      .ReturnsAsync(execution);

    analysis.Setup(service => service.CompleteRunExecutionAsync(execution, "worker-1", It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);

    var service = new InvoiceManagementService(crud.Object, analysis.Object);

    bool handled = await service
      .TryExecuteNextRunAsync("worker-1", CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(handled);
    analysis.Verify(service => service.CompleteRunExecutionAsync(execution, "worker-1", It.IsAny<CancellationToken>()), Times.Once);
    analysis.Verify(
      service => service.FailRunExecutionAsync(It.IsAny<AnalysisExecutionResult>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
      Times.Never);
  }

  /// <summary>
  /// Verifies a persistence failure is converted into an explicit durable run failure instead of escaping silently.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_WhenPersistenceFails_FailsRun()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userIdentifier = Guid.NewGuid();
    AnalysisRun run = AnalysisRun.CreateInvoice(invoiceId, userIdentifier, Guid.NewGuid(), InvoiceAnalysisOptions.Fast(), traceParent: null);
    var invoice = new Invoice { id = invoiceId, UserIdentifier = userIdentifier };
    var execution = new InvoiceAnalysisExecutionResult(
      run,
      new InvoiceAnalysisPatch(
        ExtractionUpdate: null,
        MerchantReferenceUpdate: null,
        SummaryUpdate: null,
        ProductClassificationUpdate: null,
        AllergenAssessmentUpdate: null,
        InvoiceClassificationUpdate: null,
        RecipeGenerationUpdate: null),
      MerchantCandidate: null,
      CompletedCapabilities: new List<AnalysisCapability>());

    var crud = new Mock<ICrudProcessingService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisProcessingService>(MockBehavior.Strict);

    analysis.Setup(service => service.ClaimNextRunAsync("worker-1", It.IsAny<CancellationToken>()))
      .ReturnsAsync(run);
    SetupLeaseScope(analysis, run);

    crud.Setup(service => service.ReadInvoice(invoiceId, userIdentifier, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    analysis.Setup(service => service.ExecuteInvoiceRunAsync(run, invoice, "worker-1", It.IsAny<CancellationToken>()))
      .ReturnsAsync(execution);

    crud.Setup(service => service.PersistInvoiceAnalysisAsync(execution, It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("write failed"));

    analysis.Setup(service => service.FailRunExecutionAsync(
        It.Is<AnalysisExecutionResult>(result =>
          result.ClaimedRun == run
          && result.Failed
          && result.FailureCode == "TARGET_PERSISTENCE_FAILED"
          && result.FailureReason == AnalysisFailureReason.TargetPersistence),
        "worker-1",
        It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);

    var service = new InvoiceManagementService(crud.Object, analysis.Object);

    bool handled = await service
      .TryExecuteNextRunAsync("worker-1", CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(handled);
    analysis.Verify(service => service.FailRunExecutionAsync(
      It.Is<AnalysisExecutionResult>(result => result.FailureCode == "TARGET_PERSISTENCE_FAILED"),
      "worker-1",
      It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Verifies a run whose target was deleted after queueing is failed terminally instead of being reclaimed forever.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_WhenInvoiceTargetIsMissing_FailsRunTerminally()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userIdentifier = Guid.NewGuid();
    AnalysisRun run = AnalysisRun.CreateInvoice(
      invoiceId,
      userIdentifier,
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      traceParent: null);
    var crud = new Mock<ICrudProcessingService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisProcessingService>(MockBehavior.Strict);

    analysis.Setup(service => service.ClaimNextRunAsync("worker-1", It.IsAny<CancellationToken>()))
      .ReturnsAsync(run);
    SetupLeaseScope(analysis, run);

    crud.Setup(service => service.ReadInvoice(invoiceId, userIdentifier, It.IsAny<CancellationToken>()))
      .ThrowsAsync(new CrudProcessingServiceDependencyValidationException(new InvoiceNotFoundException(invoiceId)));

    analysis.Setup(service => service.FailRunExecutionAsync(
        It.Is<AnalysisExecutionResult>(result =>
          result.ClaimedRun == run
          && result.FailureCode == "TARGET_NOT_FOUND"
          && result.FailureReason == AnalysisFailureReason.DependencyValidation),
        "worker-1",
        It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);

    var service = new InvoiceManagementService(crud.Object, analysis.Object);

    bool handled = await service
      .TryExecuteNextRunAsync("worker-1", CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(handled);
    analysis.Verify(
      service => service.ExecuteInvoiceRunAsync(
        It.IsAny<AnalysisRun>(),
        It.IsAny<Invoice>(),
        It.IsAny<string>(),
        It.IsAny<CancellationToken>()),
      Times.Never);
    analysis.VerifyAll();
  }

  private static void SetupLeaseScope(Mock<IAnalysisProcessingService> analysis, AnalysisRun run) =>
    analysis
      .Setup(service => service.ExecuteWithLeaseHeartbeatAsync(
        run,
        "worker-1",
        It.IsAny<Func<CancellationToken, Task<bool>>>(),
        It.IsAny<CancellationToken>()))
      .Returns(
        (AnalysisRun _, string _, Func<CancellationToken, Task<bool>> operation, CancellationToken cancellationToken) =>
          operation(cancellationToken));
}
