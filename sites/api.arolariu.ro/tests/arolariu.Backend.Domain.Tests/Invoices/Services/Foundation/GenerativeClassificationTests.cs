namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Azure;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the reusable two-phase structured classification engine and its exception classification behavior for
/// <see cref="GenerativeAnalysisFoundationService"/>.
/// </summary>
[TestClass]
public sealed class GenerativeClassificationTests
{
  /// <summary>
  /// Verifies the happy path from the task brief: a valid structured search-term and selection round trip resolves
  /// to the canonical GPC classification for the requested correlation token.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_ValidStructuredSelection_ReturnsCanonicalGpcClassification()
  {
    var harness = GenerativeClassificationHarness.ForProduct(
      searchTerms: ["milk", "perishable dairy"],
      selectedCode: "10000025");

    ProductClassificationResult result = await harness.Service.ClassifyProductsAsync(
      [new ProductAnalysisInput("item-0001", new Product { Name = "lapte" })],
      CancellationToken.None);

    Assert.AreEqual("10000025", result.Classifications["item-0001"].Code);
    Assert.AreEqual(ClassificationSystem.Gs1Gpc, result.Classifications["item-0001"].System);
    Assert.AreEqual(ClassificationOrigin.Analysis, result.Classifications["item-0001"].Origin);
  }

  /// <summary>
  /// Verifies that products are batched into exactly one search-term call and one selection call, regardless of how
  /// many products are submitted.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_MultipleProducts_BatchesIntoTwoStructuredCalls()
  {
    var searchTermsResult = new GenerativeAnalysisFoundationService.SearchTermsBatchResult(
      [
        new GenerativeAnalysisFoundationService.SearchTermsEntry("item-0001", ["milk"]),
        new GenerativeAnalysisFoundationService.SearchTermsEntry("item-0002", ["milk"]),
      ]);

    var selectionResult = new GenerativeAnalysisFoundationService.SelectionBatchResult(
      [
        new GenerativeAnalysisFoundationService.SelectionEntry("item-0001", "10000025", 0.9),
        new GenerativeAnalysisFoundationService.SelectionEntry("item-0002", "10000025", 0.8),
      ]);

    var broker = new ScriptedGenerativeAiBroker(
      ScriptedGenerativeAiBroker.Success(searchTermsResult),
      ScriptedGenerativeAiBroker.Success(selectionResult));

    var harness = GenerativeClassificationHarness.Create(broker);

    ProductClassificationResult result = await harness.Service.ClassifyProductsAsync(
      [
        new ProductAnalysisInput("item-0001", new Product { Name = "lapte" }),
        new ProductAnalysisInput("item-0002", new Product { Name = "unt" }),
      ],
      CancellationToken.None);

    Assert.AreEqual(2, result.Classifications.Count);
    Assert.AreEqual(2, broker.InvocationCount);
  }

  /// <summary>
  /// Verifies that an AI-selected code which was never offered as a bounded candidate is rejected as invalid
  /// structured output and never resolved canonically.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_SelectedCodeNotAmongCandidates_ThrowsDependencyException()
  {
    var harness = GenerativeClassificationHarness.ForProduct(
      searchTerms: ["milk"],
      selectedCode: "99999999");

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.Service.ClassifyProductsAsync(
        [new ProductAnalysisInput("item-0001", new Product { Name = "lapte" })],
        CancellationToken.None));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that a duplicate correlation token in the search-term phase response is rejected.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_DuplicateCorrelationTokenInResponse_ThrowsDependencyException()
  {
    var searchTermsResult = new GenerativeAnalysisFoundationService.SearchTermsBatchResult(
      [
        new GenerativeAnalysisFoundationService.SearchTermsEntry("item-0001", ["milk"]),
        new GenerativeAnalysisFoundationService.SearchTermsEntry("item-0001", ["butter"]),
      ]);

    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(searchTermsResult));
    var harness = GenerativeClassificationHarness.Create(broker);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.Service.ClassifyProductsAsync(
        [new ProductAnalysisInput("item-0001", new Product { Name = "lapte" })],
        CancellationToken.None));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that a search-term phase response missing a requested correlation token is rejected.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_MissingCorrelationTokenInResponse_ThrowsDependencyException()
  {
    var searchTermsResult = new GenerativeAnalysisFoundationService.SearchTermsBatchResult([]);
    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(searchTermsResult));
    var harness = GenerativeClassificationHarness.Create(broker);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.Service.ClassifyProductsAsync(
        [new ProductAnalysisInput("item-0001", new Product { Name = "lapte" })],
        CancellationToken.None));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that a search-term phase response referencing an unknown correlation token is rejected.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_UnknownCorrelationTokenInResponse_ThrowsDependencyException()
  {
    var searchTermsResult = new GenerativeAnalysisFoundationService.SearchTermsBatchResult(
      [new GenerativeAnalysisFoundationService.SearchTermsEntry("unknown-token", ["milk"])]);

    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(searchTermsResult));
    var harness = GenerativeClassificationHarness.Create(broker);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.Service.ClassifyProductsAsync(
        [new ProductAnalysisInput("item-0001", new Product { Name = "lapte" })],
        CancellationToken.None));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that a provider refusal or content-filter rejection surfaces as a non-retryable dependency-validation
  /// failure and that no retry is attempted.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_ProviderRefusal_ThrowsDependencyValidationExceptionWithoutRetry()
  {
    var broker = new ScriptedGenerativeAiBroker(
      ScriptedGenerativeAiBroker.Failure(new RequestFailedException(400, "content_filter")));

    var harness = GenerativeClassificationHarness.Create(broker);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyValidationException>(
      () => harness.Service.ClassifyProductsAsync(
        [new ProductAnalysisInput("item-0001", new Product { Name = "lapte" })],
        CancellationToken.None));

    Assert.IsInstanceOfType<RequestFailedException>(exception.InnerException);
    Assert.AreEqual(1, broker.InvocationCount);
  }

  /// <summary>
  /// Verifies that the absence of a typed structured result (invalid schema / unparseable output) surfaces as a
  /// non-retryable dependency failure.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_NoTypedStructuredResult_ThrowsDependencyExceptionWithoutRetry()
  {
    var broker = new ScriptedGenerativeAiBroker(
      ScriptedGenerativeAiBroker.Failure(new InvalidStructuredOutputException("Provider did not return a typed structured result.")));

    var harness = GenerativeClassificationHarness.Create(broker);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.Service.ClassifyProductsAsync(
        [new ProductAnalysisInput("item-0001", new Product { Name = "lapte" })],
        CancellationToken.None));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
    Assert.AreEqual(1, broker.InvocationCount);
  }

  /// <summary>
  /// Verifies that real cancellation propagates as-is instead of being classified or retried.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_CancellationRequested_PropagatesWithoutRetry()
  {
    using var cts = new CancellationTokenSource();
    await cts.CancelAsync();

    var broker = new ScriptedGenerativeAiBroker(
      ScriptedGenerativeAiBroker.Failure(new TaskCanceledException()));

    var harness = GenerativeClassificationHarness.Create(broker);

    await Assert.ThrowsExactlyAsync<TaskCanceledException>(
      () => harness.Service.ClassifyProductsAsync(
        [new ProductAnalysisInput("item-0001", new Product { Name = "lapte" })],
        cts.Token));

    Assert.AreEqual(1, broker.InvocationCount);
  }

  /// <summary>
  /// Verifies that duplicate correlation tokens supplied by the caller are rejected before any broker call is made.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_DuplicateInputCorrelationTokens_ThrowsValidationExceptionWithoutBrokerCall()
  {
    var broker = new ScriptedGenerativeAiBroker();
    var harness = GenerativeClassificationHarness.Create(broker);

    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => harness.Service.ClassifyProductsAsync(
        [
          new ProductAnalysisInput("item-0001", new Product { Name = "lapte" }),
          new ProductAnalysisInput("item-0001", new Product { Name = "unt" }),
        ],
        CancellationToken.None));

    Assert.AreEqual(0, broker.InvocationCount);
  }

  /// <summary>
  /// Verifies that <see cref="GenerativeAnalysisFoundationService.ClassifyInvoiceAsync"/> resolves a canonical
  /// ECOICOP v2 classification for the analysis run.
  /// </summary>
  [TestMethod]
  public async Task ClassifyInvoiceAsync_ValidStructuredSelection_ReturnsCanonicalEcoicopClassification()
  {
    Guid sourceRunId = Guid.NewGuid();

    var harness = GenerativeClassificationHarness.ForProduct(
      searchTerms: ["cereals"],
      selectedCode: "01.1.1.1",
      correlationToken: sourceRunId.ToString());

    var extraction = new ReceiptExtractionResult(
      merchantCandidate: null,
      products: [new ExtractedProduct("Cereale", 1m, "buc", string.Empty, 5m, 0.9)],
      paymentInformation: new PaymentInformation(),
      receiptType: "SaleReceipt",
      countryRegion: "RO",
      taxDetails: [],
      payments: []);

    var products = new ProductClassificationResult(new Dictionary<string, StandardClassification>(StringComparer.Ordinal));

    InvoiceClassificationResult result = await harness.Service.ClassifyInvoiceAsync(
      extraction,
      products,
      sourceRunId,
      CancellationToken.None);

    Assert.AreEqual("01.1.1.1", result.Classification.Code);
    Assert.AreEqual(ClassificationSystem.EcoicopV2, result.Classification.System);
  }

  /// <summary>
  /// Verifies that <see cref="GenerativeAnalysisFoundationService.ClassifyMerchantAsync"/> resolves a canonical
  /// NACE 2.1 classification for the analysis run.
  /// </summary>
  [TestMethod]
  public async Task ClassifyMerchantAsync_ValidStructuredSelection_ReturnsCanonicalNaceClassification()
  {
    Guid sourceRunId = Guid.NewGuid();

    var harness = GenerativeClassificationHarness.ForProduct(
      searchTerms: ["agriculture", "fishing"],
      selectedCode: "A",
      correlationToken: sourceRunId.ToString());

    var merchant = new Merchant
    {
      Name = "Ferma Test SRL",
      Category = MerchantCategory.SUPERMARKET,
      Address = new ContactInformation { Address = "Bucharest, Romania" },
    };

    MerchantClassificationResult result = await harness.Service.ClassifyMerchantAsync(
      merchant,
      sourceRunId,
      CancellationToken.None);

    Assert.AreEqual("A", result.Classification.Code);
    Assert.AreEqual(ClassificationSystem.Nace21, result.Classification.System);
  }

  /// <summary>
  /// Verifies that an empty product batch is rejected before any broker call is made.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_EmptyProductBatch_ThrowsValidationException()
  {
    var broker = new ScriptedGenerativeAiBroker();
    var harness = GenerativeClassificationHarness.Create(broker);

    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => harness.Service.ClassifyProductsAsync([], CancellationToken.None));

    Assert.AreEqual(0, broker.InvocationCount);
  }
}
