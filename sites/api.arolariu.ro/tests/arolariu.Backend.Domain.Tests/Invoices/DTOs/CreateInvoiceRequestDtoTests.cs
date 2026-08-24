namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

using Microsoft.AspNetCore.Http;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies the minimal create-invoice transport contract.</summary>
[TestClass]
public sealed class CreateInvoiceRequestDtoTests
{
  /// <summary>Verifies the request maps the authenticated owner, initial scan, and metadata.</summary>
  [TestMethod]
  public void ToInvoice_ValidMinimalRequest_MapsInitialArtifact()
  {
    Guid bodyUserId = Guid.NewGuid();
    Guid authenticatedUserId = Guid.NewGuid();
    InvoiceScan scan = new(
      ScanType.JPG,
      new Uri("https://example.test/invoices/receipt.jpg"),
      null);
    var request = new CreateInvoiceRequestDto(
      bodyUserId,
      scan,
      new Dictionary<string, object> { ["source"] = "mobile" });

    Invoice invoice = request.ToInvoice(authenticatedUserId);

    Assert.AreEqual(authenticatedUserId, invoice.UserIdentifier);
    Assert.AreEqual(authenticatedUserId, invoice.CreatedBy);
    Assert.AreNotEqual(bodyUserId, invoice.UserIdentifier);
    Assert.AreEqual(1, invoice.Scans.Count);
    Assert.AreEqual(scan, invoice.Scans.Single());
    Assert.AreEqual("mobile", invoice.AdditionalMetadata["source"]);
    Assert.AreEqual(0, invoice.Items.Count);
  }

  /// <summary>Verifies an empty body owner cannot replace the authenticated partition identifier.</summary>
  [TestMethod]
  public void ToInvoice_EmptyBodyUserIdentifier_UsesAuthenticatedOwner()
  {
    Guid authenticatedUserId = Guid.NewGuid();
    var request = new CreateInvoiceRequestDto(
      Guid.Empty,
      new InvoiceScan(ScanType.JPG, new Uri("https://example.test/invoices/receipt.jpg"), null),
      null);

    Invoice invoice = request.ToInvoice(authenticatedUserId);

    Assert.AreEqual(authenticatedUserId, invoice.UserIdentifier);
  }
}
