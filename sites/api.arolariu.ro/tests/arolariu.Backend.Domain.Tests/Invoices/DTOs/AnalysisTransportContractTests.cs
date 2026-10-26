namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies stable analysis transport JSON.
/// </summary>
[TestClass]
public sealed class AnalysisTransportContractTests
{
  private static readonly JsonSerializerOptions ApiJsonOptions = new(JsonSerializerDefaults.Web);

  /// <summary>
  /// Verifies invoice capability selections serialize as flat scalar properties.
  /// </summary>
  [TestMethod]
  public void InvoiceRequest_Serialize_UsesFlatCapabilityProperties()
  {
    var request = new InvoiceAnalysisRequestDto(
      AnalysisProfile.Fast,
      DocumentExtraction: true,
      InvoiceSummary: false,
      ProductClassification: true,
      AllergenAssessment: false,
      InvoiceClassification: true,
      RecipeGeneration: true,
      MaximumRecipes: 2);

    string json = JsonSerializer.Serialize(request, ApiJsonOptions);

    StringAssert.Contains(json, "\"recipeGeneration\":true", StringComparison.Ordinal);
    StringAssert.Contains(json, "\"maximumRecipes\":2", StringComparison.Ordinal);
    Assert.IsFalse(json.Contains("\"enabled\"", StringComparison.Ordinal));
  }
}
