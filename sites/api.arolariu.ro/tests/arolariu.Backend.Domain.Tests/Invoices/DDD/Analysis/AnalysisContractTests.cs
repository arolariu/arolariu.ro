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
  /// Verifies custom replacement options may retry one dependent capability using persisted prerequisites.
  /// </summary>
  [TestMethod]
  public void Constructor_CustomRecipeOnly_PreservesDependentOnlyRetry()
  {
    InvoiceAnalysisOptions options = new(
      AnalysisProfile.Custom,
      documentExtraction: false,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: true,
      maximumRecipes: 1);

    Assert.IsFalse(options.ProductClassification);
    Assert.IsFalse(options.AllergenAssessment);
    Assert.IsTrue(options.RecipeGeneration);
    Assert.AreEqual(1, options.MaximumRecipes);
  }
}
