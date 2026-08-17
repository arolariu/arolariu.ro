namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;

using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies receipt-document collection and provenance invariants at the provider-neutral boundary.
/// </summary>
[TestClass]
public sealed class ReceiptDocumentContractTests
{
  /// <summary>
  /// Verifies receipt documents reject null items rather than exposing invalid immutable collection snapshots.
  /// </summary>
  [TestMethod]
  public void Constructor_NullProductItem_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(
      () => ReceiptDocumentTestData.Document(products: new ReceiptProductDocument[] { null! }));

  /// <summary>
  /// Verifies source-scan stamping rejects negative indexes because provenance must identify an input scan.
  /// </summary>
  [TestMethod]
  public void WithSourceScanIndex_NegativeIndex_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(
      () => ReceiptDocumentTestData.Document().WithSourceScanIndex(-1));

  /// <summary>
  /// Verifies field values reject provenance indexes below the unstamped sentinel value.
  /// </summary>
  [TestMethod]
  public void DocumentValue_SourceIndexBelowUnstampedSentinel_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(
      () => new DocumentValue<string>("value", confidence: 1.0, sourceScanIndex: -2));
}
