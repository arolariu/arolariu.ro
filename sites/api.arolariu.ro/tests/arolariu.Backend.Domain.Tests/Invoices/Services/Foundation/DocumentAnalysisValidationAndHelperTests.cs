namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies document-analysis validation guards and private helper edge cases that are otherwise unreachable through provider output.
/// </summary>
[TestClass]
public sealed class DocumentAnalysisValidationAndHelperTests
{
  /// <summary>
  /// Verifies that a null scan collection is wrapped as a validation exception.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_NullScans_ThrowsValidationException()
  {
    var service = new DocumentAnalysisFoundationService(
      new ScriptedDocumentIntelligenceBroker(ReceiptDocumentTestData.Document()),
      NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.ExtractInvoiceAsync(null!, CancellationToken.None));
  }

  /// <summary>
  /// Verifies that an empty scan collection is wrapped as a validation exception.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_EmptyScans_ThrowsValidationException()
  {
    var service = new DocumentAnalysisFoundationService(
      new ScriptedDocumentIntelligenceBroker(ReceiptDocumentTestData.Document()),
      NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.ExtractInvoiceAsync([], CancellationToken.None));
  }

  /// <summary>
  /// Verifies that a default scan sentinel is wrapped as a validation exception.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_DefaultScan_ThrowsValidationException()
  {
    var service = new DocumentAnalysisFoundationService(
      new ScriptedDocumentIntelligenceBroker(ReceiptDocumentTestData.Document()),
      NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.ExtractInvoiceAsync([InvoiceScan.Default()], CancellationToken.None));
  }

  /// <summary>
  /// Verifies that a scan with a relative URI is wrapped as a validation exception.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_RelativeScanLocation_ThrowsValidationException()
  {
    var scan = new InvoiceScan(ScanType.JPG, new Uri("receipt.jpg", UriKind.Relative), null);
    var service = new DocumentAnalysisFoundationService(
      new ScriptedDocumentIntelligenceBroker(ReceiptDocumentTestData.Document()),
      NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.ExtractInvoiceAsync([scan], CancellationToken.None));
  }

  /// <summary>
  /// Verifies that a null provider document is wrapped as a validation exception.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_NullReceiptDocument_ThrowsValidationException()
  {
    var broker = new ScriptedDocumentIntelligenceBroker(
      new ScriptedDocumentIntelligenceBroker.ScriptedDocumentResponse(null, TimeSpan.Zero, null));

    var service = new DocumentAnalysisFoundationService(broker, NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));
  }

  /// <summary>
  /// Verifies that valid scans and provider output complete without validation failures.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_ValidScanAndDocument_ReturnsExtractionResult()
  {
    var service = new DocumentAnalysisFoundationService(
      new ScriptedDocumentIntelligenceBroker(ReceiptDocumentTestData.Page("Milk", 1.0m)),
      NullLoggerFactory.Instance);

    var result = await service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None);

    Assert.AreEqual(1, result.Products.Count);
  }

  /// <summary>
  /// Verifies choose-first helper behavior for empty, whitespace, and populated current values.
  /// </summary>
  /// <param name="currentValue">The current merged value.</param>
  /// <param name="candidateValue">The candidate value.</param>
  /// <param name="expectedValue">The expected chosen value.</param>
  [TestMethod]
  [DataRow("", " receipt ", "receipt")]
  [DataRow("   ", " invoice ", "invoice")]
  [DataRow("existing", " candidate ", "existing")]
  public void ChooseFirstNonEmpty_ValueCombination_ReturnsExpectedValue(
    string currentValue,
    string candidateValue,
    string expectedValue)
  {
    MethodInfo method = GetPrivateStaticMethod("ChooseFirstNonEmpty");

    var result = (string)method.Invoke(null, [currentValue, candidateValue])!;

    Assert.AreEqual(expectedValue, result);
  }

  /// <summary>
  /// Verifies positive-component derivation guard and success paths.
  /// </summary>
  /// <param name="total">The total value.</param>
  /// <param name="divisor">The divisor value.</param>
  /// <param name="expectedSuccess">The expected derivation outcome.</param>
  /// <param name="expectedValue">The expected derived value when derivation succeeds.</param>
  [TestMethod]
  [DataRow("0.0", "2.0", false, "0.0")]
  [DataRow("6.0", "0.0", false, "0.0")]
  [DataRow("6.0", "2.0", true, "3.0")]
  public void TryDerivePositiveComponent_InputCombination_ReturnsExpectedOutcome(
    string total,
    string divisor,
    bool expectedSuccess,
    string expectedValue)
  {
    MethodInfo method = GetPrivateStaticMethod("TryDerivePositiveComponent");
    object?[] arguments =
    [
      decimal.Parse(total, System.Globalization.CultureInfo.InvariantCulture),
      decimal.Parse(divisor, System.Globalization.CultureInfo.InvariantCulture),
      0.0m,
    ];

    var result = (bool)method.Invoke(null, arguments)!;

    Assert.AreEqual(expectedSuccess, result);
    Assert.AreEqual(decimal.Parse(expectedValue, System.Globalization.CultureInfo.InvariantCulture), (decimal)arguments[2]!);
  }

  /// <summary>
  /// Verifies maximum-confidence helper behavior for empty, non-improving, and improving confidence sequences.
  /// </summary>
  /// <param name="confidences">The confidence sequence selector.</param>
  /// <param name="expectedMaximum">The expected maximum confidence.</param>
  [TestMethod]
  [DataRow("empty", 0.0)]
  [DataRow("zeros", 0.0)]
  [DataRow("ascending", 0.9)]
  [DataRow("mixed", 0.7)]
  public void MaxConfidence_ConfidenceSequence_ReturnsExpectedMaximum(string confidences, double expectedMaximum)
  {
    MethodInfo method = GetPrivateStaticMethod("MaxConfidence");
    double[] values = confidences switch
    {
      "empty" => [],
      "zeros" => [0.0, 0.0],
      "ascending" => [0.2, 0.9],
      _ => [0.7, 0.3],
    };

    var result = (double)method.Invoke(null, [values])!;

    Assert.AreEqual(expectedMaximum, result);
  }

  /// <summary>
  /// Verifies private identity record property getters used during merge deduplication.
  /// </summary>
  [TestMethod]
  public void IdentityRecords_ConstructedWithValues_ExposePropertyValues()
  {
    object productIdentity = CreateNestedRecord("ProductIdentity", ["MILK", "SKU-1", 1.0m, 2.0m]);
    object taxIdentity = CreateNestedRecord("TaxIdentity", ["VAT", 1.9m, 19.0m, 10.0m]);
    object paymentIdentity = CreateNestedRecord("PaymentIdentity", ["CARD", 11.9m]);

    Assert.AreEqual("MILK", ReadProperty<string>(productIdentity, "Name"));
    Assert.AreEqual("VAT", ReadProperty<string>(taxIdentity, "Description"));
    Assert.AreEqual("CARD", ReadProperty<string>(paymentIdentity, "Method"));
  }

  private static MethodInfo GetPrivateStaticMethod(string methodName) =>
    typeof(DocumentAnalysisFoundationService).GetMethod(
      methodName,
      BindingFlags.NonPublic | BindingFlags.Static)!;

  private static object CreateNestedRecord(string typeName, object?[] arguments)
  {
    Type type = typeof(DocumentAnalysisFoundationService).GetNestedType(typeName, BindingFlags.NonPublic)!;
    ConstructorInfo constructor = Array.Find(
      type.GetConstructors(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic),
      candidate => candidate.GetParameters().Length == arguments.Length)!;
    return constructor.Invoke(arguments);
  }

  private static TValue ReadProperty<TValue>(object instance, string propertyName) =>
    (TValue)instance.GetType().GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)!.GetValue(instance)!;
}


