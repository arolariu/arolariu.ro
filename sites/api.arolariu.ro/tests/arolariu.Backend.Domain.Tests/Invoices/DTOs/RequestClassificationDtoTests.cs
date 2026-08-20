namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Reflection;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

using Microsoft.AspNetCore.Http;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies request-owned manual taxonomy mapping.</summary>
[TestClass]
public sealed class RequestClassificationDtoTests
{
  /// <summary>Verifies add-merchant requests require and map a NACE code.</summary>
  [TestMethod]
  public void AddMerchantToInvoiceRequestDto_ClassificationCode_MapsNaceSelection()
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
    Assert.AreEqual(ClassificationSystem.Nace21, merchant.Classification?.System);
    Assert.AreEqual("47.11", merchant.Classification?.Code);
  }

  /// <summary>Verifies invoice PATCH requests map supplied codes as ECOICOP selections.</summary>
  [TestMethod]
  public void PatchInvoiceRequestDto_ClassificationCode_MapsEcoicopSelection()
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
      AdditionalMetadata: null);

    Invoice patched = request.ApplyTo(existing, Guid.NewGuid());

    Assert.AreEqual(ClassificationSystem.EcoicopV2, patched.Classification?.System);
    Assert.AreEqual("01.1", patched.Classification?.Code);
  }

  /// <summary>Verifies optional invoice classification codes reject whitespace.</summary>
  [TestMethod]
  public void UpdateInvoiceRequestDto_WhitespaceClassificationCode_ThrowsBadHttpRequestException()
  {
    var request = new UpdateInvoiceRequestDto(
      "Invoice",
      "Description",
      ClassificationCode: " ",
      PaymentInformation: new PaymentInformation(),
      MerchantReference: null,
      IsImportant: false,
      AdditionalMetadata: null);

    Assert.ThrowsExactly<BadHttpRequestException>(
      () => request.ToInvoice(Guid.NewGuid(), Guid.NewGuid()));
  }
}
