namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Collections.Generic;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies scan locations remain inside the configured HTTPS upload container boundary.
/// </summary>
[TestClass]
public sealed class CreateInvoiceScanStorageBoundaryTests
{
  /// <summary>
  /// Verifies a configured blob location keeps its SAS query available to the provider while remaining valid.
  /// </summary>
  [TestMethod]
  public void TryValidate_ConfiguredBlobLocationWithSas_ReturnsTrue()
  {
    // Arrange
    var request = new CreateInvoiceScanRequestDto(
      ScanType.JPG,
      new Uri(
        "https://invoiceuploads.blob.core.windows.net/invoice-scans/2026/receipt.jpg?sv=2026-08-06&sig=FAKE-SAS-SENTINEL"),
      Metadata: null);

    // Act
    bool isValid = request.TryValidate(CreateConfiguredOptions(), out Dictionary<string, string[]> validationErrors);

    // Assert
    Assert.IsTrue(isValid);
    Assert.AreEqual(0, validationErrors.Count);
  }

  /// <summary>
  /// Verifies scan locations outside the configured HTTPS upload container are rejected.
  /// </summary>
  /// <param name="location">The unapproved scan location.</param>
  [TestMethod]
  [DataRow("http://invoiceuploads.blob.core.windows.net/invoice-scans/receipt.jpg")]
  [DataRow("file:///invoice-scans/receipt.jpg")]
  [DataRow("ftp://invoiceuploads.blob.core.windows.net/invoice-scans/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net.attacker.test/invoice-scans/receipt.jpg")]
  [DataRow("https://otheruploads.blob.core.windows.net/invoice-scans/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/other-container/receipt.jpg")]
  [DataRow("https://untrusted-user@invoiceuploads.blob.core.windows.net/invoice-scans/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/invoice-scans/receipt.jpg#fragment")]
  [DataRow("https://invoiceuploads.blob.core.windows.net:8443/invoice-scans/receipt.jpg")]
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
  /// Verifies a non-default port is accepted only when it is part of the configured upload container endpoint.
  /// </summary>
  [TestMethod]
  public void TryValidate_ConfiguredNonDefaultPort_ReturnsTrue()
  {
    // Arrange
    var options = new LocalOptions
    {
      StorageAccountName = "invoiceuploads",
      StorageAccountEndpoint = "https://invoiceuploads.blob.core.windows.net:8443/invoice-scans",
    };
    var request = new CreateInvoiceScanRequestDto(
      ScanType.JPG,
      new Uri("https://invoiceuploads.blob.core.windows.net:8443/invoice-scans/receipt.jpg"),
      Metadata: null);

    // Act
    bool isValid = request.TryValidate(options, out Dictionary<string, string[]> validationErrors);

    // Assert
    Assert.IsTrue(isValid);
    Assert.AreEqual(0, validationErrors.Count);
  }

  private static LocalOptions CreateConfiguredOptions() =>
    new()
    {
      StorageAccountName = "invoiceuploads",
      StorageAccountEndpoint = "https://invoiceuploads.blob.core.windows.net/invoice-scans",
    };
}
