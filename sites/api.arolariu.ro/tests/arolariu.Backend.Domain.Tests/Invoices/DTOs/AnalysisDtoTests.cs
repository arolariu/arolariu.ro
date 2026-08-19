namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies analysis transport DTOs.
/// </summary>
[TestClass]
public sealed class AnalysisDtoTests
{
  private static readonly JsonSerializerOptions ApiJsonOptions = new(JsonSerializerDefaults.Web);

  /// <summary>
  /// Verifies the accepted response exposes Azure Queue's message identifier.
  /// </summary>
  [TestMethod]
  public void AnalysisAcceptedResponseDto_ValidValues_PreservesMessageIdentity()
  {
    Guid targetId = Guid.NewGuid();
    var response = new AnalysisAcceptedResponseDto(
      "message-1",
      AnalysisTargetType.Invoice,
      targetId);

    Assert.AreEqual("message-1", response.MessageId);
    Assert.AreEqual(AnalysisTargetType.Invoice, response.TargetType);
    Assert.AreEqual(targetId, response.TargetId);
  }

  /// <summary>Verifies the flattened invoice request deserializes with API JSON conventions.</summary>
  [TestMethod]
  public void InvoiceAnalysisRequestDto_FlattenedJson_ResolvesCustomOptions()
  {
    const string json =
      """{"profile":"fast","invoiceSummary":{"enabled":true}}""";

    InvoiceAnalysisRequestDto request =
      JsonSerializer.Deserialize<InvoiceAnalysisRequestDto>(json, ApiJsonOptions);
    InvoiceAnalysisOptions options = request.ToInvoiceAnalysisOptions();

    Assert.AreEqual(AnalysisProfile.Custom, options.Profile);
    Assert.IsTrue(options.DocumentExtraction);
    Assert.IsTrue(options.InvoiceSummary);
  }

  /// <summary>Verifies invalid flattened capability dependency closure is rejected.</summary>
  [TestMethod]
  public void InvoiceAnalysisRequestDto_InvalidDependencyClosure_ThrowsArgumentException()
  {
    var request = new InvoiceAnalysisRequestDto(
      AnalysisProfile.Fast,
      DocumentExtraction: null,
      InvoiceSummary: null,
      ProductClassification: new CapabilityToggleDto(false),
      AllergenAssessment: new CapabilityToggleDto(true),
      InvoiceClassification: null,
      RecipeGeneration: null);

    Assert.ThrowsExactly<ArgumentException>(() => request.ToInvoiceAnalysisOptions());
  }

  /// <summary>Verifies the custom profile remains output-only after request flattening.</summary>
  [TestMethod]
  public void InvoiceAnalysisRequestDto_CustomProfile_ThrowsArgumentException()
  {
    var request = new InvoiceAnalysisRequestDto(
      AnalysisProfile.Custom,
      DocumentExtraction: null,
      InvoiceSummary: null,
      ProductClassification: null,
      AllergenAssessment: null,
      InvoiceClassification: null,
      RecipeGeneration: null);

    Assert.ThrowsExactly<ArgumentException>(() => request.ToInvoiceAnalysisOptions());
  }

  /// <summary>Verifies flattened merchant capability selections resolve independently.</summary>
  [TestMethod]
  public void MerchantAnalysisRequestDto_FlattenedSelection_ResolvesCustomOptions()
  {
    var request = new MerchantAnalysisRequestDto(
      AnalysisProfile.Fast,
      MerchantClassification: new CapabilityToggleDto(false),
      DescriptionGeneration: new CapabilityToggleDto(true));

    MerchantAnalysisOptions options = request.ToMerchantAnalysisOptions();

    Assert.AreEqual(AnalysisProfile.Custom, options.Profile);
    Assert.IsFalse(options.MerchantClassification);
    Assert.IsTrue(options.DescriptionGeneration);
  }
}
