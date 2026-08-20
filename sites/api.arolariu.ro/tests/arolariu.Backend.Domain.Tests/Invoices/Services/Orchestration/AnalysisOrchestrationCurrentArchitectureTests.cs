namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies queue-oriented Analysis Orchestration behavior.
/// </summary>
[TestClass]
public sealed class AnalysisOrchestrationCurrentArchitectureTests
{
  /// <summary>
  /// Verifies independent summary and product-classification branches start concurrently.
  /// </summary>
  [TestMethod]
  public async Task ExecuteInvoiceAnalysisAsync_IndependentCapabilities_RunConcurrently()
  {
    var bothCapabilitiesStarted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    int startedCapabilities = 0;
    InvoiceAnalysisOptions options = new(
      AnalysisProfile.Custom,
      documentExtraction: false,
      invoiceSummary: true,
      productClassification: true,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0);
    QueueAnalysisMessage message = QueueAnalysisMessage.CreateInvoiceMessage(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      options,
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
    var invoice = new Invoice
    {
      id = message.TargetId,
      UserIdentifier = message.RequestedBy,
      Items = [new Product { Name = "Milk" }],
    };
    var analysis = new Mock<IAnalysisFoundationService>(MockBehavior.Strict);
    analysis.Setup(service => service.GenerateInvoiceSummaryAsync(
        It.IsAny<IReadOnlyList<ProductAnalysisInput>>(),
        message.CorrelationId,
        It.IsAny<CancellationToken>()))
      .Returns(async () =>
      {
        if (Interlocked.Increment(ref startedCapabilities) == 2)
        {
          bothCapabilitiesStarted.TrySetResult();
        }

        await bothCapabilitiesStarted.Task.ConfigureAwait(false);
        return new InvoiceSummaryResult("Groceries", "Milk purchase");
      });
    analysis.Setup(service => service.GetTaxonomyVersionAsync(
        ClassificationSystem.Gs1Gpc,
        It.IsAny<CancellationToken>()))
      .Returns(async () =>
      {
        if (Interlocked.Increment(ref startedCapabilities) == 2)
        {
          bothCapabilitiesStarted.TrySetResult();
        }

        await bothCapabilitiesStarted.Task.ConfigureAwait(false);
        return "test-version";
      });
    analysis.Setup(service => service.GenerateClassificationSearchTermsAsync(
        AnalysisCapability.ProductClassification,
        ClassificationSystem.Gs1Gpc,
        "test-version",
        It.IsAny<IReadOnlyDictionary<string, string>>(),
        It.IsAny<CancellationToken>()))
      .Returns((
        AnalysisCapability _,
        ClassificationSystem _,
        string _,
        IReadOnlyDictionary<string, string> subjects,
        CancellationToken _) =>
        Task.FromResult<IReadOnlyDictionary<string, IReadOnlyList<string>>>(
          subjects.ToDictionary(
            pair => pair.Key,
            _ => (IReadOnlyList<string>)["milk"],
            StringComparer.Ordinal)));
    analysis.Setup(service => service.SearchTaxonomyAsync(
        ClassificationSystem.Gs1Gpc,
        "milk",
        5,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync([new ClassificationCandidateOption("10000001", "Milk")]);
    analysis.Setup(service => service.SelectClassificationCandidatesAsync(
        AnalysisCapability.ProductClassification,
        ClassificationSystem.Gs1Gpc,
        "test-version",
        It.IsAny<IReadOnlyDictionary<string, IReadOnlyList<ClassificationCandidateOption>>>(),
        It.IsAny<CancellationToken>()))
      .Returns((
        AnalysisCapability _,
        ClassificationSystem _,
        string _,
        IReadOnlyDictionary<string, IReadOnlyList<ClassificationCandidateOption>> candidates,
        CancellationToken _) =>
        Task.FromResult<IReadOnlyDictionary<string, SelectedClassificationCandidate>>(
          candidates.ToDictionary(
            pair => pair.Key,
            _ => new SelectedClassificationCandidate("10000001", 0.9),
            StringComparer.Ordinal)));
    analysis.Setup(service => service.ResolveClassificationAsync(
        ClassificationSystem.Gs1Gpc,
        "10000001",
        ClassificationOrigin.Analysis,
        0.9,
        It.IsAny<IReadOnlyList<ClassificationEvidence>>(),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(new StandardClassification(
        ClassificationSystem.Gs1Gpc,
        "test-version",
        "10000001",
        "Milk",
        [new ClassificationNode("leaf", "10000001", "Milk")],
        ClassificationOrigin.Analysis,
        0.9,
        evidence: []));
    var service = new AnalysisOrchestrationService(
      analysis.Object,
      Mock.Of<IAnalysisQueueFoundationService>(),
      NullLoggerFactory.Instance);

    Task<InvoiceAnalysisExecutionResult> execution = service.ExecuteInvoiceAnalysisAsync(
      message,
      invoice,
      CancellationToken.None);
    Task completed = await Task.WhenAny(execution, Task.Delay(TimeSpan.FromSeconds(1)));

    Assert.AreSame(execution, completed);
    Assert.IsFalse((await execution).Failed);
  }

  /// <summary>
  /// Verifies Analysis Orchestration owns workflow sequencing and reports capability failures.
  /// </summary>
  [TestMethod]
  public async Task ExecuteInvoiceAnalysisAsync_DependencyFailure_ReturnsFailureResult()
  {
    InvoiceAnalysisOptions options = new(
      AnalysisProfile.Custom,
      documentExtraction: false,
      invoiceSummary: true,
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
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
    var invoice = new Invoice { id = message.TargetId, UserIdentifier = message.RequestedBy };
    var analysis = new Mock<IAnalysisFoundationService>(MockBehavior.Strict);
    analysis.Setup(service => service.GenerateInvoiceSummaryAsync(
        It.IsAny<System.Collections.Generic.IReadOnlyList<ProductAnalysisInput>>(),
        message.CorrelationId,
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new AnalysisFoundationDependencyException(new TimeoutException()));
    var service = new AnalysisOrchestrationService(
      analysis.Object,
      Mock.Of<IAnalysisQueueFoundationService>(),
      NullLoggerFactory.Instance);

    InvoiceAnalysisExecutionResult result = await service
      .ExecuteInvoiceAnalysisAsync(message, invoice, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(result.Failed);
    Assert.AreEqual(AnalysisFailureReason.Dependency, result.FailureReason);
  }

  /// <summary>
  /// Verifies enqueueing delegates to the Analysis Queue Foundation.
  /// </summary>
  [TestMethod]
  public async Task EnqueueAnalysisAsync_ValidMessage_ReturnsMessageId()
  {
    QueueAnalysisMessage message = QueueAnalysisMessage.CreateInvoiceMessage(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
    var queue = new Mock<IAnalysisQueueFoundationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisFoundationService>(MockBehavior.Strict);
    queue.Setup(service => service.EnqueueAsync(message, It.IsAny<CancellationToken>()))
      .ReturnsAsync("message-1");
    var service = new AnalysisOrchestrationService(
      analysis.Object,
      queue.Object,
      NullLoggerFactory.Instance);

    string result = await service
      .EnqueueAnalysisAsync(message, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual("message-1", result);
    queue.VerifyAll();
  }

  /// <summary>
  /// Verifies receiving analysis work delegates to the dequeue-named Foundation capability.
  /// </summary>
  [TestMethod]
  public async Task ReceiveAnalysisAsync_VisibleMessage_DelegatesToFoundationDequeue()
  {
    QueueAnalysisMessage message = QueueAnalysisMessage.CreateInvoiceMessage(
      Guid.NewGuid(),
      Guid.NewGuid(),
      Guid.NewGuid(),
      InvoiceAnalysisOptions.Fast(),
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
    var receipt = new AnalysisQueueReceipt(
      message,
      "message-1",
      "pop-receipt",
      dequeueCount: 1,
      DateTimeOffset.UtcNow);
    var queue = new Mock<IAnalysisQueueFoundationService>(MockBehavior.Strict);
    var analysis = new Mock<IAnalysisFoundationService>(MockBehavior.Strict);
    queue.Setup(service => service.DequeueAsync(
        TimeSpan.FromMinutes(2),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(receipt);
    var service = new AnalysisOrchestrationService(
      analysis.Object,
      queue.Object,
      NullLoggerFactory.Instance);

    AnalysisQueueReceipt? result = await service
      .ReceiveAnalysisAsync(TimeSpan.FromMinutes(2), CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreSame(receipt, result);
    queue.VerifyAll();
  }
}
