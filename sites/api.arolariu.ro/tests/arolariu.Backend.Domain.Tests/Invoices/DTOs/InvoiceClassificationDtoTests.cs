namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.DTOs.Responses;
using arolariu.Backend.Domain.Tests.Builders;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies invoice classification request and response contracts.</summary>
[TestClass]
public sealed class InvoiceClassificationDtoTests
{
  /// <summary>Verifies invoice replacement preserves the existing canonical snapshot.</summary>
  [TestMethod]
  public void UpdateToInvoice_ExistingClassification_PreservesSnapshot()
  {
    StandardClassification classification = TaxonomyBrokerTestFactory.Create().Resolve(
      ClassificationSystem.EcoicopV2,
      TaxonomyBrokerTestFactory.EcoicopCode,
      ClassificationOrigin.Manual,
      null,
      []);
    var request = new UpdateInvoiceRequestDto(
      "Groceries",
      "Weekly shop",
      new PaymentInformation(),
      null,
      false,
      null);

    Invoice invoice = request.ToInvoice(
      Guid.NewGuid(),
      Guid.NewGuid(),
      classification);

    Assert.AreSame(classification, invoice.Classification);
  }

  /// <summary>Verifies PATCH preserves the existing canonical snapshot.</summary>
  [TestMethod]
  public void PatchApplyTo_ExistingClassification_PreservesSnapshot()
  {
    Invoice existing = InvoiceBuilder.CreateRandomInvoice();
    StandardClassification classification = TaxonomyBrokerTestFactory.Create().Resolve(
      ClassificationSystem.EcoicopV2,
      TaxonomyBrokerTestFactory.EcoicopCode,
      ClassificationOrigin.Manual,
      null,
      []);
    existing.Classification = classification;
    var request = new PatchInvoiceRequestDto(
      null,
      null,
      null,
      null,
      null,
      null,
      null);

    Invoice patched = request.ApplyTo(existing, Guid.NewGuid());
    Assert.AreSame(classification, patched.Classification);
    Assert.AreSame(classification, patched.Classification);
  }

  /// <summary>Verifies response mapping exposes the complete canonical snapshot.</summary>
  [TestMethod]
  public void FromInvoice_CanonicalClassification_MapsCompleteSnapshot()
  {
    Invoice invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Classification = TaxonomyBrokerTestFactory.Create().Resolve(
      ClassificationSystem.EcoicopV2,
      TaxonomyBrokerTestFactory.EcoicopCode,
      ClassificationOrigin.Manual,
      null,
      []);

    InvoiceResponseDto response = InvoiceResponseDto.FromInvoice(invoice);

    Assert.AreEqual(invoice.Classification, response.Classification);
  }
}
