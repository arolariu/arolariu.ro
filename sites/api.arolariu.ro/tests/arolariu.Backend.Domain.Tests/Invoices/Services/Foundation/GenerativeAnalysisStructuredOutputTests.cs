namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using GenerativeService = arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis.GenerativeAnalysisFoundationService;

/// <summary>
/// Verifies structured classification guard branches in the generative analysis foundation service.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisStructuredOutputTests
{
  /// <summary>
  /// Verifies that a null search-term subject collection is rejected as invalid structured output.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_NullSearchTermSubjects_ThrowsDependencyException()
  {
    var searchTermsResult = new GenerativeService.SearchTermsBatchResult(null!);
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(searchTermsResult));
    var harness = GenerativeClassificationHarness.Create(broker);

    await AssertInvalidStructuredOutputAsync(
      () => harness.Service.ClassifyProductsAsync(CreateProducts(), CancellationToken.None));
  }

  /// <summary>
  /// Verifies that an empty correlation token in search-term output is rejected.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_EmptySearchTermCorrelationToken_ThrowsDependencyException()
  {
    var searchTermsResult = new GenerativeService.SearchTermsBatchResult(
      [new GenerativeService.SearchTermsEntry(string.Empty, ["milk"])]);
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(searchTermsResult));
    var harness = GenerativeClassificationHarness.Create(broker);

    await AssertInvalidStructuredOutputAsync(
      () => harness.Service.ClassifyProductsAsync(CreateProducts(), CancellationToken.None));
  }

  /// <summary>
  /// Verifies that a null generated search-terms collection is rejected.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_NullSearchTerms_ThrowsDependencyException()
  {
    var searchTermsResult = new GenerativeService.SearchTermsBatchResult(
      [new GenerativeService.SearchTermsEntry("item-0001", null!)]);
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(searchTermsResult));
    var harness = GenerativeClassificationHarness.Create(broker);

    await AssertInvalidStructuredOutputAsync(
      () => harness.Service.ClassifyProductsAsync(CreateProducts(), CancellationToken.None));
  }

  /// <summary>
  /// Verifies that an empty generated search-terms collection is rejected.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_EmptySearchTerms_ThrowsDependencyException()
  {
    var searchTermsResult = new GenerativeService.SearchTermsBatchResult(
      [new GenerativeService.SearchTermsEntry("item-0001", [])]);
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(searchTermsResult));
    var harness = GenerativeClassificationHarness.Create(broker);

    await AssertInvalidStructuredOutputAsync(
      () => harness.Service.ClassifyProductsAsync(CreateProducts(), CancellationToken.None));
  }

  /// <summary>
  /// Verifies that all-whitespace generated search terms are rejected.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_AllWhitespaceSearchTerms_ThrowsDependencyException()
  {
    var searchTermsResult = new GenerativeService.SearchTermsBatchResult(
      [new GenerativeService.SearchTermsEntry("item-0001", [" ", "\t"])]);
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(searchTermsResult));
    var harness = GenerativeClassificationHarness.Create(broker);

    await AssertInvalidStructuredOutputAsync(
      () => harness.Service.ClassifyProductsAsync(CreateProducts(), CancellationToken.None));
  }

  /// <summary>
  /// Verifies that a null selection subject collection is rejected.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_NullSelectionSubjects_ThrowsDependencyException()
  {
    var broker = new ScriptedGenerativeAnalysisBroker(
      ScriptedGenerativeAnalysisBroker.Success(CreateSearchTerms(["milk"])),
      ScriptedGenerativeAnalysisBroker.Success(new GenerativeService.SelectionBatchResult(null!)));
    var harness = GenerativeClassificationHarness.Create(broker);

    await AssertInvalidStructuredOutputAsync(
      () => harness.Service.ClassifyProductsAsync(CreateProducts(), CancellationToken.None));
  }

  /// <summary>
  /// Verifies that a selection response missing the requested correlation token is rejected.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_MissingSelectionCorrelationToken_ThrowsDependencyException()
  {
    var broker = new ScriptedGenerativeAnalysisBroker(
      ScriptedGenerativeAnalysisBroker.Success(CreateSearchTerms(["milk"])),
      ScriptedGenerativeAnalysisBroker.Success(new GenerativeService.SelectionBatchResult([])));
    var harness = GenerativeClassificationHarness.Create(broker);

    await AssertInvalidStructuredOutputAsync(
      () => harness.Service.ClassifyProductsAsync(CreateProducts(), CancellationToken.None));
  }

  /// <summary>
  /// Verifies that a selection response with an unknown correlation token is rejected.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_UnknownSelectionCorrelationToken_ThrowsDependencyException()
  {
    var selection = new GenerativeService.SelectionBatchResult(
      [new GenerativeService.SelectionEntry("unknown-token", "10000025", 0.8)]);
    var broker = new ScriptedGenerativeAnalysisBroker(
      ScriptedGenerativeAnalysisBroker.Success(CreateSearchTerms(["milk"])),
      ScriptedGenerativeAnalysisBroker.Success(selection));
    var harness = GenerativeClassificationHarness.Create(broker);

    await AssertInvalidStructuredOutputAsync(
      () => harness.Service.ClassifyProductsAsync(CreateProducts(), CancellationToken.None));
  }

  /// <summary>
  /// Verifies that duplicate selection correlation tokens are rejected.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_DuplicateSelectionCorrelationToken_ThrowsDependencyException()
  {
    var selection = new GenerativeService.SelectionBatchResult(
      [
        new GenerativeService.SelectionEntry("item-0001", "10000025", 0.8),
        new GenerativeService.SelectionEntry("item-0001", "10000025", 0.7),
      ]);
    var broker = new ScriptedGenerativeAnalysisBroker(
      ScriptedGenerativeAnalysisBroker.Success(CreateSearchTerms(["milk"])),
      ScriptedGenerativeAnalysisBroker.Success(selection));
    var harness = GenerativeClassificationHarness.Create(broker);

    await AssertInvalidStructuredOutputAsync(
      () => harness.Service.ClassifyProductsAsync(CreateProducts(), CancellationToken.None));
  }

  /// <summary>
  /// Verifies that a blank selected taxonomy code is rejected before canonical resolution.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_BlankSelectedCode_ThrowsDependencyException()
  {
    var selection = new GenerativeService.SelectionBatchResult(
      [new GenerativeService.SelectionEntry("item-0001", " ", 0.8)]);
    var broker = new ScriptedGenerativeAnalysisBroker(
      ScriptedGenerativeAnalysisBroker.Success(CreateSearchTerms(["milk"])),
      ScriptedGenerativeAnalysisBroker.Success(selection));
    var harness = GenerativeClassificationHarness.Create(broker);

    await AssertInvalidStructuredOutputAsync(
      () => harness.Service.ClassifyProductsAsync(CreateProducts(), CancellationToken.None));
  }

  /// <summary>
  /// Verifies that blank search terms are skipped and collected taxonomy candidates are capped at ten per subject.
  /// </summary>
  [TestMethod]
  public async Task ClassifyInvoiceAsync_BlankSearchTermsAndLargeCatalog_CapsCandidatesAtTen()
  {
    Guid sourceRunId = Guid.NewGuid();
    var searchTermsResult = new GenerativeService.SearchTermsBatchResult(
      [new GenerativeService.SearchTermsEntry(
        sourceRunId.ToString(),
        [" ", "item 03", "item 09", "item 15", "item 21", "item 27", "item 05", "item 11", "item 17", "item 23"])]);
    var selectionResult = new GenerativeService.SelectionBatchResult(
      [new GenerativeService.SelectionEntry(sourceRunId.ToString(), "01.1.03", 0.8)]);
    var broker = new ScriptedGenerativeAnalysisBroker(
      ScriptedGenerativeAnalysisBroker.Success(searchTermsResult),
      ScriptedGenerativeAnalysisBroker.Success(selectionResult));
    var harness = GenerativeClassificationHarness.Create(
      broker,
      TaxonomyBrokerTestFactory.CreateLargeEcoicopBroker(30));

    _ = await harness.Service.ClassifyInvoiceAsync(
      CreateExtraction(merchantCandidate: null),
      new ProductClassificationResult(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)),
      sourceRunId,
      CancellationToken.None);

    using JsonDocument document = JsonSerializer.SerializeToDocument(broker.CapturedRequests[1].UserPayload);
    JsonElement candidates = document.RootElement.GetProperty("subjects")[0].GetProperty("candidates");
    Assert.AreEqual(10, candidates.GetArrayLength());
  }

  /// <summary>
  /// Verifies that a missing receipt merchant candidate is described as an empty merchant field without failing classification.
  /// </summary>
  [TestMethod]
  public async Task ClassifyInvoiceAsync_NullMerchantCandidate_BuildsDescriptionWithEmptyMerchant()
  {
    Guid sourceRunId = Guid.NewGuid();
    var broker = new ScriptedGenerativeAnalysisBroker(
      ScriptedGenerativeAnalysisBroker.Success(new GenerativeService.SearchTermsBatchResult(
        [new GenerativeService.SearchTermsEntry(sourceRunId.ToString(), ["cereals"])])),
      ScriptedGenerativeAnalysisBroker.Success(new GenerativeService.SelectionBatchResult(
        [new GenerativeService.SelectionEntry(sourceRunId.ToString(), "01.1.1.1", 0.8)])));
    var harness = GenerativeClassificationHarness.Create(broker);

    _ = await harness.Service.ClassifyInvoiceAsync(
      CreateExtraction(merchantCandidate: null),
      new ProductClassificationResult(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)),
      sourceRunId,
      CancellationToken.None);

    string payload = JsonSerializer.Serialize(broker.CapturedRequests[0].UserPayload);
    StringAssert.Contains(payload, "Merchant: .", StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies that a merchant without a classification uses the unknown category fallback in the classification prompt.
  /// </summary>
  [TestMethod]
  public async Task ClassifyMerchantAsync_NullMerchantClassification_UsesUnknownCategoryDescription()
  {
    Guid sourceRunId = Guid.NewGuid();
    var broker = new ScriptedGenerativeAnalysisBroker(
      ScriptedGenerativeAnalysisBroker.Success(new GenerativeService.SearchTermsBatchResult(
        [new GenerativeService.SearchTermsEntry(sourceRunId.ToString(), ["agriculture"])])),
      ScriptedGenerativeAnalysisBroker.Success(new GenerativeService.SelectionBatchResult(
        [new GenerativeService.SelectionEntry(sourceRunId.ToString(), "A", 0.8)])));
    var harness = GenerativeClassificationHarness.Create(broker);
    var merchant = new Merchant
    {
      Name = "Sparse Merchant",
      Classification = null,
      Address = new ContactInformation { Address = "Bucharest" },
    };

    _ = await harness.Service.ClassifyMerchantAsync(merchant, sourceRunId, CancellationToken.None);

    string payload = JsonSerializer.Serialize(broker.CapturedRequests[0].UserPayload);
    StringAssert.Contains(payload, "Category: unknown.", StringComparison.Ordinal);
  }

  private static IReadOnlyList<ProductAnalysisInput> CreateProducts() =>
    [new ProductAnalysisInput("item-0001", new Product { Name = "lapte" })];

  private static GenerativeService.SearchTermsBatchResult CreateSearchTerms(IReadOnlyList<string> terms) =>
    new([new GenerativeService.SearchTermsEntry("item-0001", terms)]);

  private static ReceiptExtractionResult CreateExtraction(MerchantCandidate? merchantCandidate) =>
    new(
      merchantCandidate,
      [new ExtractedProduct("Cereale", 1m, "buc", string.Empty, 5m, 0.9)],
      new PaymentInformation(),
      "SaleReceipt",
      "RO",
      [],
      []);

  private static async Task AssertInvalidStructuredOutputAsync(Func<Task> action)
  {
    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(action);
    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }
}

