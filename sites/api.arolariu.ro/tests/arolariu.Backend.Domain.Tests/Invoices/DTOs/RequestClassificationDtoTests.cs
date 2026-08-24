namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Reflection;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies request classification transport contracts.</summary>
[TestClass]
public sealed class RequestClassificationDtoTests
{
  /// <summary>Verifies add-merchant requests require a code without creating a domain classification.</summary>
  [TestMethod]
  public void AddMerchantToInvoiceRequestDto_ClassificationCode_RemainsRequiredTransportData()
  {
    var request = new AddMerchantToInvoiceRequestDto(
      "Store",
      "Description",
      " 47.11 ",
      Address: null,
      ParentCompanyId: null);

    var merchant = request.ToMerchant();
    PropertyInfo property = typeof(AddMerchantToInvoiceRequestDto)
      .GetProperty(nameof(AddMerchantToInvoiceRequestDto.ClassificationCode))
      ?? throw new AssertFailedException("ClassificationCode property was not found.");
    ParameterInfo parameter = typeof(AddMerchantToInvoiceRequestDto)
      .GetConstructors(BindingFlags.Public | BindingFlags.Instance)
      .Single()
      .GetParameters()
      .Single(candidate => candidate.Name == nameof(AddMerchantToInvoiceRequestDto.ClassificationCode));

    Assert.AreEqual(typeof(string), property.PropertyType);
    Assert.IsNotNull(parameter.GetCustomAttribute<RequiredAttribute>());
    Assert.IsNull(merchant.Classification);
  }

  /// <summary>Verifies invoice PATCH mapping preserves classification for Processing resolution.</summary>
  [TestMethod]
  public void PatchInvoiceRequestDto_ClassificationCode_DoesNotCreateClassification()
  {
    var existing = new Invoice { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() };
    var request = new PatchInvoiceRequestDto(
      Name: null,
      Description: null,
      ClassificationCode: "01.1",
      PaymentInformation: null,
      MerchantReference: null,
      IsImportant: null,
      SharedWith: null,
      PossibleRecipes: null,
      AdditionalMetadata: null);

    Invoice patched = request.ApplyTo(existing, Guid.NewGuid());

    Assert.IsNull(patched.Classification);
    Assert.AreEqual("01.1", patched.ClassificationCode);
  }

  /// <summary>
  /// Verifies invoice mapping preserves a whitespace transport code without creating a classification.
  /// </summary>
  [TestMethod]
  public void UpdateInvoiceRequestDto_WhitespaceClassificationCode_DoesNotCreateClassification()
  {
    var request = new UpdateInvoiceRequestDto(
      "Invoice",
      "Description",
      ClassificationCode: " ",
      PaymentInformation: new PaymentInformation(),
      MerchantReference: null,
      IsImportant: false,
      PossibleRecipes: null,
      AdditionalMetadata: null);

    Invoice invoice = request.ToInvoice(Guid.NewGuid(), Guid.NewGuid());

    Assert.IsNull(invoice.Classification);
    Assert.AreEqual(" ", invoice.ClassificationCode);
  }
}
