namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Collections.Generic;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies scan locations remain inside the invoices container beneath the configured storage service root.
/// </summary>
[TestClass]
public sealed class CreateInvoiceScanStorageBoundaryTests
{
  /// <summary>
  /// Verifies a production storage service-root blob location keeps its SAS query available to the provider while
  /// remaining valid.
  /// </summary>
  [TestMethod]
  public void TryValidate_ProductionServiceRootInvoiceBlobWithSas_ReturnsTrue()
  {
    // Arrange
    var request = new CreateInvoiceScanRequestDto(
      ScanType.JPG,
      new Uri(
        "https://invoiceuploads.blob.core.windows.net/invoices/2026/receipt.jpg?sv=2026-08-06&sig=FAKE-SAS-SENTINEL"),
      Metadata: null);

    // Act
    bool isValid = request.TryValidate(CreateConfiguredOptions(), out Dictionary<string, string[]> validationErrors);

    // Assert
    Assert.IsTrue(isValid);
    Assert.AreEqual(0, validationErrors.Count);
  }

  /// <summary>
  /// Verifies scan locations outside the configured HTTPS service root and invoices container are rejected.
  /// </summary>
  /// <param name="location">The unapproved scan location.</param>
  [TestMethod]
  [DataRow("http://invoiceuploads.blob.core.windows.net/invoices/receipt.jpg")]
  [DataRow("file:///invoices/receipt.jpg")]
  [DataRow("ftp://invoiceuploads.blob.core.windows.net/invoices/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net.attacker.test/invoices/receipt.jpg")]
  [DataRow("https://otheruploads.blob.core.windows.net/invoices/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/other-container/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/invoices")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/invoices/")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/invoices-other/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/invoices%2Freceipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/invoices/receipt%2Fpage.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/invoices/receipt%5Cpage.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/invoices/%2e%2e/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/invoices//receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/invoices/../receipt.jpg")]
  [DataRow("https://untrusted-user@invoiceuploads.blob.core.windows.net/invoices/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/invoices/receipt.jpg#fragment")]
  [DataRow("https://invoiceuploads.blob.core.windows.net:8443/invoices/receipt.jpg")]
  public void TryValidate_UnapprovedStorageLocation_ReturnsFalse(string location)
  {
    // Arrange
    var request = new CreateInvoiceScanRequestDto(ScanType.JPG, new Uri(location), Metadata: null);

    // Act
    bool isValid = request.TryValidate(CreateConfiguredOptions(), out Dictionary<string, string[]> validationErrors);

    // Assert
    Assert.IsFalse(isValid);
    Assert.IsTrue(validationErrors.ContainsKey(nameof(CreateInvoiceScanRequestDto.Location)));
  }

  /// <summary>
  /// Verifies a non-default port is accepted only when it is part of the configured storage service root.
  /// </summary>
  [TestMethod]
  public void TryValidate_ConfiguredNonDefaultPort_ReturnsTrue()
  {
    // Arrange
    var options = new LocalOptions
    {
      StorageAccountName = "invoiceuploads",
      StorageAccountEndpoint = "https://invoiceuploads.blob.core.windows.net:8443",
    };
    var request = new CreateInvoiceScanRequestDto(
      ScanType.JPG,
      new Uri("https://invoiceuploads.blob.core.windows.net:8443/invoices/receipt.jpg"),
      Metadata: null);

    // Act
    bool isValid = request.TryValidate(options, out Dictionary<string, string[]> validationErrors);

    // Assert
    Assert.IsTrue(isValid);
    Assert.AreEqual(0, validationErrors.Count);
  }

  /// <summary>
  /// Verifies each supported loopback Azurite service root accepts only its configured account prefix and invoices
  /// container.
  /// </summary>
  /// <param name="serviceRoot">The configured local Azurite service root.</param>
  [TestMethod]
  [DataRow("http://localhost:10000/devstoreaccount1")]
  [DataRow("http://127.0.0.1:10000/devstoreaccount1")]
  [DataRow("http://[::1]:10000/devstoreaccount1")]
  public void TryValidate_LoopbackAzuriteInvoiceBlob_ReturnsTrue(string serviceRoot)
  {
    // Arrange
    var options = new LocalOptions
    {
      StorageAccountName = "devstoreaccount1",
      StorageAccountEndpoint = serviceRoot,
    };
    var request = new CreateInvoiceScanRequestDto(
      ScanType.JPG,
      new Uri($"{serviceRoot}/invoices/scans/receipt.jpg"),
      Metadata: null);

    // Act
    bool isValid = request.TryValidate(options, out Dictionary<string, string[]> validationErrors);

    // Assert
    Assert.IsTrue(isValid);
    Assert.AreEqual(0, validationErrors.Count);
  }

  /// <summary>
  /// Verifies remote HTTP and incorrect Azurite account or container candidates are rejected.
  /// </summary>
  /// <param name="serviceRoot">The configured storage service root.</param>
  /// <param name="candidate">The candidate scan location.</param>
  [TestMethod]
  [DataRow(
    "http://storage.example.test",
    "http://storage.example.test/invoices/scans/receipt.jpg")]
  [DataRow(
    "http://127.0.0.1:10000/devstoreaccount1",
    "http://127.0.0.1:10000/otheraccount/invoices/scans/receipt.jpg")]
  [DataRow(
    "http://127.0.0.1:10000/devstoreaccount1",
    "http://127.0.0.1:10000/devstoreaccount1/other-container/scans/receipt.jpg")]
  public void TryValidate_UnapprovedHttpOrAzuritePath_ReturnsFalse(string serviceRoot, string candidate)
  {
    // Arrange
    var options = new LocalOptions
    {
      StorageAccountName = "devstoreaccount1",
      StorageAccountEndpoint = serviceRoot,
    };
    var request = new CreateInvoiceScanRequestDto(ScanType.JPG, new Uri(candidate), Metadata: null);

    // Act
    bool isValid = request.TryValidate(options, out Dictionary<string, string[]> validationErrors);

    // Assert
    Assert.IsFalse(isValid);
    Assert.IsTrue(validationErrors.ContainsKey(nameof(CreateInvoiceScanRequestDto.Location)));
  }

  private static LocalOptions CreateConfiguredOptions() =>
    new()
    {
      StorageAccountName = "invoiceuploads",
      StorageAccountEndpoint = "https://invoiceuploads.blob.core.windows.net",
    };
}
