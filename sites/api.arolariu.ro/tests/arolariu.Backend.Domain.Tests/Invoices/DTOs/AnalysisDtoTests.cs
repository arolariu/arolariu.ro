namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies analysis transport DTOs.
/// </summary>
[TestClass]
public sealed class AnalysisDtoTests
{
  private static readonly JsonSerializerOptions ApiJsonOptions = new(JsonSerializerDefaults.Web);

  /// <summary>Verifies the flattened invoice request deserializes with API JSON conventions.</summary>
  [TestMethod]
  public void InvoiceAnalysisRequestDto_FlattenedJson_ResolvesCustomOptions()
  {
    const string json =
      """{"profile":"fast","invoiceSummary":true}""";

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
      ProductClassification: false,
      AllergenAssessment: true,
      InvoiceClassification: null,
      RecipeGeneration: null,
      MaximumRecipes: null);

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
      RecipeGeneration: null,
      MaximumRecipes: null);

    Assert.ThrowsExactly<ArgumentException>(() => request.ToInvoiceAnalysisOptions());
  }

  /// <summary>Verifies an explicit capability selection cannot disable the complete run.</summary>
  [TestMethod]
  public void InvoiceAnalysisRequestDto_EmptySelection_ThrowsArgumentException()
  {
    var request = new InvoiceAnalysisRequestDto(
      AnalysisProfile.Fast,
      DocumentExtraction: false,
      InvoiceSummary: false,
      ProductClassification: false,
      AllergenAssessment: false,
      InvoiceClassification: false,
      RecipeGeneration: false,
      MaximumRecipes: 0);

    Assert.ThrowsExactly<ArgumentException>(() => request.ToInvoiceAnalysisOptions());
  }

  /// <summary>Verifies recipe caps remain bounded to the domain-supported range.</summary>
  [TestMethod]
  public void InvoiceAnalysisRequestDto_MaximumRecipesAboveThree_ThrowsArgumentOutOfRangeException()
  {
    var request = new InvoiceAnalysisRequestDto(
      AnalysisProfile.Fast,
      DocumentExtraction: null,
      InvoiceSummary: null,
      ProductClassification: null,
      AllergenAssessment: true,
      InvoiceClassification: null,
      RecipeGeneration: true,
      MaximumRecipes: 4);

    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => request.ToInvoiceAnalysisOptions());
  }

  /// <summary>Verifies flattened merchant capability selections resolve independently.</summary>
  [TestMethod]
  public void MerchantAnalysisRequestDto_FlattenedSelection_ResolvesCustomOptions()
  {
    var request = new MerchantAnalysisRequestDto(
      AnalysisProfile.Fast,
      MerchantClassification: false,
      DescriptionGeneration: true);

    MerchantAnalysisOptions options = request.ToMerchantAnalysisOptions();

    Assert.AreEqual(AnalysisProfile.Custom, options.Profile);
    Assert.IsFalse(options.MerchantClassification);
    Assert.IsTrue(options.DescriptionGeneration);
  }
}
