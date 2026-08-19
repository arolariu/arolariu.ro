namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.DTOs.Responses;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies merchant classification request and response contracts.</summary>
[TestClass]
public sealed class MerchantClassificationDtoTests
{
  /// <summary>Verifies add-to-invoice selections remain unresolved until persistence.</summary>
  [TestMethod]
  public void AddMerchantToInvoice_NaceSelection_SetsPendingSelectionOnly()
  {
    var request = new AddMerchantToInvoiceRequestDto(
      "Store",
      "Description",
      new ClassificationSelectionDto(
        ClassificationSystem.Nace21,
        TaxonomyBrokerTestFactory.NaceCode),
      null,
      null);

    Merchant merchant = request.ToMerchant();

    Assert.IsNull(merchant.Classification);
    Assert.AreEqual(
      ClassificationSystem.Nace21,
      merchant.PendingClassificationSelection?.System);
  }

  /// <summary>Verifies standalone merchant creation remains unclassified.</summary>
  [TestMethod]
  public void CreateMerchant_WithoutSelection_RemainsUnclassified()
  {
    var request = new CreateMerchantRequestDto(
      "Store",
      "Description",
      "Address",
      Guid.Empty);

    Assert.IsNull(request.ToMerchant().Classification);
  }

  /// <summary>Verifies a null PUT selection clears the merchant classification.</summary>
  [TestMethod]
  public void UpdateMerchant_NullSelection_LeavesMerchantUnclassified()
  {
    var request = new UpdateMerchantRequestDto(
      "Store",
      "Description",
      null,
      null,
      null,
      null);

    Merchant merchant = request.ToMerchant(Guid.NewGuid());

    Assert.IsNull(merchant.Classification);
    Assert.IsNull(merchant.PendingClassificationSelection);
  }

  /// <summary>Verifies response mapping exposes the complete canonical NACE snapshot.</summary>
  [TestMethod]
  public void FromMerchant_CanonicalClassification_MapsCompleteSnapshot()
  {
    var merchant = new Merchant {id = Guid.NewGuid(), Name = "Store"};
    merchant.Classification = TaxonomyBrokerTestFactory.Create().Resolve(
      ClassificationSystem.Nace21,
      TaxonomyBrokerTestFactory.NaceCode,
      ClassificationOrigin.Manual,
      null,
      []);

    MerchantResponseDto response = MerchantResponseDto.FromMerchant(merchant);

    Assert.AreEqual(merchant.Classification, response.Classification);
  }
}
