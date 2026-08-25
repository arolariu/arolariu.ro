namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
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
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

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
  /// Verifies caller merchant visibility reads invoices directly through orchestration and de-duplicates references.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchantsVisibleToUser_DuplicateReferences_CallsDirectOrchestrations()
  {
    Guid userId = Guid.NewGuid();
    Guid merchantId = Guid.NewGuid();
    var invoices = new List<Invoice>
    {
      new() { id = Guid.NewGuid(), UserIdentifier = userId, MerchantReference = merchantId },
      new() { id = Guid.NewGuid(), UserIdentifier = userId, MerchantReference = merchantId },
      new() { id = Guid.NewGuid(), UserIdentifier = userId, MerchantReference = Guid.Empty },
    };
    var merchant = new Merchant { id = merchantId };
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var merchantOrchestration = new Mock<IMerchantOrchestrationService>(MockBehavior.Strict);
    invoiceOrchestration
      .Setup(service => service.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoices);
    merchantOrchestration
      .Setup(service => service.ReadMerchantObjectsByIdentifiers(
        It.Is<IReadOnlyCollection<Guid>>(identifiers =>
          identifiers.Count == 1 && identifiers.Single() == merchantId),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync([merchant]);
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      merchantOrchestration.Object,
      Mock.Of<IAnalysisOrchestrationService>(),
      NullLoggerFactory.Instance);

    (IReadOnlyCollection<Merchant> merchants, IReadOnlyCollection<Invoice> invoiceSnapshot) =
      await service.ReadMerchantsVisibleToUser(
      userId,
      CancellationToken.None);

    Assert.AreSame(merchant, merchants.Single());
    CollectionAssert.AreEqual(invoices, invoiceSnapshot.ToList());
    invoiceOrchestration.VerifyAll();
    merchantOrchestration.VerifyAll();
  }

  /// <summary>Verifies an empty merchant reference set is delegated to the broker-backed orchestration.</summary>
  [TestMethod]
  public async Task ReadMerchantsVisibleToUser_NoMerchantReferences_DelegatesEmptyIdentifierSet()
  {
    Guid userId = Guid.NewGuid();
    IReadOnlyCollection<Invoice> invoices =
    [
      new() { id = Guid.NewGuid(), UserIdentifier = userId, MerchantReference = Guid.Empty },
    ];
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var merchantOrchestration = new Mock<IMerchantOrchestrationService>(MockBehavior.Strict);
    invoiceOrchestration
      .Setup(service => service.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoices);
    merchantOrchestration
      .Setup(service => service.ReadMerchantObjectsByIdentifiers(
        It.Is<IReadOnlyCollection<Guid>>(identifiers => identifiers.Count == 0),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync([]);
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      merchantOrchestration.Object,
      Mock.Of<IAnalysisOrchestrationService>(),
      NullLoggerFactory.Instance);

    (IReadOnlyCollection<Merchant> merchants, IReadOnlyCollection<Invoice> invoiceSnapshot) =
      await service.ReadMerchantsVisibleToUser(userId, CancellationToken.None);

    Assert.IsEmpty(merchants);
    CollectionAssert.AreEqual(invoices.ToList(), invoiceSnapshot.ToList());
    invoiceOrchestration.VerifyAll();
    merchantOrchestration.VerifyAll();
  }

  /// <summary>
  /// Verifies direct invoice orchestration failures retain dependency classification without nested Processing wrapping.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchantsVisibleToUser_InvoiceDependencyFailure_MapsToProcessingDependency()
  {
    Guid userId = Guid.NewGuid();
    var dependencyFailure = new TimeoutException("Cosmos query timed out.");
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var merchantOrchestration = new Mock<IMerchantOrchestrationService>(MockBehavior.Strict);
    invoiceOrchestration
      .Setup(service => service.ReadAllInvoiceObjects(userId, It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationDependencyException(dependencyFailure));
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      merchantOrchestration.Object,
      Mock.Of<IAnalysisOrchestrationService>(),
      NullLoggerFactory.Instance);

    InvoiceProcessingServiceDependencyException exception =
      await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceDependencyException>(
        () => service.ReadMerchantsVisibleToUser(userId, CancellationToken.None));

    Assert.AreSame(dependencyFailure, exception.InnerException);
    invoiceOrchestration.VerifyAll();
    merchantOrchestration.VerifyNoOtherCalls();
  }

  /// <summary>Verifies exact-name reads do not select an overlapping product name.</summary>
  [TestMethod]
  public async Task GetProduct_OverlappingNames_ReturnsExactMatch()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    var chocolate = new Product { Name = "Milk Chocolate" };
    var milk = new Product { Name = "Milk" };
    var invoice = new Invoice
    {
      id = invoiceId,
      UserIdentifier = userId,
      Items = [chocolate, milk],
    };
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    invoiceOrchestration.Setup(service => service.ReadInvoiceObject(
        invoiceId,
        userId,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      Mock.Of<IAnalysisOrchestrationService>(),
      NullLoggerFactory.Instance);

    Product result = await service.GetProduct(
      invoiceId,
      userId,
      "Milk",
      CancellationToken.None);

    Assert.AreSame(milk, result);
  }

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
      invoiceId,
      userId,
      updatedInvoice,
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
        selection.Code,
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

    await service.AddProduct(invoiceId, userId, product, selection.Code, CancellationToken.None);

    analysis.VerifyAll();
    invoiceOrchestration.VerifyAll();
  }

  /// <summary>
  /// Verifies an invalid product classification code is rejected before resource persistence.
  /// </summary>
  [TestMethod]
  public async Task AddProduct_InvalidClassificationCode_DoesNotPersist()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    var product = new Product { Name = "Milk" };
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ResolveManualClassificationAsync(
        "invalid",
        ClassificationSystem.Gs1Gpc,
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new AnalysisOrchestrationValidationException(new ArgumentException("wrong system")));
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceValidationException>(
      () => service.AddProduct(invoiceId, userId, product, "invalid", CancellationToken.None));
    invoiceOrchestration.VerifyNoOtherCalls();
  }

  /// <summary>
  /// Verifies a successful queue delivery persists the target before deleting the message.
  /// </summary>
  [TestMethod]
  public async Task ProcessAnalysisAsync_Success_PersistsBeforeDelete()
  {
    AnalysisQueueReceipt receipt = CreateReceipt(dequeueCount: 1);
    Assert.IsTrue(ActivityContext.TryParse(
      receipt.Message!.TraceParent,
      traceState: null,
      isRemote: true,
      out ActivityContext parentContext));
    using var activities = new InvoiceActivityRecorder();
    var invoice = new Invoice
    {
      id = receipt.Message!.TargetId,
      UserIdentifier = receipt.Message.RequestedBy,
    };
    var operations = new List<string>();
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ReceiveAnalysisAsync(
        TimeSpan.FromMinutes(2),
        It.IsAny<CancellationToken>()))
      .Callback(() => operations.Add("receive"))
      .ReturnsAsync(receipt);
    invoiceOrchestration.Setup(service => service.ReadInvoiceObject(
      invoice.id,
      invoice.UserIdentifier,
      It.IsAny<CancellationToken>()))
    .Callback(() => operations.Add("read-target"))
    .ReturnsAsync(invoice);
    analysis.Setup(service => service.AnalyzeInvoiceAsync(
      invoice,
      receipt.Message!.InvoiceOptions!,
      receipt.Message.CorrelationId,
      It.IsAny<CancellationToken>()))
    .Callback(() => operations.Add("analyze"))
    .ReturnsAsync((invoice, null));
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

    bool result = await service.ProcessAnalysisAsync(CancellationToken.None);

    Assert.IsTrue(result);
    List<string> expectedOperations = ["receive", "read-target", "analyze", "persist", "delete"];
    CollectionAssert.AreEqual(expectedOperations, operations);
    Activity? consumer = activities.FindActivity(nameof(InvoiceProcessingService.ProcessAnalysisAsync));
    Assert.IsNotNull(consumer);
    Assert.AreEqual(parentContext.TraceId, consumer.TraceId);
    Assert.AreEqual(parentContext.SpanId, consumer.ParentSpanId);
  }

  /// <summary>
  /// Verifies a persistence failure is log-only and replacement queue policy continues.
  /// </summary>
  [TestMethod]
  public async Task ProcessAnalysisAsync_PersistenceFailure_DeletesAndQueuesReplacement()
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
    InvoiceAnalysisOptions failedOptions = new(
      AnalysisProfile.Custom,
      documentExtraction: false,
      invoiceSummary: true,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0);
    analysis.Setup(service => service.AnalyzeInvoiceAsync(
        invoice,
        receipt.Message!.InvoiceOptions!,
        receipt.Message.CorrelationId,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync((invoice, failedOptions));
    invoiceOrchestration.Setup(service => service.UpdateInvoiceObject(
        invoice,
        invoice.id,
        invoice.UserIdentifier,
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationDependencyException(new TimeoutException()));
    analysis.Setup(service => service.DeleteAnalysisAsync(
        receipt,
        It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);
    analysis.Setup(service => service.EnqueueAnalysisAsync(
        It.Is<QueueAnalysisMessage>(message =>
          message.AttemptNumber == 2
          && message.InvoiceOptions == failedOptions),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync("replacement-message");
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    bool result = await service.ProcessAnalysisAsync(CancellationToken.None);

    Assert.IsTrue(result);
    analysis.VerifyAll();
  }

  /// <summary>Verifies logical attempt three persists and deletes without publishing another replacement.</summary>
  [TestMethod]
  public async Task ProcessAnalysisAsync_AttemptThreeWithFailures_DeletesWithoutReplacement()
  {
    AnalysisQueueReceipt receipt = CreateReceipt(dequeueCount: 1, attemptNumber: 3);
    var invoice = new Invoice
    {
      id = receipt.Message!.TargetId,
      UserIdentifier = receipt.Message.RequestedBy,
    };
    InvoiceAnalysisOptions failedOptions = new(
      AnalysisProfile.Custom,
      documentExtraction: false,
      invoiceSummary: true,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0);
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
    analysis.Setup(service => service.AnalyzeInvoiceAsync(
        invoice,
        receipt.Message.InvoiceOptions!,
        receipt.Message.CorrelationId,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync((invoice, failedOptions));
    invoiceOrchestration.Setup(service => service.UpdateInvoiceObject(
        invoice,
        invoice.id,
        invoice.UserIdentifier,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    analysis.Setup(service => service.DeleteAnalysisAsync(
        receipt,
        It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    bool result = await service.ProcessAnalysisAsync(CancellationToken.None);

    Assert.IsTrue(result);
    analysis.Verify(service => service.EnqueueAnalysisAsync(
      It.IsAny<QueueAnalysisMessage>(),
      It.IsAny<CancellationToken>()), Times.Never);
    analysis.VerifyAll();
  }

  /// <summary>Verifies replacement enqueue failure surfaces only after the current message has been deleted.</summary>
  [TestMethod]
  public async Task ProcessAnalysisAsync_ReplacementEnqueueFails_DeletesBeforeSurfacingFailure()
  {
    AnalysisQueueReceipt receipt = CreateReceipt();
    var invoice = new Invoice
    {
      id = receipt.Message!.TargetId,
      UserIdentifier = receipt.Message.RequestedBy,
    };
    InvoiceAnalysisOptions failedOptions = new(
      AnalysisProfile.Custom,
      documentExtraction: false,
      invoiceSummary: true,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0);
    var operations = new List<string>();
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
    analysis.Setup(service => service.AnalyzeInvoiceAsync(
        invoice,
        receipt.Message.InvoiceOptions!,
        receipt.Message.CorrelationId,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync((invoice, failedOptions));
    invoiceOrchestration.Setup(service => service.UpdateInvoiceObject(
        invoice,
        invoice.id,
        invoice.UserIdentifier,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    analysis.Setup(service => service.DeleteAnalysisAsync(
        receipt,
        It.IsAny<CancellationToken>()))
      .Callback(() => operations.Add("delete"))
      .Returns(Task.CompletedTask);
    analysis.Setup(service => service.EnqueueAnalysisAsync(
        It.IsAny<QueueAnalysisMessage>(),
        It.IsAny<CancellationToken>()))
      .Callback(() => operations.Add("enqueue"))
      .ThrowsAsync(new AnalysisOrchestrationDependencyException(new TimeoutException()));
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      Mock.Of<IMerchantOrchestrationService>(),
      analysis.Object,
      NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<InvoiceProcessingServiceDependencyException>(
      () => service.ProcessAnalysisAsync(CancellationToken.None));

    List<string> expectedOperations = ["delete", "enqueue"];
    CollectionAssert.AreEqual(expectedOperations, operations);
    analysis.Verify(service => service.DeleteAnalysisAsync(
      receipt,
      It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Verifies malformed payloads below the terminal delivery remain queued for visibility recovery.
  /// </summary>
  [TestMethod]
  public async Task ProcessAnalysisAsync_FirstMalformedDelivery_DoesNotDeleteMessage()
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

    bool result = await service.ProcessAnalysisAsync(CancellationToken.None);

    Assert.IsTrue(result);
    analysis.Verify(service => service.DeleteAnalysisAsync(
      It.IsAny<AnalysisQueueReceipt>(),
      It.IsAny<CancellationToken>()), Times.Never);
  }

  /// <summary>
  /// Verifies the fifth malformed delivery is deleted through Analysis Orchestration.
  /// </summary>
  [TestMethod]
  public async Task ProcessAnalysisAsync_FifthMalformedDelivery_DeletesMessage()
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

    bool result = await service.ProcessAnalysisAsync(CancellationToken.None);

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
      ClassificationCode = selection.Code,
    };
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisOrchestrationService>(MockBehavior.Strict);
    analysis.Setup(service => service.ResolveManualClassificationAsync(
        selection.Code,
        ClassificationSystem.EcoicopV2,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(canonical);
    invoiceOrchestration.Setup(service => service.UpdateInvoiceObject(
        It.Is<Invoice>(invoice =>
          ReferenceEquals(invoice.Classification, canonical) &&
          invoice.ClassificationCode == null),
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
      .UpdateInvoice(invoiceId, userId, updatedInvoice, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreSame(canonical, result.Classification);
    Assert.IsNull(result.ClassificationCode);
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
        selection.Code,
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
      .UpdateMerchant(merchantId, null, updatedMerchant, selection.Code, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreSame(canonical, result.Classification);
  }

  /// <summary>
  /// Verifies the unified Processing service owns queue consumption and reports an empty queue.
  /// </summary>
  [TestMethod]
  public async Task ProcessAnalysisAsync_NoVisibleMessage_ReturnsFalse()
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
      .ProcessAnalysisAsync(CancellationToken.None)
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
        It.Is<QueueAnalysisMessage>(message =>
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

  private static AnalysisQueueReceipt CreateReceipt(long dequeueCount = 1, int attemptNumber = 1)
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
    QueueAnalysisMessage message = QueueAnalysisMessage.CreateInvoiceMessage(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      options,
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      attemptNumber);

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
