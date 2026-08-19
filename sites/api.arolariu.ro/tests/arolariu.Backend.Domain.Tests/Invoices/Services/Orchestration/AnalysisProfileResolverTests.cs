namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies named analysis profile resolution for invoice and merchant option contracts.
/// </summary>
[TestClass]
public sealed class AnalysisProfileResolverTests
{
  /// <summary>Verifies null invoice options are rejected.</summary>
  [TestMethod]
  public void Resolve_NullInvoiceOptions_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() => AnalysisProfileResolver.Resolve((InvoiceAnalysisOptions)null!));

  /// <summary>Verifies null merchant options are rejected.</summary>
  [TestMethod]
  public void Resolve_NullMerchantOptions_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() => AnalysisProfileResolver.Resolve((MerchantAnalysisOptions)null!));

  /// <summary>Verifies the fast invoice profile resolves to the published fast preset.</summary>
  [TestMethod]
  public void Resolve_FastInvoiceProfile_ReturnsFastPreset()
  {
    InvoiceAnalysisOptions resolved = AnalysisProfileResolver.Resolve(InvoiceAnalysisOptions.Fast());

    Assert.AreEqual(AnalysisProfile.Fast, resolved.Profile);
    Assert.IsTrue(resolved.DocumentExtraction);
    Assert.IsTrue(resolved.MerchantResolution);
    Assert.IsFalse(resolved.InvoiceSummary);
    Assert.IsTrue(resolved.ProductClassification);
    Assert.IsFalse(resolved.AllergenAssessment);
    Assert.IsTrue(resolved.InvoiceClassification);
    Assert.IsFalse(resolved.RecipeGeneration);
    Assert.AreEqual(0, resolved.MaximumRecipes);
  }

  /// <summary>Verifies the balanced invoice profile resolves to the published balanced preset.</summary>
  [TestMethod]
  public void Resolve_BalancedInvoiceProfile_ReturnsBalancedPreset()
  {
    InvoiceAnalysisOptions resolved = AnalysisProfileResolver.Resolve(InvoiceAnalysisOptions.Balanced());

    Assert.AreEqual(AnalysisProfile.Balanced, resolved.Profile);
    Assert.IsTrue(resolved.InvoiceSummary);
    Assert.IsTrue(resolved.AllergenAssessment);
    Assert.IsFalse(resolved.RecipeGeneration);
    Assert.AreEqual(0, resolved.MaximumRecipes);
  }

  /// <summary>Verifies the comprehensive invoice profile resolves to the published comprehensive preset.</summary>
  [TestMethod]
  public void Resolve_ComprehensiveInvoiceProfile_ReturnsComprehensivePreset()
  {
    InvoiceAnalysisOptions resolved = AnalysisProfileResolver.Resolve(InvoiceAnalysisOptions.Comprehensive());

    Assert.AreEqual(AnalysisProfile.Comprehensive, resolved.Profile);
    Assert.IsTrue(resolved.InvoiceSummary);
    Assert.IsTrue(resolved.AllergenAssessment);
    Assert.IsTrue(resolved.RecipeGeneration);
    Assert.AreEqual(3, resolved.MaximumRecipes);
  }

  /// <summary>Verifies custom empty invoice options pass through unchanged via the resolver default arm.</summary>
  [TestMethod]
  public void Resolve_CustomEmptyInvoiceOptions_ReturnsOriginalInstance()
  {
    var options = new InvoiceAnalysisOptions(AnalysisProfile.Custom, false, false, false, false, false, false, false, 0);

    InvoiceAnalysisOptions resolved = AnalysisProfileResolver.Resolve(options);

    Assert.AreSame(options, resolved);
  }

  /// <summary>Verifies the fast merchant profile resolves to the published fast preset.</summary>
  [TestMethod]
  public void Resolve_FastMerchantProfile_ReturnsFastPreset()
  {
    MerchantAnalysisOptions resolved = AnalysisProfileResolver.Resolve(MerchantAnalysisOptions.Fast());

    Assert.AreEqual(AnalysisProfile.Fast, resolved.Profile);
    Assert.IsTrue(resolved.MerchantClassification);
    Assert.IsFalse(resolved.DescriptionGeneration);
  }

  /// <summary>Verifies the balanced merchant profile resolves to the published balanced preset.</summary>
  [TestMethod]
  public void Resolve_BalancedMerchantProfile_ReturnsBalancedPreset()
  {
    MerchantAnalysisOptions resolved = AnalysisProfileResolver.Resolve(MerchantAnalysisOptions.Balanced());

    Assert.AreEqual(AnalysisProfile.Balanced, resolved.Profile);
    Assert.IsTrue(resolved.MerchantClassification);
    Assert.IsTrue(resolved.DescriptionGeneration);
  }

  /// <summary>Verifies the comprehensive merchant profile resolves to the published comprehensive preset.</summary>
  [TestMethod]
  public void Resolve_ComprehensiveMerchantProfile_ReturnsComprehensivePreset()
  {
    MerchantAnalysisOptions resolved = AnalysisProfileResolver.Resolve(MerchantAnalysisOptions.Comprehensive());

    Assert.AreEqual(AnalysisProfile.Comprehensive, resolved.Profile);
    Assert.IsTrue(resolved.MerchantClassification);
    Assert.IsTrue(resolved.DescriptionGeneration);
  }

  /// <summary>Verifies custom empty merchant options pass through unchanged via the resolver default arm.</summary>
  [TestMethod]
  public void Resolve_CustomEmptyMerchantOptions_ReturnsOriginalInstance()
  {
    var options = new MerchantAnalysisOptions(AnalysisProfile.Custom, merchantClassification: false, descriptionGeneration: false);

    MerchantAnalysisOptions resolved = AnalysisProfileResolver.Resolve(options);

    Assert.AreSame(options, resolved);
  }
}
