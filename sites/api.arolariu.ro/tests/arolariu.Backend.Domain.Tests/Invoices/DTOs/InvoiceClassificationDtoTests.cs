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
  /// <summary>Verifies PUT selections remain unresolved until the storage Foundation.</summary>
  [TestMethod]
  public void UpdateToInvoice_Selection_SetsPendingSelectionOnly()
  {
    var request = new UpdateInvoiceRequestDto(
      "Groceries",
      "Weekly shop",
      new ClassificationSelectionDto(
        ClassificationSystem.EcoicopV2,
        TaxonomyBrokerTestFactory.EcoicopCode),
      new PaymentInformation(),
      null,
      false,
      null);

    Invoice invoice = request.ToInvoice(Guid.NewGuid(), Guid.NewGuid());

    Assert.IsNull(invoice.Classification);
    Assert.IsNotNull(invoice.PendingClassificationSelection);
    Assert.AreEqual(
      ClassificationSystem.EcoicopV2,
      invoice.PendingClassificationSelection.System);
  }

  /// <summary>Verifies a null PUT selection produces an unclassified invoice.</summary>
  [TestMethod]
  public void UpdateToInvoice_NullSelection_LeavesInvoiceUnclassified()
  {
    var request = new UpdateInvoiceRequestDto(
      "Groceries",
      "Weekly shop",
      null,
      new PaymentInformation(),
      null,
      false,
      null);

    Invoice invoice = request.ToInvoice(Guid.NewGuid(), Guid.NewGuid());

    Assert.IsNull(invoice.Classification);
    Assert.IsNull(invoice.PendingClassificationSelection);
  }

  /// <summary>Verifies PATCH null preserves the existing canonical snapshot.</summary>
  [TestMethod]
  public void PatchApplyTo_NullSelection_PreservesClassification()
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
      null,
      null);

    Invoice patched = request.ApplyTo(existing, Guid.NewGuid());

    Assert.AreSame(classification, patched.Classification);
    Assert.IsNull(patched.PendingClassificationSelection);
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
