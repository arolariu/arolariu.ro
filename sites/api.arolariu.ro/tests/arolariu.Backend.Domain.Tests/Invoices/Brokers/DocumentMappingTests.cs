namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Azure;
using Azure.AI.DocumentIntelligence;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies Azure Document Intelligence field mapping into provider-neutral receipt contracts.
/// </summary>
[TestClass]
public sealed class DocumentMappingTests
{
  /// <summary>
  /// Verifies the broker's production analysis activity never exports a receipt scan URI, path, query, or credential.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeReceiptAsync_ScanUriContainsPathAndCredential_DoesNotRecordSensitiveLocationTags()
  {
    Uri scanLocation = new("https://storage.example.test/private/invoices/receipt-42.png?sig=secret-sas-token");
    var client = new Mock<DocumentIntelligenceClient>(
      MockBehavior.Strict,
      new Uri("https://document-intelligence.example.test"),
      new AzureKeyCredential("test-key"));
    client
      .Setup(service => service.AnalyzeDocumentAsync(
        WaitUntil.Completed,
        It.IsAny<string>(),
        scanLocation,
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("Provider call failed."));
    var broker = new AzureDocumentIntelligenceBroker(client.Object);
    using var recorder = new InvoiceActivityRecorder();

    await Assert.ThrowsExactlyAsync<InvalidOperationException>(
      () => broker.AnalyzeReceiptAsync(scanLocation, CancellationToken.None).AsTask()).ConfigureAwait(false);

    Activity activity = recorder.FindActivity(nameof(AzureDocumentIntelligenceBroker.AnalyzeReceiptAsync))
      ?? throw new AssertFailedException("The receipt-analysis activity was not recorded.");
    string tags = string.Join(
      "\n",
      activity.Tags.Select(tag => $"{tag.Key}={tag.Value}"));

    Assert.IsNull(activity.GetTagItem("receipt.scan.location"));
    Assert.IsFalse(tags.Contains(scanLocation.ToString(), StringComparison.Ordinal));
    Assert.IsFalse(tags.Contains("/private/invoices/", StringComparison.Ordinal));
    Assert.IsFalse(tags.Contains("sig=secret-sas-token", StringComparison.Ordinal));
  }

  /// <summary>
  /// Verifies that Azure receipt fields are mapped into provider-neutral records without touching domain aggregates.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_ValidAnalyzedDocument_MapsValuesAndConfidence()
  {
    var analyzedDocument = ReceiptDocumentTestData.AzureAnalyzedDocument();

    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(analyzedDocument);

    Assert.AreEqual("Contoso Market", receiptDocument.Merchant.Name.Value);
    Assert.AreEqual("RO", receiptDocument.CountryRegion.Value);
    Assert.AreEqual("itemized", receiptDocument.ReceiptType.Value);
    Assert.AreEqual(1, receiptDocument.Products.Count);
    Assert.AreEqual("Milk", receiptDocument.Products[0].Name.Value);
    Assert.AreEqual(2m, receiptDocument.Products[0].Quantity.Value);
    Assert.AreEqual("SKU-1", receiptDocument.Products[0].ProductCode.Value);
    Assert.AreEqual(0.81, receiptDocument.Products[0].Confidence, 0.0001);
    Assert.AreEqual(15.50m, receiptDocument.Payment.TotalAmount.Value);
    Assert.AreEqual(1, receiptDocument.TaxDetails.Count);
    Assert.AreEqual(1, receiptDocument.Payments.Count);
  }

  /// <summary>
  /// Verifies source-scan stamping propagates to all nested provider-neutral fields.
  /// </summary>
  [TestMethod]
  public void WithSourceScanIndex_StampedDocument_PropagatesIndexToNestedFields()
  {
    var analyzedDocument = ReceiptDocumentTestData.AzureAnalyzedDocument();
    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(analyzedDocument);

    ReceiptDocument stampedDocument = receiptDocument.WithSourceScanIndex(2);

    Assert.AreEqual(2, stampedDocument.Merchant.Name.SourceScanIndex);
    Assert.AreEqual(2, stampedDocument.Products[0].Name.SourceScanIndex);
    Assert.AreEqual(2, stampedDocument.Payment.TotalAmount.SourceScanIndex);
    Assert.AreEqual(2, stampedDocument.TaxDetails[0].Amount.SourceScanIndex);
    Assert.AreEqual(2, stampedDocument.Payments[0].Method.SourceScanIndex);
  }

  /// <summary>
  /// Verifies unsupported root field types do not leak arbitrary OCR content into string output fields.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_WhenRootStringFieldsUseUnsupportedTypes_IgnoresArbitraryContent()
  {
    var analyzedDocument = ReceiptDocumentTestData.AzureAnalyzedDocumentWithUnsupportedRootStringTypes();

    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(analyzedDocument);

    Assert.AreEqual(string.Empty, receiptDocument.Merchant.Name.Value);
    Assert.AreEqual(string.Empty, receiptDocument.Merchant.Address.Value);
    Assert.AreEqual(string.Empty, receiptDocument.Merchant.PhoneNumber.Value);
    Assert.AreEqual(string.Empty, receiptDocument.ReceiptType.Value);
    Assert.AreEqual(string.Empty, receiptDocument.CountryRegion.Value);
  }

  /// <summary>
  /// Verifies unsupported nested field types do not leak arbitrary OCR content into product, tax, or payment strings.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_WhenNestedStringFieldsUseUnsupportedTypes_IgnoresArbitraryContent()
  {
    var analyzedDocument = ReceiptDocumentTestData.AzureAnalyzedDocumentWithUnsupportedNestedStringTypes();

    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(analyzedDocument);

    Assert.AreEqual(1, receiptDocument.Products.Count);
    Assert.AreEqual(string.Empty, receiptDocument.Products[0].Name.Value);
    Assert.AreEqual(string.Empty, receiptDocument.Products[0].QuantityUnit.Value);
    Assert.AreEqual(string.Empty, receiptDocument.Products[0].ProductCode.Value);
    Assert.AreEqual(1, receiptDocument.TaxDetails.Count);
    Assert.AreEqual(string.Empty, receiptDocument.TaxDetails[0].Description.Value);
    Assert.AreEqual(1, receiptDocument.Payments.Count);
    Assert.AreEqual(string.Empty, receiptDocument.Payments[0].Method.Value);
  }

  /// <summary>
  /// Verifies a sparse provider response produces safe empty collections and absent optional values rather than
  /// inventing receipt information from unavailable OCR fields.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_WhenOptionalCollectionsAndPaymentFieldsAreAbsent_MapsSafeEmptyReceiptSections()
  {
    var analyzedDocument = ReceiptDocumentTestData.AzureAnalyzedDocumentWithMissingOptionalSections();

    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(analyzedDocument);

    Assert.HasCount(0, receiptDocument.Products);
    Assert.HasCount(0, receiptDocument.TaxDetails);
    Assert.HasCount(0, receiptDocument.Payments);
    Assert.IsNull(receiptDocument.Payment.TransactionDate.Value);
    Assert.IsNull(receiptDocument.Payment.Currency.Value);
    Assert.IsNull(receiptDocument.Payment.TotalAmount.Value);
    Assert.AreEqual(0.0, receiptDocument.Payment.TotalAmount.Confidence, 0.0001);
  }

  /// <summary>
  /// Verifies provider alternate field types and a digit-only transaction time are mapped without allowing
  /// malformed collection entries to become receipt products, taxes, or payments.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_WhenProviderUsesAlternatesAndMalformedCollectionEntries_MapsOnlyValidReceiptData()
  {
    var analyzedDocument = ReceiptDocumentTestData.AzureAnalyzedDocumentWithAlternatesAndMalformedCollectionEntries();

    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(analyzedDocument);

    Assert.AreEqual("+40 700 000 000", receiptDocument.Merchant.PhoneNumber.Value);
    Assert.AreEqual(25m, receiptDocument.Payment.TotalAmount.Value);
    Assert.AreEqual(new DateTimeOffset(2026, 08, 16, 12, 34, 56, TimeSpan.Zero), receiptDocument.Payment.TransactionDate.Value);
    Assert.AreEqual(1, receiptDocument.Products.Count);
    Assert.AreEqual("Bread", receiptDocument.Products[0].Name.Value);
    Assert.AreEqual(1, receiptDocument.TaxDetails.Count);
    Assert.AreEqual("VAT", receiptDocument.TaxDetails[0].Description.Value);
    Assert.AreEqual(1, receiptDocument.Payments.Count);
    Assert.AreEqual("cash", receiptDocument.Payments[0].Method.Value);
  }

  /// <summary>
  /// Verifies nullable provider values and null collection payloads are represented as safe absent receipt data
  /// while supported phone and country content fallbacks retain their non-sensitive values.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_WhenProviderReturnsNullValuesAndCollections_MapsSafeFallbacksWithoutInventingData()
  {
    var analyzedDocument = ReceiptDocumentTestData.AzureAnalyzedDocumentWithNullValuesAndCollections();

    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(analyzedDocument);

    Assert.AreEqual("+40 700 000 001", receiptDocument.Merchant.PhoneNumber.Value);
    Assert.AreEqual("RO", receiptDocument.CountryRegion.Value);
    Assert.IsNull(receiptDocument.Payment.Currency.Value);
    Assert.AreEqual(new DateTimeOffset(2026, 08, 16, 0, 0, 0, TimeSpan.Zero), receiptDocument.Payment.TransactionDate.Value);
    Assert.HasCount(0, receiptDocument.Products);
    Assert.HasCount(0, receiptDocument.TaxDetails);
    Assert.HasCount(0, receiptDocument.Payments);
  }

  /// <summary>
  /// Verifies a provider transaction time expressed as four digits is parsed as hours and minutes without
  /// requiring an OCR-specific time format in the provider-neutral receipt contract.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_WhenProviderReturnsFourDigitTransactionTime_MapsHoursAndMinutes()
  {
    var analyzedDocument = ReceiptDocumentTestData.AzureAnalyzedDocumentWithFourDigitTransactionTime();

    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(analyzedDocument);

    Assert.AreEqual(new DateTimeOffset(2026, 08, 16, 12, 34, 0, TimeSpan.Zero), receiptDocument.Payment.TransactionDate.Value);
  }

  /// <summary>
  /// Verifies unsupported currency candidates are discarded rather than being interpreted as a provider-neutral
  /// currency when their typed Azure values are unavailable.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_WhenCurrencyCandidatesAreUnsupportedOrNull_DoesNotInventCurrency()
  {
    var analyzedDocument = ReceiptDocumentTestData.AzureAnalyzedDocumentWithInvalidCurrencyCandidates();

    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(analyzedDocument);

    Assert.IsNull(receiptDocument.Payment.Currency.Value);
    Assert.AreEqual(0.0, receiptDocument.Payment.Currency.Confidence, 0.0001);
  }

  /// <summary>
  /// Verifies malformed transaction date and time values are ignored independently without changing a valid
  /// provider-neutral transaction date.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_WhenTransactionDateOrTimeIsMalformed_MapsOnlyTheValidDateComponent()
  {
    ReceiptDocument malformedDate = AzureDocumentIntelligenceBroker.MapReceiptDocument(
      ReceiptDocumentTestData.AzureAnalyzedDocumentWithMalformedTransactionDate());
    ReceiptDocument malformedTime = AzureDocumentIntelligenceBroker.MapReceiptDocument(
      ReceiptDocumentTestData.AzureAnalyzedDocumentWithMalformedTransactionTime());

    Assert.IsNull(malformedDate.Payment.TransactionDate.Value);
    Assert.AreEqual(new DateTimeOffset(2026, 08, 16, 0, 0, 0, TimeSpan.Zero), malformedTime.Payment.TransactionDate.Value);
  }

  /// <summary>
  /// Verifies out-of-range compact OCR times are ignored while preserving the valid date component.
  /// </summary>
  /// <param name="transactionTime">The compact time content with an invalid clock component.</param>
  [TestMethod]
  [DataRow("99:99")]
  [DataRow("235999")]
  public void MapReceiptDocument_WhenCompactTransactionTimeIsOutOfRange_PreservesDateWithoutTime(string transactionTime)
  {
    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(
      ReceiptDocumentTestData.AzureAnalyzedDocumentWithCompactTransactionTime(transactionTime));

    Assert.AreEqual(
      new DateTimeOffset(2026, 08, 16, 0, 0, 0, TimeSpan.Zero),
      receiptDocument.Payment.TransactionDate.Value);
  }

  /// <summary>
  /// Verifies the upper boundary of the supported compact time format is preserved.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_WhenCompactTransactionTimeIsMaximumValidValue_MapsHoursMinutesAndSeconds()
  {
    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(
      ReceiptDocumentTestData.AzureAnalyzedDocumentWithCompactTransactionTime("23:59:59"));

    Assert.AreEqual(
      new DateTimeOffset(2026, 08, 16, 23, 59, 59, TimeSpan.Zero),
      receiptDocument.Payment.TransactionDate.Value);
  }

  /// <summary>
  /// Verifies the broker rejects a missing scan URI before attempting an Azure SDK request.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeReceiptAsync_WhenScanUriIsNull_ThrowsArgumentNullException()
  {
    var client = new DocumentIntelligenceClient(
      new Uri("https://document-intelligence.example.test"),
      new AzureKeyCredential("test-key"));
    var broker = new AzureDocumentIntelligenceBroker(client);

    await Assert.ThrowsExactlyAsync<ArgumentNullException>(
      () => broker.AnalyzeReceiptAsync(null!, CancellationToken.None).AsTask()).ConfigureAwait(false);
  }

  /// <summary>
  /// Verifies construction from application options builds the Azure SDK client without issuing a network request.
  /// </summary>
  [TestMethod]
  public void Constructor_ValidOptionsManager_CreatesBroker()
  {
    var optionsManager = new Mock<IOptionsManager>(MockBehavior.Strict);
    optionsManager
      .Setup(manager => manager.GetApplicationOptions())
      .Returns(
        new LocalOptions
        {
          CognitiveServicesEndpoint = "https://document-intelligence.example.test",
          CognitiveServicesKey = "test-key",
        });

    var broker = new AzureDocumentIntelligenceBroker(optionsManager.Object);

    Assert.IsNotNull(broker);
    optionsManager.Verify(manager => manager.GetApplicationOptions(), Times.Once);
  }

  /// <summary>
  /// Verifies the internal Azure-client constructor rejects a missing SDK client.
  /// </summary>
  [TestMethod]
  public void Constructor_NullDocumentIntelligenceClient_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(
      () => new AzureDocumentIntelligenceBroker((DocumentIntelligenceClient)null!));

  /// <summary>
  /// Verifies a completed Azure operation with no receipt documents is rejected as invalid structured output.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeReceiptAsync_CompletedOperationWithoutDocuments_ThrowsInvalidStructuredOutputException()
  {
    Uri scanLocation = new("https://storage.example.test/receipt-empty.png");
    AnalyzeResult result = CreateAnalyzeResult([]);
    var operation = new Mock<Operation<AnalyzeResult>>(MockBehavior.Strict);
    operation.SetupGet(candidate => candidate.Value).Returns(result);
    var client = CreateClientReturning(scanLocation, operation.Object);
    var broker = new AzureDocumentIntelligenceBroker(client.Object);

    await Assert.ThrowsExactlyAsync<InvalidStructuredOutputException>(
      () => broker.AnalyzeReceiptAsync(scanLocation, CancellationToken.None).AsTask()).ConfigureAwait(false);

    client.Verify(
      service => service.AnalyzeDocumentAsync(
        WaitUntil.Completed,
        "prebuilt-receipt",
        scanLocation,
        CancellationToken.None),
      Times.Once);
  }

  /// <summary>
  /// Verifies a completed Azure operation maps its first analyzed receipt document into the neutral contract.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeReceiptAsync_CompletedOperationWithDocument_MapsReceiptDocument()
  {
    Uri scanLocation = new("https://storage.example.test/receipt-complete.png");
    AnalyzeResult result = CreateAnalyzeResult([ReceiptDocumentTestData.AzureAnalyzedDocument()]);
    var operation = new Mock<Operation<AnalyzeResult>>(MockBehavior.Strict);
    operation.SetupGet(candidate => candidate.Value).Returns(result);
    var client = CreateClientReturning(scanLocation, operation.Object);
    var broker = new AzureDocumentIntelligenceBroker(client.Object);

    ReceiptDocument receiptDocument = await broker
      .AnalyzeReceiptAsync(scanLocation, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreEqual("Contoso Market", receiptDocument.Merchant.Name.Value);
    Assert.AreEqual(1, receiptDocument.Products.Count);
  }

  /// <summary>
  /// Verifies a date without a provider transaction-time field remains a midnight date rather than inventing a time.
  /// </summary>
  [TestMethod]
  public void MapReceiptDocument_TransactionDateWithoutTime_KeepsDateAtMidnight()
  {
    ReceiptDocument receiptDocument = AzureDocumentIntelligenceBroker.MapReceiptDocument(
      ReceiptDocumentTestData.AzureAnalyzedDocumentWithTransactionDateWithoutTime());

    Assert.AreEqual(new DateTimeOffset(2026, 08, 16, 0, 0, 0, TimeSpan.Zero), receiptDocument.Payment.TransactionDate.Value);
  }

  private static Mock<DocumentIntelligenceClient> CreateClientReturning(
    Uri scanLocation,
    Operation<AnalyzeResult> operation)
  {
    var client = new Mock<DocumentIntelligenceClient>(
      MockBehavior.Strict,
      new Uri("https://document-intelligence.example.test"),
      new AzureKeyCredential("test-key"));
    client
      .Setup(service => service.AnalyzeDocumentAsync(
        WaitUntil.Completed,
        "prebuilt-receipt",
        scanLocation,
        CancellationToken.None))
      .ReturnsAsync(operation);

    return client;
  }

  private static AnalyzeResult CreateAnalyzeResult(IReadOnlyList<AnalyzedDocument> documents) =>
    DocumentIntelligenceModelFactory.AnalyzeResult(
      apiVersion: "2024-11-30",
      modelId: "prebuilt-receipt",
      contentFormat: null,
      content: string.Empty,
      pages: [],
      paragraphs: [],
      tables: [],
      figures: [],
      sections: [],
      keyValuePairs: [],
      styles: [],
      languages: [],
      documents: documents,
      warnings: []);
}
