namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers the internal analysis option resolver branch matrix for invoice and merchant profiles.
/// </summary>
[TestClass]
public sealed class AnalysisOptionsResolverCoverageTests
{
  /// <summary>
  /// Verifies invoice resolution defaults to the balanced preset when profile and overrides are omitted.
  /// </summary>
  [TestMethod]
  public void ResolveInvoiceOptions_NoProfileNoOverrides_ReturnsBalancedPreset()
  {
    InvoiceAnalysisOptions options = AnalysisOptionsResolver.ResolveInvoiceOptions(null, null);

    Assert.AreEqual(AnalysisProfile.Balanced, options.Profile);
    Assert.IsTrue(options.InvoiceSummary);
    Assert.IsTrue(options.AllergenAssessment);
    Assert.IsFalse(options.RecipeGeneration);
  }

  /// <summary>
  /// Verifies named invoice profiles without overrides return their published preset shapes.
  /// </summary>
  /// <param name="profile">The named invoice profile to resolve.</param>
  /// <param name="recipeGeneration">The expected recipe-generation flag.</param>
  /// <param name="maximumRecipes">The expected recipe limit.</param>
  [TestMethod]
  [DataRow(AnalysisProfile.Comprehensive, true, 3)]
  [DataRow(AnalysisProfile.Fast, false, 0)]
  [DataRow(AnalysisProfile.Balanced, false, 0)]
  public void ResolveInvoiceOptions_NamedProfileWithoutOverrides_ReturnsPublishedPreset(
    AnalysisProfile profile,
    bool recipeGeneration,
    int maximumRecipes)
  {
    InvoiceAnalysisOptions options = AnalysisOptionsResolver.ResolveInvoiceOptions(profile, null);

    Assert.AreEqual(profile, options.Profile);
    Assert.AreEqual(recipeGeneration, options.RecipeGeneration);
    Assert.AreEqual(maximumRecipes, options.MaximumRecipes);
  }

  /// <summary>
  /// Verifies an empty invoice override object preserves the selected named profile.
  /// </summary>
  [TestMethod]
  public void ResolveInvoiceOptions_EmptyOverrides_PreservesNamedProfile()
  {
    var overrides = new InvoiceAnalysisOverridesDto(null, null, null, null, null, null, null);

    InvoiceAnalysisOptions options = AnalysisOptionsResolver.ResolveInvoiceOptions(AnalysisProfile.Fast, overrides);

    Assert.AreEqual(AnalysisProfile.Fast, options.Profile);
    Assert.IsTrue(options.DocumentExtraction);
    Assert.IsFalse(options.RecipeGeneration);
  }

  /// <summary>
  /// Verifies custom invoice profiles require at least one override.
  /// </summary>
  [TestMethod]
  public void ResolveInvoiceOptions_CustomProfileWithoutOverrides_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      AnalysisOptionsResolver.ResolveInvoiceOptions(AnalysisProfile.Custom, null));

  /// <summary>
  /// Verifies undefined invoice profiles are rejected before preset or override resolution.
  /// </summary>
  [TestMethod]
  public void ResolveInvoiceOptions_UndefinedProfile_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
      AnalysisOptionsResolver.ResolveInvoiceOptions((AnalysisProfile)999, null));

  /// <summary>
  /// Verifies the custom profile cannot be supplied by an invoice request, even with a capability override.
  /// </summary>
  [TestMethod]
  public void ResolveInvoiceOptions_InboundCustomProfileWithOverride_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      AnalysisOptionsResolver.ResolveInvoiceOptions(
        AnalysisProfile.Custom,
        new InvoiceAnalysisOverridesDto(new CapabilityToggleDto(true), null, null, null, null, null, null)));

  /// <summary>
  /// Verifies capability toggles layer over the invoice baseline and downgrade the profile to custom.
  /// </summary>
  [TestMethod]
  public void ResolveInvoiceOptions_ExplicitCapabilityToggles_UsesSelectionAndBaselineValues()
  {
    var overrides = new InvoiceAnalysisOverridesDto(
      DocumentExtraction: new CapabilityToggleDto(false),
      MerchantResolution: new CapabilityToggleDto(false),
      InvoiceSummary: new CapabilityToggleDto(false),
      ProductClassification: null,
      AllergenAssessment: new CapabilityToggleDto(false),
      InvoiceClassification: new CapabilityToggleDto(false),
      RecipeGeneration: null);

    InvoiceAnalysisOptions options = AnalysisOptionsResolver.ResolveInvoiceOptions(AnalysisProfile.Fast, overrides);

    Assert.AreEqual(AnalysisProfile.Custom, options.Profile);
    Assert.IsFalse(options.DocumentExtraction);
    Assert.IsFalse(options.MerchantResolution);
    Assert.IsFalse(options.InvoiceSummary);
    Assert.IsTrue(options.ProductClassification);
    Assert.IsFalse(options.AllergenAssessment);
    Assert.IsFalse(options.InvoiceClassification);
    Assert.IsFalse(options.RecipeGeneration);
    Assert.AreEqual(0, options.MaximumRecipes);
  }

  /// <summary>
  /// Verifies an explicitly supplied invoice capability produces a custom effective profile even when it matches
  /// the selected named baseline.
  /// </summary>
  [TestMethod]
  public void ResolveInvoiceOptions_ExplicitBaselineCapability_ProducesCustomProfile()
  {
    var overrides = new InvoiceAnalysisOverridesDto(
      DocumentExtraction: new CapabilityToggleDto(true),
      MerchantResolution: null,
      InvoiceSummary: null,
      ProductClassification: null,
      AllergenAssessment: null,
      InvoiceClassification: null,
      RecipeGeneration: null);

    InvoiceAnalysisOptions options = AnalysisOptionsResolver.ResolveInvoiceOptions(AnalysisProfile.Fast, overrides);

    Assert.AreEqual(AnalysisProfile.Custom, options.Profile);
    Assert.IsTrue(options.DocumentExtraction);
  }

  /// <summary>
  /// Verifies recipe generation defaults to the supported ceiling when enabled without an explicit maximum.
  /// </summary>
  [TestMethod]
  public void ResolveInvoiceOptions_RecipeEnabledWithoutMaximum_DefaultsToSupportedMaximum()
  {
    var overrides = new InvoiceAnalysisOverridesDto(
      DocumentExtraction: null,
      MerchantResolution: null,
      InvoiceSummary: null,
      ProductClassification: null,
      AllergenAssessment: null,
      InvoiceClassification: null,
      RecipeGeneration: new RecipeGenerationOverrideDto(true, null));

    InvoiceAnalysisOptions options = AnalysisOptionsResolver.ResolveInvoiceOptions(AnalysisProfile.Balanced, overrides);

    Assert.IsTrue(options.RecipeGeneration);
    Assert.AreEqual(3, options.MaximumRecipes);
  }

  /// <summary>
  /// Verifies disabling recipes accepts an omitted maximum and normalizes the limit to zero.
  /// </summary>
  [TestMethod]
  public void ResolveInvoiceOptions_RecipeDisabledWithoutMaximum_ReturnsZeroMaximum()
  {
    var overrides = new InvoiceAnalysisOverridesDto(
      DocumentExtraction: null,
      MerchantResolution: null,
      InvoiceSummary: null,
      ProductClassification: null,
      AllergenAssessment: null,
      InvoiceClassification: null,
      RecipeGeneration: new RecipeGenerationOverrideDto(false, null));

    InvoiceAnalysisOptions options = AnalysisOptionsResolver.ResolveInvoiceOptions(AnalysisProfile.Comprehensive, overrides);

    Assert.IsFalse(options.RecipeGeneration);
    Assert.AreEqual(0, options.MaximumRecipes);
  }

  /// <summary>
  /// Verifies disabled recipes cannot carry a positive maximum.
  /// </summary>
  [TestMethod]
  public void ResolveInvoiceOptions_RecipeDisabledWithPositiveMaximum_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
      AnalysisOptionsResolver.ResolveInvoiceOptions(
        AnalysisProfile.Comprehensive,
        new InvoiceAnalysisOverridesDto(null, null, null, null, null, null, new RecipeGenerationOverrideDto(false, 1))));

  /// <summary>
  /// Verifies enabled recipes reject values outside the supported inclusive range.
  /// </summary>
  /// <param name="maximumRecipes">The unsupported maximum recipe count.</param>
  [TestMethod]
  [DataRow(0)]
  [DataRow(4)]
  public void ResolveInvoiceOptions_RecipeEnabledWithUnsupportedMaximum_ThrowsArgumentOutOfRangeException(int maximumRecipes) =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
      AnalysisOptionsResolver.ResolveInvoiceOptions(
        AnalysisProfile.Balanced,
        new InvoiceAnalysisOverridesDto(null, null, null, null, null, null, new RecipeGenerationOverrideDto(true, maximumRecipes))));

  /// <summary>
  /// Verifies merchant resolution defaults to the balanced preset when profile and overrides are omitted.
  /// </summary>
  [TestMethod]
  public void ResolveMerchantOptions_NoProfileNoOverrides_ReturnsBalancedPreset()
  {
    MerchantAnalysisOptions options = AnalysisOptionsResolver.ResolveMerchantOptions(null, null);

    Assert.AreEqual(AnalysisProfile.Balanced, options.Profile);
    Assert.IsTrue(options.MerchantClassification);
    Assert.IsTrue(options.DescriptionGeneration);
  }

  /// <summary>
  /// Verifies named merchant profiles without overrides return their published preset shapes.
  /// </summary>
  /// <param name="profile">The named merchant profile to resolve.</param>
  /// <param name="descriptionGeneration">The expected description-generation flag.</param>
  [TestMethod]
  [DataRow(AnalysisProfile.Comprehensive, true)]
  [DataRow(AnalysisProfile.Fast, false)]
  [DataRow(AnalysisProfile.Balanced, true)]
  public void ResolveMerchantOptions_NamedProfileWithoutOverrides_ReturnsPublishedPreset(
    AnalysisProfile profile,
    bool descriptionGeneration)
  {
    MerchantAnalysisOptions options = AnalysisOptionsResolver.ResolveMerchantOptions(profile, null);

    Assert.AreEqual(profile, options.Profile);
    Assert.IsTrue(options.MerchantClassification);
    Assert.AreEqual(descriptionGeneration, options.DescriptionGeneration);
  }

  /// <summary>
  /// Verifies an empty merchant override object preserves the selected named profile.
  /// </summary>
  [TestMethod]
  public void ResolveMerchantOptions_EmptyOverrides_PreservesNamedProfile()
  {
    var overrides = new MerchantAnalysisOverridesDto(null, null);

    MerchantAnalysisOptions options = AnalysisOptionsResolver.ResolveMerchantOptions(AnalysisProfile.Fast, overrides);

    Assert.AreEqual(AnalysisProfile.Fast, options.Profile);
    Assert.IsTrue(options.MerchantClassification);
    Assert.IsFalse(options.DescriptionGeneration);
  }

  /// <summary>
  /// Verifies custom merchant profiles require at least one override.
  /// </summary>
  [TestMethod]
  public void ResolveMerchantOptions_CustomProfileWithoutOverrides_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      AnalysisOptionsResolver.ResolveMerchantOptions(AnalysisProfile.Custom, null));

  /// <summary>
  /// Verifies undefined merchant profiles are rejected before baseline resolution.
  /// </summary>
  [TestMethod]
  public void ResolveMerchantOptions_UndefinedProfile_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
      AnalysisOptionsResolver.ResolveMerchantOptions((AnalysisProfile)999, null));

  /// <summary>
  /// Verifies the custom profile cannot be supplied by a merchant request, even with a capability override.
  /// </summary>
  [TestMethod]
  public void ResolveMerchantOptions_InboundCustomProfileWithOverride_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      AnalysisOptionsResolver.ResolveMerchantOptions(
        AnalysisProfile.Custom,
        new MerchantAnalysisOverridesDto(new CapabilityToggleDto(true), null)));

  /// <summary>
  /// Verifies merchant overrides layer over the named baseline and downgrade the profile to custom.
  /// </summary>
  [TestMethod]
  public void ResolveMerchantOptions_DescriptionDisabled_UsesOverrideAndBaselineValues()
  {
    var overrides = new MerchantAnalysisOverridesDto(
      MerchantClassification: null,
      DescriptionGeneration: new CapabilityToggleDto(false));

    MerchantAnalysisOptions options = AnalysisOptionsResolver.ResolveMerchantOptions(AnalysisProfile.Comprehensive, overrides);

    Assert.AreEqual(AnalysisProfile.Custom, options.Profile);
    Assert.IsTrue(options.MerchantClassification);
    Assert.IsFalse(options.DescriptionGeneration);
  }

  /// <summary>
  /// Verifies an explicitly supplied merchant capability produces a custom effective profile even when it matches
  /// the selected named baseline.
  /// </summary>
  [TestMethod]
  public void ResolveMerchantOptions_ExplicitBaselineCapability_ProducesCustomProfile()
  {
    var overrides = new MerchantAnalysisOverridesDto(
      MerchantClassification: new CapabilityToggleDto(true),
      DescriptionGeneration: null);

    MerchantAnalysisOptions options = AnalysisOptionsResolver.ResolveMerchantOptions(AnalysisProfile.Fast, overrides);

    Assert.AreEqual(AnalysisProfile.Custom, options.Profile);
    Assert.IsTrue(options.MerchantClassification);
  }

  /// <summary>
  /// Verifies an override set disabling every merchant capability is rejected.
  /// </summary>
  [TestMethod]
  public void ResolveMerchantOptions_AllCapabilitiesDisabled_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      AnalysisOptionsResolver.ResolveMerchantOptions(
        AnalysisProfile.Fast,
        new MerchantAnalysisOverridesDto(new CapabilityToggleDto(false), new CapabilityToggleDto(false))));
  /// <summary>
  /// Verifies merchant baseline resolution uses the balanced shape for override requests outside comprehensive or fast.
  /// </summary>
  [TestMethod]
  public void ResolveMerchantOptions_BalancedOverrideDisablesClassification_KeepsDescriptionFromBaseline()
  {
    var overrides = new MerchantAnalysisOverridesDto(
      MerchantClassification: new CapabilityToggleDto(false),
      DescriptionGeneration: null);

    MerchantAnalysisOptions options = AnalysisOptionsResolver.ResolveMerchantOptions(AnalysisProfile.Balanced, overrides);

    Assert.AreEqual(AnalysisProfile.Custom, options.Profile);
    Assert.IsFalse(options.MerchantClassification);
    Assert.IsTrue(options.DescriptionGeneration);
  }
}

