namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Analysis;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies invoice analysis capability selection contracts.
/// </summary>
[TestClass]
public sealed class AnalysisContractTests
{
  /// <summary>
  /// Verifies the fast preset contains only the supported low-latency capabilities.
  /// </summary>
  [TestMethod]
  public void Fast_Always_ReturnsExpectedCapabilities()
  {
    InvoiceAnalysisOptions options = InvoiceAnalysisOptions.Fast();

    Assert.IsTrue(options.DocumentExtraction);
    Assert.IsFalse(options.InvoiceSummary);
    Assert.IsTrue(options.ProductClassification);
    Assert.IsFalse(options.AllergenAssessment);
    Assert.IsTrue(options.InvoiceClassification);
    Assert.IsFalse(options.RecipeGeneration);
    Assert.AreEqual(0, options.MaximumRecipes);
  }

  /// <summary>
  /// Verifies recipe generation still requires both classification and allergen assessment.
  /// </summary>
  [TestMethod]
  public void Constructor_RecipeWithoutAllergens_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => new InvoiceAnalysisOptions(
      AnalysisProfile.Custom,
      documentExtraction: true,
      invoiceSummary: false,
      productClassification: true,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: true,
      maximumRecipes: 1));
}
