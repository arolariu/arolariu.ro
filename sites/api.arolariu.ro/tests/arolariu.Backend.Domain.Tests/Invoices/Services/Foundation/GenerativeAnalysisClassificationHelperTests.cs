namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Tests.Builders;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using GenerativeService = arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis.GenerativeAnalysisFoundationService;

/// <summary>
/// Verifies classification helper branches observable through classification requests.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisClassificationHelperTests
{
  /// <summary>
  /// Verifies invoice descriptions render the empty-merchant and empty-category branches in the prompt payload.
  /// </summary>
  [TestMethod]
  public async Task ClassifyInvoiceAsync_NullMerchantAndNoCategories_BuildsEmptyDescriptionFields()
  {
    Guid sourceRunId = Guid.NewGuid();
    var broker = new ScriptedGenerativeAiBroker(
      ScriptedGenerativeAiBroker.Success(new GenerativeService.SearchTermsBatchResult(
        [new GenerativeService.SearchTermsEntry(sourceRunId.ToString(), ["cereals"])])),
      ScriptedGenerativeAiBroker.Success(new GenerativeService.SelectionBatchResult(
        [new GenerativeService.SelectionEntry(sourceRunId.ToString(), "01.1.1.1", 0.8)])));
    GenerativeClassificationHarness harness = GenerativeClassificationHarness.Create(broker);

    _ = await harness.Service.ClassifyInvoiceAsync(
      CreateExtraction(merchantCandidate: null, productName: "Paine"),
      new ProductClassificationResult(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)),
      sourceRunId,
      CancellationToken.None);

    string payload = JsonSerializer.Serialize(broker.CapturedRequests[0].UserPayload);
    StringAssert.Contains(payload, "Merchant: .", StringComparison.Ordinal);
    StringAssert.Contains(payload, "Products: Paine.", StringComparison.Ordinal);
    StringAssert.Contains(payload, "Detected product categories: .", StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies invoice descriptions include non-empty merchant, product, and category fields.
  /// </summary>
  [TestMethod]
  public async Task ClassifyInvoiceAsync_MerchantProductsAndCategories_BuildsPopulatedDescriptionFields()
  {
    Guid sourceRunId = Guid.NewGuid();
    var broker = new ScriptedGenerativeAiBroker(
      ScriptedGenerativeAiBroker.Success(new GenerativeService.SearchTermsBatchResult(
        [new GenerativeService.SearchTermsEntry(sourceRunId.ToString(), ["cereals"])])),
      ScriptedGenerativeAiBroker.Success(new GenerativeService.SelectionBatchResult(
        [new GenerativeService.SelectionEntry(sourceRunId.ToString(), "01.1.1.1", 0.8)])));
    GenerativeClassificationHarness harness = GenerativeClassificationHarness.Create(broker);
    var classifications = new ProductClassificationResult(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
    {
      ["item-0001"] = ClassificationTestData.Gpc("10000025", "Milk (Perishable)"),
    });

    _ = await harness.Service.ClassifyInvoiceAsync(
      CreateExtraction(new MerchantCandidate("Corner Shop", string.Empty, string.Empty, 0.9, 0.0, 0.0), "Lapte"),
      classifications,
      sourceRunId,
      CancellationToken.None);

    string payload = JsonSerializer.Serialize(broker.CapturedRequests[0].UserPayload);
    StringAssert.Contains(payload, "Merchant: Corner Shop.", StringComparison.Ordinal);
    StringAssert.Contains(payload, "Products: Lapte.", StringComparison.Ordinal);
    StringAssert.Contains(payload, "Detected product categories: Milk (Perishable).", StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies unsupported classification systems are rejected by the system-description helper.
  /// </summary>
  [TestMethod]
  public void DescribeSystem_UnknownClassificationSystem_ThrowsArgumentOutOfRangeException()
  {
    MethodInfo method = GetDescribeSystemMethod();

    TargetInvocationException exception = Assert.ThrowsExactly<TargetInvocationException>(
      () => method.Invoke(null, [(ClassificationSystem)999]));

    Assert.IsInstanceOfType<ArgumentOutOfRangeException>(exception.InnerException);
  }

  private static MethodInfo GetDescribeSystemMethod() =>
    typeof(GenerativeAnalysisFoundationService).GetMethod(
      "DescribeSystem",
      BindingFlags.NonPublic | BindingFlags.Static)
    ?? throw new InvalidOperationException("DescribeSystem method could not be located.");

  private static ReceiptExtractionResult CreateExtraction(MerchantCandidate? merchantCandidate, string productName) =>
    new(
      merchantCandidate,
      [new ExtractedProduct(productName, 1m, "buc", string.Empty, 5m, 0.9)],
      new PaymentInformation(),
      "SaleReceipt",
      "RO",
      [],
      []);
}


