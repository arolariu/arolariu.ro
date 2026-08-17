namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Linq;
using System.Reflection;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Defines contract tests for the transport-facing analysis DTOs: profile/override resolution, manual
/// classification selection, and the tenant-free shape of the analyze request bodies.
/// </summary>
[TestClass]
public sealed class AnalysisDtoTests
{
  private static readonly string[] ForbiddenIdentifierTokens =
    ["user", "tenant", "partition", "owner", "account"];

  /// <summary>
  /// Verifies that an empty invoice analyze request resolves to the published comprehensive preset.
  /// </summary>
  [TestMethod]
  public void ToInvoiceAnalysisOptions_NoProfileNoOverrides_ResolvesComprehensivePreset()
  {
    // Arrange
    var request = new AnalyzeInvoiceRequestDto(Profile: null, Overrides: null);

    // Act
    InvoiceAnalysisOptions options = request.ToInvoiceAnalysisOptions();

    // Assert
    Assert.AreEqual(AnalysisProfile.Comprehensive, options.Profile);
    Assert.IsTrue(options.DocumentExtraction);
    Assert.IsTrue(options.InvoiceSummary);
    Assert.IsTrue(options.AllergenAssessment);
    Assert.IsTrue(options.RecipeGeneration);
    Assert.AreEqual(3, options.MaximumRecipes);
  }

  /// <summary>
  /// Verifies that a named profile without overrides resolves to that published preset verbatim.
  /// </summary>
  [TestMethod]
  public void ToInvoiceAnalysisOptions_NamedProfileWithoutOverrides_ResolvesNamedPreset()
  {
    // Arrange
    var request = new AnalyzeInvoiceRequestDto(AnalysisProfile.Fast, Overrides: null);

    // Act
    InvoiceAnalysisOptions options = request.ToInvoiceAnalysisOptions();

    // Assert
    Assert.AreEqual(AnalysisProfile.Fast, options.Profile);
    Assert.IsFalse(options.InvoiceSummary);
    Assert.IsFalse(options.AllergenAssessment);
  }

  /// <summary>
  /// Verifies that capability overrides are layered over the named preset and downgrade the profile to custom.
  /// </summary>
  [TestMethod]
  public void ToInvoiceAnalysisOptions_OverridesDisableSummary_ProducesCustomProfile()
  {
    // Arrange
    var request = new AnalyzeInvoiceRequestDto(
      AnalysisProfile.Balanced,
      new InvoiceAnalysisOverridesDto(
        DocumentExtraction: null,
        MerchantResolution: null,
        InvoiceSummary: new CapabilityToggleDto(false),
        ProductClassification: null,
        AllergenAssessment: null,
        InvoiceClassification: null,
        RecipeGeneration: null));

    // Act
    InvoiceAnalysisOptions options = request.ToInvoiceAnalysisOptions();

    // Assert
    Assert.AreEqual(AnalysisProfile.Custom, options.Profile);
    Assert.IsFalse(options.InvoiceSummary);
    Assert.IsTrue(options.AllergenAssessment);
  }

  /// <summary>
  /// Verifies that a recipe override enabling generation carries the requested maximum recipe count.
  /// </summary>
  [TestMethod]
  public void ToInvoiceAnalysisOptions_RecipeOverrideEnabled_CarriesMaximumRecipes()
  {
    // Arrange
    var request = new AnalyzeInvoiceRequestDto(
      AnalysisProfile.Balanced,
      new InvoiceAnalysisOverridesDto(
        DocumentExtraction: null,
        MerchantResolution: null,
        InvoiceSummary: null,
        ProductClassification: null,
        AllergenAssessment: null,
        InvoiceClassification: null,
        RecipeGeneration: new RecipeGenerationOverrideDto(Enabled: true, MaximumRecipes: 2)));

    // Act
    InvoiceAnalysisOptions options = request.ToInvoiceAnalysisOptions();

    // Assert
    Assert.IsTrue(options.RecipeGeneration);
    Assert.AreEqual(2, options.MaximumRecipes);
  }

  /// <summary>
  /// Verifies that an override set violating the capability dependency closure is rejected instead of being
  /// silently repaired.
  /// </summary>
  [TestMethod]
  public void ToInvoiceAnalysisOptions_RecipesWithoutAllergens_Throws() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      new AnalyzeInvoiceRequestDto(
        AnalysisProfile.Balanced,
        new InvoiceAnalysisOverridesDto(
          DocumentExtraction: null,
          MerchantResolution: null,
          InvoiceSummary: null,
          ProductClassification: null,
          AllergenAssessment: new CapabilityToggleDto(false),
          InvoiceClassification: null,
          RecipeGeneration: new RecipeGenerationOverrideDto(Enabled: true, MaximumRecipes: 1)))
        .ToInvoiceAnalysisOptions());

  /// <summary>
  /// Verifies that a recipe count above the domain ceiling is rejected at the transport boundary.
  /// </summary>
  [TestMethod]
  public void ToInvoiceAnalysisOptions_RecipeCountAboveCeiling_Throws() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
      new AnalyzeInvoiceRequestDto(
        AnalysisProfile.Comprehensive,
        new InvoiceAnalysisOverridesDto(
          DocumentExtraction: null,
          MerchantResolution: null,
          InvoiceSummary: null,
          ProductClassification: null,
          AllergenAssessment: null,
          InvoiceClassification: null,
          RecipeGeneration: new RecipeGenerationOverrideDto(Enabled: true, MaximumRecipes: 9)))
        .ToInvoiceAnalysisOptions());

  /// <summary>
  /// Verifies that a disabled recipe override with a negative result cap is rejected at the transport boundary.
  /// </summary>
  [TestMethod]
  public void ToInvoiceAnalysisOptions_RecipeDisabledWithNegativeMaximum_Throws() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
      new AnalyzeInvoiceRequestDto(
        AnalysisProfile.Comprehensive,
        new InvoiceAnalysisOverridesDto(
          DocumentExtraction: null,
          MerchantResolution: null,
          InvoiceSummary: null,
          ProductClassification: null,
          AllergenAssessment: null,
          InvoiceClassification: null,
          RecipeGeneration: new RecipeGenerationOverrideDto(Enabled: false, MaximumRecipes: -1)))
        .ToInvoiceAnalysisOptions());

  /// <summary>
  /// Verifies that an override set disabling every invoice capability is rejected as an empty run.
  /// </summary>
  [TestMethod]
  public void ToInvoiceAnalysisOptions_AllCapabilitiesDisabled_Throws() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      new AnalyzeInvoiceRequestDto(
        AnalysisProfile.Fast,
        new InvoiceAnalysisOverridesDto(
          DocumentExtraction: new CapabilityToggleDto(false),
          MerchantResolution: new CapabilityToggleDto(false),
          InvoiceSummary: new CapabilityToggleDto(false),
          ProductClassification: new CapabilityToggleDto(false),
          AllergenAssessment: new CapabilityToggleDto(false),
          InvoiceClassification: new CapabilityToggleDto(false),
          RecipeGeneration: new RecipeGenerationOverrideDto(Enabled: false, MaximumRecipes: null)))
        .ToInvoiceAnalysisOptions());

  /// <summary>
  /// Verifies that a custom profile without overrides is rejected because there is nothing to customize.
  /// </summary>
  [TestMethod]
  public void ToInvoiceAnalysisOptions_CustomProfileWithoutOverrides_Throws() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      new AnalyzeInvoiceRequestDto(AnalysisProfile.Custom, Overrides: null).ToInvoiceAnalysisOptions());

  /// <summary>
  /// Verifies that an empty merchant analyze request resolves to the published comprehensive preset.
  /// </summary>
  [TestMethod]
  public void ToMerchantAnalysisOptions_NoProfileNoOverrides_ResolvesComprehensivePreset()
  {
    // Arrange
    var request = new AnalyzeMerchantRequestDto(Profile: null, Overrides: null);

    // Act
    MerchantAnalysisOptions options = request.ToMerchantAnalysisOptions();

    // Assert
    Assert.AreEqual(AnalysisProfile.Comprehensive, options.Profile);
    Assert.IsTrue(options.MerchantClassification);
    Assert.IsTrue(options.DescriptionGeneration);
  }

  /// <summary>
  /// Verifies that merchant overrides are layered over the named preset and downgrade the profile to custom.
  /// </summary>
  [TestMethod]
  public void ToMerchantAnalysisOptions_DescriptionDisabled_ProducesCustomProfile()
  {
    // Arrange
    var request = new AnalyzeMerchantRequestDto(
      AnalysisProfile.Comprehensive,
      new MerchantAnalysisOverridesDto(
        MerchantClassification: null,
        DescriptionGeneration: new CapabilityToggleDto(false)));

    // Act
    MerchantAnalysisOptions options = request.ToMerchantAnalysisOptions();

    // Assert
    Assert.AreEqual(AnalysisProfile.Custom, options.Profile);
    Assert.IsTrue(options.MerchantClassification);
    Assert.IsFalse(options.DescriptionGeneration);
  }

  /// <summary>
  /// Verifies that an override set disabling every merchant capability is rejected as an empty run.
  /// </summary>
  [TestMethod]
  public void ToMerchantAnalysisOptions_AllCapabilitiesDisabled_Throws() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      new AnalyzeMerchantRequestDto(
        AnalysisProfile.Fast,
        new MerchantAnalysisOverridesDto(
          MerchantClassification: new CapabilityToggleDto(false),
          DescriptionGeneration: new CapabilityToggleDto(false)))
        .ToMerchantAnalysisOptions());

  /// <summary>
  /// Verifies that a manual classification selection is emitted as an unresolved manual selection carrying no
  /// analysis confidence, leaving canonical label and hierarchy resolution to the storage foundation.
  /// </summary>
  [TestMethod]
  public void ClassificationSelectionDto_ToManualSelection_UsesManualOriginWithoutConfidence()
  {
    // Arrange
    var selection = new ClassificationSelectionDto(ClassificationSystem.EcoicopV2, "01.1.1");

    // Act
    StandardClassification classification = selection.ToManualSelection();

    // Assert
    Assert.AreEqual(ClassificationSystem.EcoicopV2, classification.System);
    Assert.AreEqual("01.1.1", classification.Code);
    Assert.AreEqual(ClassificationOrigin.Manual, classification.Origin);
    Assert.IsNull(classification.Confidence);
  }

  /// <summary>
  /// Verifies that a blank manual classification code is rejected at the transport boundary.
  /// </summary>
  [TestMethod]
  public void ClassificationSelectionDto_BlankCode_Throws() =>
    Assert.ThrowsExactly<ArgumentException>(() =>
      new ClassificationSelectionDto(ClassificationSystem.Nace21, "   ").ToManualSelection());

  /// <summary>
  /// Verifies that neither analyze request body carries a tenant, user, or partition identifier: the caller
  /// identity is resolved server-side from the authenticated principal and is never trusted from the payload.
  /// </summary>
  [TestMethod]
  public void AnalyzeRequestDtos_Always_CarryNoTenantOrUserIdentifiers()
  {
    // Arrange
    Type[] requestTypes =
    [
      typeof(AnalyzeInvoiceRequestDto),
      typeof(AnalyzeMerchantRequestDto),
      typeof(InvoiceAnalysisOverridesDto),
      typeof(MerchantAnalysisOverridesDto),
    ];

    // Act
    string[] offendingMembers = requestTypes
      .SelectMany(type => type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
      .Where(property => ForbiddenIdentifierTokens.Any(token =>
        property.Name.Contains(token, StringComparison.OrdinalIgnoreCase)))
      .Select(property => $"{property.DeclaringType!.Name}.{property.Name}")
      .ToArray();

    // Assert
    Assert.AreEqual(0, offendingMembers.Length, string.Join(", ", offendingMembers));
  }

  /// <summary>
  /// Verifies that projecting a run with neither invoice nor merchant options falls back to the custom profile,
  /// and that the projected acknowledgement exposes the run's exact accepted-at instant.
  /// </summary>
  [TestMethod]
  public void FromRun_NoInvoiceOrMerchantOptions_ResolvesCustomProfileAndAcceptedAt()
  {
    // Arrange
    DateTimeOffset acceptedAt = DateTimeOffset.UtcNow;
    AnalysisRun run = new()
    {
      Id = Guid.NewGuid(),
      TargetType = AnalysisTargetType.Invoice,
      TargetId = Guid.NewGuid(),
      RequestedBy = Guid.NewGuid(),
      Status = AnalysisRunStatus.Queued,
      AcceptedAt = acceptedAt,
    };

    // Act
    AnalysisAcceptedResponseDto dto = AnalysisAcceptedResponseDto.FromRun(run);

    // Assert
    Assert.AreEqual(AnalysisProfile.Custom, dto.Profile);
    Assert.AreEqual(acceptedAt, dto.AcceptedAt);
  }
}
