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
  /// <summary>Verifies newly linked merchants remain unclassified.</summary>
  [TestMethod]
  public void AddMerchantToInvoice_NewMerchant_IsUnclassified()
  {
    var request = new AddMerchantToInvoiceRequestDto(
      "Store",
      "Description",
      null,
      null);

    Merchant merchant = request.ToMerchant();

    Assert.IsNull(merchant.Classification);
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

  /// <summary>Verifies merchant replacement preserves the existing canonical snapshot.</summary>
  [TestMethod]
  public void UpdateMerchant_ExistingClassification_PreservesSnapshot()
  {
    StandardClassification classification = TaxonomyBrokerTestFactory.Create().Resolve(
      ClassificationSystem.Nace21,
      TaxonomyBrokerTestFactory.NaceCode,
      ClassificationOrigin.Manual,
      null,
      []);
    var request = new UpdateMerchantRequestDto(
      "Store",
      "Description",
      null,
      null,
      null);

    Merchant merchant = request.ToMerchant(Guid.NewGuid(), classification);

    Assert.AreSame(classification, merchant.Classification);
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
