namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies queue-oriented analysis Processing behavior.
/// </summary>
[TestClass]
public sealed class InvoiceProcessingServiceCurrentArchitectureTests
{
  /// <summary>
  /// Verifies an update without a classification selection bypasses Analysis Orchestration.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoice_WithoutClassification_DoesNotResolveClassification()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    var updatedInvoice = new Invoice
    {
      id = invoiceId,
      UserIdentifier = userId,
      Classification = null,
    };
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    invoiceOrchestration.Setup(service => service.UpdateInvoiceObject(
        It.Is<Invoice>(invoice => invoice.Classification == null),
        invoiceId,
        userId,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(updatedInvoice);
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    Invoice result = await service.UpdateInvoice(
      updatedInvoice,
      invoiceId,
      userId,
      CancellationToken.None);

    Assert.IsNull(result.Classification);
    analysis.VerifyNoOtherCalls();
  }

  /// <summary>
  /// Verifies product creation persists a canonical GS1 classification.
  /// </summary>
  [TestMethod]
  public async Task AddProduct_ManualClassification_PersistsCanonicalClassification()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    StandardClassification selection = CreateClassification(
      ClassificationSystem.Gs1Gpc,
      "10000001",
      "Client supplied label");
    StandardClassification canonical = CreateClassification(
      ClassificationSystem.Gs1Gpc,
      "10000001",
      "Milk");
    var product = new Product { Name = "Milk", Classification = selection };
    var invoice = new Invoice { id = invoiceId, UserIdentifier = userId };
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ResolveManualClassificationAsync(
        selection,
        ClassificationSystem.Gs1Gpc,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(canonical);
    invoiceOrchestration.Setup(service => service.ReadInvoiceObject(
        invoiceId,
        userId,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    invoiceOrchestration.Setup(service => service.UpdateInvoiceObject(
        It.Is<Invoice>(updated => ReferenceEquals(updated.Items.Single().Classification, canonical)),
        invoiceId,
        userId,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    await service.AddProduct(product, invoiceId, userId, CancellationToken.None);

    analysis.VerifyAll();
    invoiceOrchestration.VerifyAll();
  }

  /// <summary>
  /// Verifies a wrong-system product classification is rejected before resource persistence.
  /// </summary>
  [TestMethod]
  public async Task AddProduct_WrongClassificationSystem_DoesNotPersist()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    StandardClassification selection = CreateClassification(
      ClassificationSystem.EcoicopV2,
      "01.1",
      "Food");
    var product = new Product { Name = "Milk", Classification = selection };
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ResolveManualClassificationAsync(
        selection,
        ClassificationSystem.Gs1Gpc,
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new AnalysisOrchestrationValidationException(new ArgumentException("wrong system")));
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceValidationException>(
      () => service.AddProduct(product, invoiceId, userId, CancellationToken.None));
    invoiceOrchestration.VerifyNoOtherCalls();
  }

  /// <summary>
  /// Verifies a successful queue delivery persists the target before deleting the message.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextAnalysisAsync_Success_PersistsBeforeDelete()
  {
    AnalysisQueueReceipt receipt = CreateReceipt(dequeueCount: 1);
    var invoice = new Invoice
    {
      id = receipt.Message!.TargetId,
      UserIdentifier = receipt.Message.RequestedBy,
    };
    var operations = new List<string>();
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    int readCount = 0;
    analysis.Setup(service => service.ReceiveAnalysisAsync(
        TimeSpan.FromMinutes(2),
        It.IsAny<CancellationToken>()))
      .Callback(() => operations.Add("receive"))
      .ReturnsAsync(receipt);
    invoiceOrchestration.Setup(service => service.ReadInvoiceObject(
        invoice.id,
        invoice.UserIdentifier,
        It.IsAny<CancellationToken>()))
      .Callback(() => operations.Add(++readCount == 1 ? "read-target" : "read-for-persistence"))
      .ReturnsAsync(invoice);
    analysis.Setup(service => service.ExecuteInvoiceAnalysisAsync(
        receipt.Message!,
        invoice,
        It.IsAny<CancellationToken>()))
      .Callback(() => operations.Add("analyze"))
      .ReturnsAsync(new InvoiceAnalysisExecutionResult(
        receipt.Message!,
        new InvoiceAnalysisPatch(null, null, null, null, null, null),
        CompletedCapabilities: []));
    invoiceOrchestration.Setup(service => service.UpdateInvoiceObject(
        invoice,
        invoice.id,
        invoice.UserIdentifier,
        It.IsAny<CancellationToken>()))
      .Callback(() => operations.Add("persist"))
      .ReturnsAsync(invoice);
    analysis.Setup(service => service.DeleteAnalysisAsync(
        receipt,
        It.IsAny<CancellationToken>()))
      .Callback(() => operations.Add("delete"))
      .Returns(Task.CompletedTask);
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    bool result = await service.TryExecuteNextAnalysisAsync(CancellationToken.None);

    Assert.IsTrue(result);
    List<string> expectedOperations = ["receive", "read-target", "analyze", "read-for-persistence", "persist", "delete"];
    CollectionAssert.AreEqual(expectedOperations, operations);
  }

  /// <summary>
  /// Verifies a persistence failure below dequeue five leaves the message for visibility recovery.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextAnalysisAsync_PersistenceFailure_DoesNotDeleteMessage()
  {
    AnalysisQueueReceipt receipt = CreateReceipt(dequeueCount: 1);
    var invoice = new Invoice
    {
      id = receipt.Message!.TargetId,
      UserIdentifier = receipt.Message.RequestedBy,
    };
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ReceiveAnalysisAsync(
        TimeSpan.FromMinutes(2),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(receipt);
    invoiceOrchestration.Setup(service => service.ReadInvoiceObject(
        invoice.id,
        invoice.UserIdentifier,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    analysis.Setup(service => service.ExecuteInvoiceAnalysisAsync(
        receipt.Message!,
        invoice,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(new InvoiceAnalysisExecutionResult(
        receipt.Message!,
        new InvoiceAnalysisPatch(null, null, null, null, null, null),
        CompletedCapabilities: []));
    invoiceOrchestration.Setup(service => service.UpdateInvoiceObject(
        invoice,
        invoice.id,
        invoice.UserIdentifier,
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationDependencyException(new TimeoutException()));
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    bool result = await service.TryExecuteNextAnalysisAsync(CancellationToken.None);

    Assert.IsTrue(result);
    analysis.Verify(service => service.DeleteAnalysisAsync(
      It.IsAny<AnalysisQueueReceipt>(),
      It.IsAny<CancellationToken>()), Times.Never);
  }

  /// <summary>
  /// Verifies malformed payloads below the terminal delivery remain queued for visibility recovery.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextAnalysisAsync_FirstMalformedDelivery_DoesNotDeleteMessage()
  {
    AnalysisQueueReceipt receipt = AnalysisQueueReceipt.CreateMalformed(
      "{not-json",
      "message-1",
      "receipt-1",
      dequeueCount: 1,
      nextVisibleAt: null);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ReceiveAnalysisAsync(
        TimeSpan.FromMinutes(2),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(receipt);
    var service = new InvoiceProcessingService(
      Mock.Of<IInvoiceOrchestrationService>(),
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    bool result = await service.TryExecuteNextAnalysisAsync(CancellationToken.None);

    Assert.IsTrue(result);
    analysis.Verify(service => service.DeleteAnalysisAsync(
      It.IsAny<AnalysisQueueReceipt>(),
      It.IsAny<CancellationToken>()), Times.Never);
  }

  /// <summary>
  /// Verifies the fifth malformed delivery is deleted through Analysis Orchestration.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextAnalysisAsync_FifthMalformedDelivery_DeletesMessage()
  {
    AnalysisQueueReceipt receipt = AnalysisQueueReceipt.CreateMalformed(
      "{not-json",
      "message-1",
      "receipt-5",
      dequeueCount: 5,
      nextVisibleAt: null);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ReceiveAnalysisAsync(
        TimeSpan.FromMinutes(2),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(receipt);
    analysis.Setup(service => service.DeleteAnalysisAsync(
        receipt,
        It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);
    var service = new InvoiceProcessingService(
      Mock.Of<IInvoiceOrchestrationService>(),
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    bool result = await service.TryExecuteNextAnalysisAsync(CancellationToken.None);

    Assert.IsTrue(result);
    analysis.VerifyAll();
  }

  /// <summary>
  /// Verifies invoice updates replace client taxonomy data with the canonical taxonomy snapshot.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoice_ManualClassification_PersistsCanonicalClassification()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    StandardClassification selection = CreateClassification(
      ClassificationSystem.EcoicopV2,
      "01.1",
      "Client supplied label");
    StandardClassification canonical = CreateClassification(
      ClassificationSystem.EcoicopV2,
      "01.1",
      "Food");
    var updatedInvoice = new Invoice
    {
      id = invoiceId,
      UserIdentifier = userId,
      Classification = selection,
    };
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ResolveManualClassificationAsync(
        selection,
        ClassificationSystem.EcoicopV2,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(canonical);
    invoiceOrchestration.Setup(service => service.UpdateInvoiceObject(
        It.Is<Invoice>(invoice => ReferenceEquals(invoice.Classification, canonical)),
        invoiceId,
        userId,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(updatedInvoice);
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    Invoice result = await service
      .UpdateInvoice(updatedInvoice, invoiceId, userId, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreSame(canonical, result.Classification);
  }

  /// <summary>
  /// Verifies merchant updates replace client taxonomy data with the canonical taxonomy snapshot.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchant_ManualClassification_PersistsCanonicalClassification()
  {
    Guid merchantId = Guid.NewGuid();
    StandardClassification selection = CreateClassification(
      ClassificationSystem.Nace21,
      "47.11",
      "Client supplied label");
    StandardClassification canonical = CreateClassification(
      ClassificationSystem.Nace21,
      "47.11",
      "Retail sale");
    var updatedMerchant = new Merchant { Classification = selection };
    var merchantOrchestration = new Mock<IMerchantOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ResolveManualClassificationAsync(
        selection,
        ClassificationSystem.Nace21,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(canonical);
    merchantOrchestration.Setup(service => service.UpdateMerchantObject(
        It.Is<Merchant>(merchant => ReferenceEquals(merchant.Classification, canonical)),
        merchantId,
        null,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(updatedMerchant);
    var service = new InvoiceProcessingService(
      Mock.Of<IInvoiceOrchestrationService>(),
      merchantOrchestration.Object,
      analysis.Object,
      NullLoggerFactory.Instance);

    Merchant result = await service
      .UpdateMerchant(updatedMerchant, merchantId, null, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreSame(canonical, result.Classification);
  }

  /// <summary>
  /// Verifies product updates replace client taxonomy data with the canonical taxonomy snapshot.
  /// </summary>
  [TestMethod]
  public async Task UpdateProduct_ManualClassification_PersistsCanonicalClassification()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    StandardClassification selection = CreateClassification(
      ClassificationSystem.Gs1Gpc,
      "10000001",
      "Client supplied label");
    StandardClassification canonical = CreateClassification(
      ClassificationSystem.Gs1Gpc,
      "10000001",
      "Milk");
    var persistedProduct = new Product { Name = "Milk" };
    var updatedProduct = new Product { Name = "Milk", Classification = selection };
    var invoice = new Invoice
    {
      id = invoiceId,
      UserIdentifier = userId,
      Items = [persistedProduct],
    };
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ResolveManualClassificationAsync(
        selection,
        ClassificationSystem.Gs1Gpc,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(canonical);
    invoiceOrchestration.Setup(service => service.ReadInvoiceObject(
        invoiceId,
        userId,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    invoiceOrchestration.Setup(service => service.UpdateInvoiceObject(
        It.Is<Invoice>(updated => ReferenceEquals(updated.Items.Single().Classification, canonical)),
        invoiceId,
        userId,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    Product result = await service
      .UpdateProduct("Milk", updatedProduct, invoiceId, userId, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreSame(canonical, result.Classification);
    Assert.AreNotSame(persistedProduct, result);
    Assert.AreSame(result, invoice.Items.Single());
    Assert.IsTrue(result.Metadata.IsEdited);
    Assert.IsFalse(persistedProduct.Metadata.IsEdited);
    Assert.AreSame(selection, updatedProduct.Classification);
  }

  /// <summary>
  /// Verifies a transient capability failure marks the execution as failed so the queue message can retry.
  /// </summary>
  [TestMethod]
  public async Task ExecuteInvoiceAnalysisAsync_DependencyFailure_ReturnsRetryableFailure()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    InvoiceAnalysisOptions options = new(
      AnalysisProfile.Custom,
      documentExtraction: false,
      invoiceSummary: true,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0);
    AnalysisQueueMessage message = AnalysisQueueMessage.CreateInvoice(
      invoiceId,
      userId,
      Guid.NewGuid(),
      options,
      "00-trace-span-01");
    var invoice = new Invoice { id = invoiceId, UserIdentifier = userId };
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    InvoiceAnalysisExecutionResult expected = new(
      message,
      new InvoiceAnalysisPatch(null, null, null, null, null, null),
      CompletedCapabilities: [],
      FailureReason: AnalysisFailureReason.Dependency);
    analysis.Setup(service => service.ExecuteInvoiceAnalysisAsync(
        message,
        invoice,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(expected);
    var service = new InvoiceProcessingService(
      Mock.Of<IInvoiceOrchestrationService>(),
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    InvoiceAnalysisExecutionResult result = await service
      .ExecuteInvoiceAnalysisAsync(message, invoice, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(result.Failed);
    Assert.AreEqual(AnalysisFailureReason.Dependency, result.FailureReason);
  }

  /// <summary>
  /// Verifies the unified Processing service owns queue consumption and reports an empty queue.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextAnalysisAsync_NoVisibleMessage_ReturnsFalse()
  {
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ReceiveAnalysisAsync(
        TimeSpan.FromMinutes(2),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync((AnalysisQueueReceipt?)null);
    var service = new InvoiceProcessingService(
      Mock.Of<IInvoiceOrchestrationService>(),
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    bool result = await service
      .TryExecuteNextAnalysisAsync(CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsFalse(result);
  }

  /// <summary>
  /// Verifies invoice queueing resolves options and returns Azure Queue's message identifier.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceAnalysisAsync_ValidRequest_ReturnsMessageId()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userIdentifier = Guid.NewGuid();
    var request = new InvoiceAnalysisRequestDto(
      AnalysisProfile.Fast,
      DocumentExtraction: null,
      InvoiceSummary: null,
      ProductClassification: null,
      AllergenAssessment: null,
      InvoiceClassification: null,
      RecipeGeneration: null,
      MaximumRecipes: null);
    var invoice = new Invoice { id = invoiceId, UserIdentifier = userIdentifier };
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);

    invoiceOrchestration
      .Setup(service => service.ReadInvoiceObject(invoiceId, userIdentifier, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    analysis.Setup(service => service.EnqueueAnalysisAsync(
        It.Is<AnalysisQueueMessage>(message =>
          message.TargetId == invoiceId
          && message.RequestedBy == userIdentifier
          && message.InvoiceOptions!.Profile == AnalysisProfile.Fast),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync("message-1");

    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    string result = await service
      .QueueInvoiceAnalysisAsync(invoiceId, userIdentifier, request, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual("message-1", result);
    invoiceOrchestration.VerifyAll();
    analysis.VerifyAll();
  }

  /// <summary>
  /// Verifies receiving delegates with the configured visibility timeout.
  /// </summary>
  [TestMethod]
  public async Task ReceiveNextAnalysisAsync_VisibleMessage_ReturnsReceipt()
  {
    AnalysisQueueReceipt receipt = CreateReceipt();
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ReceiveAnalysisAsync(
        TimeSpan.FromMinutes(2),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(receipt);
    var service = new InvoiceProcessingService(
      Mock.Of<IInvoiceOrchestrationService>(),
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    AnalysisQueueReceipt? result = await service
      .ReceiveNextAnalysisAsync(CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreSame(receipt, result);
  }

  /// <summary>
  /// Verifies visibility renewal remains active while Management executes its callback.
  /// </summary>
  [TestMethod]
  public async Task ExecuteWithVisibilityRenewalAsync_LongOperation_RenewsVisibility()
  {
    AnalysisQueueReceipt receipt = CreateReceipt();
    var renewalObserved = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.RenewAnalysisVisibilityAsync(
        receipt,
        TimeSpan.FromMinutes(1),
        It.IsAny<CancellationToken>()))
      .Callback(() => renewalObserved.TrySetResult())
      .ReturnsAsync(receipt);
    var service = new InvoiceProcessingService(
      Mock.Of<IInvoiceOrchestrationService>(),
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance,
      TimeSpan.FromMilliseconds(10),
      TimeSpan.FromMinutes(1));

    int result = await service.ExecuteWithVisibilityRenewalAsync(
      receipt,
      async cancellationToken =>
      {
        await renewalObserved.Task.WaitAsync(TimeSpan.FromSeconds(1), cancellationToken).ConfigureAwait(false);
        return 42;
      },
      CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual(42, result);
    analysis.VerifyAll();
  }

  /// <summary>
  /// Verifies a visibility-renewal failure cancels execution and surfaces a dependency failure.
  /// </summary>
  [TestMethod]
  public async Task ExecuteWithVisibilityRenewalAsync_RenewalFailure_ThrowsDependencyException()
  {
    AnalysisQueueReceipt receipt = CreateReceipt();
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.RenewAnalysisVisibilityAsync(
        receipt,
        TimeSpan.FromMinutes(1),
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new AnalysisOrchestrationDependencyException(new TimeoutException()));
    var service = new InvoiceProcessingService(
      Mock.Of<IInvoiceOrchestrationService>(),
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance,
      TimeSpan.FromMilliseconds(10),
      TimeSpan.FromMinutes(1));

    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceDependencyException>(
      () => service.ExecuteWithVisibilityRenewalAsync(
        receipt,
        async cancellationToken =>
        {
          await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken).ConfigureAwait(false);
          return 42;
        },
        CancellationToken.None));
  }

  private static AnalysisQueueReceipt CreateReceipt(long dequeueCount = 1)
  {
    InvoiceAnalysisOptions options = new(
      AnalysisProfile.Custom,
      documentExtraction: false,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0);
    AnalysisQueueMessage message = AnalysisQueueMessage.CreateInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      options,
      "00-trace-span-01");

    return new AnalysisQueueReceipt(message, "message-1", "receipt-1", dequeueCount, null);
  }

  private static StandardClassification CreateClassification(
    ClassificationSystem system,
    string code,
    string label) =>
    new(
      system,
      "test-version",
      code,
      label,
      [new ClassificationNode("leaf", code, label)],
      ClassificationOrigin.Manual,
      confidence: null,
      evidence: []);
}
