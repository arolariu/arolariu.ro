namespace arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Resolves transport-level analysis profiles and capability overrides into validated domain analysis options.
/// </summary>
/// <remarks>
/// <para>This resolver is the single place where the "profile preset plus overrides" transport shape is translated into
/// the domain capability contracts. It never repairs an invalid combination: every violation surfaces as an argument
/// exception so the exposer can answer with a deterministic client error.</para>
/// </remarks>
internal static class AnalysisOptionsResolver
{
  private const int MaximumSupportedRecipes = 3;

  /// <summary>
  /// Resolves the effective invoice analysis options for a profile and optional overrides.
  /// </summary>
  /// <param name="profile">The requested profile, or <see langword="null"/> to use the comprehensive preset.</param>
  /// <param name="overrides">The optional per-capability overrides.</param>
  /// <returns>The effective, validated invoice analysis capability selection.</returns>
  internal static InvoiceAnalysisOptions ResolveInvoiceOptions(
    AnalysisProfile? profile,
    InvoiceAnalysisOverridesDto? overrides)
  {
    AnalysisProfile requestedProfile = profile ?? AnalysisProfile.Comprehensive;

    if (!Enum.IsDefined(requestedProfile))
    {
      throw new ArgumentOutOfRangeException(nameof(profile), requestedProfile, "Profile must be a defined analysis profile.");
    }

    if (requestedProfile == AnalysisProfile.Custom)
    {
      throw new ArgumentException(
        "The custom profile is an effective response value and cannot be requested.",
        nameof(profile));
    }

    if (overrides is null || !HasInvoiceCapabilityOverrides(overrides.Value))
    {
      return ResolveInvoiceBaseline(requestedProfile);
    }

    InvoiceAnalysisOptions baseline = ResolveInvoiceBaseline(requestedProfile);
    InvoiceAnalysisOverridesDto selection = overrides.Value;

    bool documentExtraction = selection.DocumentExtraction?.Enabled ?? baseline.DocumentExtraction;
    bool merchantResolution = selection.MerchantResolution?.Enabled ?? baseline.MerchantResolution;
    bool invoiceSummary = selection.InvoiceSummary?.Enabled ?? baseline.InvoiceSummary;
    bool productClassification = selection.ProductClassification?.Enabled ?? baseline.ProductClassification;
    bool allergenAssessment = selection.AllergenAssessment?.Enabled ?? baseline.AllergenAssessment;
    bool invoiceClassification = selection.InvoiceClassification?.Enabled ?? baseline.InvoiceClassification;

    (bool recipeGeneration, int maximumRecipes) = ResolveRecipeSelection(baseline, selection.RecipeGeneration);

    if (!documentExtraction
      && !merchantResolution
      && !invoiceSummary
      && !productClassification
      && !allergenAssessment
      && !invoiceClassification
      && !recipeGeneration)
    {
      throw new ArgumentException(
        "An analysis run must enable at least one capability.",
        nameof(overrides));
    }

    return new InvoiceAnalysisOptions(
      AnalysisProfile.Custom,
      documentExtraction,
      merchantResolution,
      invoiceSummary,
      productClassification,
      allergenAssessment,
      invoiceClassification,
      recipeGeneration,
      maximumRecipes);
  }

  /// <summary>
  /// Resolves the effective merchant analysis options for a profile and optional overrides.
  /// </summary>
  /// <param name="profile">The requested profile, or <see langword="null"/> to use the comprehensive preset.</param>
  /// <param name="overrides">The optional per-capability overrides.</param>
  /// <returns>The effective, validated merchant analysis capability selection.</returns>
  internal static MerchantAnalysisOptions ResolveMerchantOptions(
    AnalysisProfile? profile,
    MerchantAnalysisOverridesDto? overrides)
  {
    AnalysisProfile requestedProfile = profile ?? AnalysisProfile.Comprehensive;

    if (!Enum.IsDefined(requestedProfile))
    {
      throw new ArgumentOutOfRangeException(nameof(profile), requestedProfile, "Profile must be a defined analysis profile.");
    }

    if (requestedProfile == AnalysisProfile.Custom)
    {
      throw new ArgumentException(
        "The custom profile is an effective response value and cannot be requested.",
        nameof(profile));
    }

    if (overrides is null || !HasMerchantCapabilityOverrides(overrides.Value))
    {
      return ResolveMerchantBaseline(requestedProfile);
    }

    MerchantAnalysisOptions baseline = ResolveMerchantBaseline(requestedProfile);
    MerchantAnalysisOverridesDto selection = overrides.Value;

    bool merchantClassification = selection.MerchantClassification?.Enabled ?? baseline.MerchantClassification;
    bool descriptionGeneration = selection.DescriptionGeneration?.Enabled ?? baseline.DescriptionGeneration;

    if (!merchantClassification && !descriptionGeneration)
    {
      throw new ArgumentException(
        "An analysis run must enable at least one capability.",
        nameof(overrides));
    }

    return new MerchantAnalysisOptions(
      AnalysisProfile.Custom,
      merchantClassification,
      descriptionGeneration);
  }

  private static InvoiceAnalysisOptions ResolveInvoiceBaseline(AnalysisProfile profile) =>
    profile switch
    {
      AnalysisProfile.Comprehensive => InvoiceAnalysisOptions.Comprehensive(),
      AnalysisProfile.Fast => InvoiceAnalysisOptions.Fast(),
      _ => InvoiceAnalysisOptions.Balanced(),
    };

  private static MerchantAnalysisOptions ResolveMerchantBaseline(AnalysisProfile profile) =>
    profile switch
    {
      AnalysisProfile.Comprehensive => MerchantAnalysisOptions.Comprehensive(),
      AnalysisProfile.Fast => MerchantAnalysisOptions.Fast(),
      _ => MerchantAnalysisOptions.Balanced(),
    };

  private static bool HasInvoiceCapabilityOverrides(InvoiceAnalysisOverridesDto overrides) =>
    overrides.DocumentExtraction is not null
    || overrides.MerchantResolution is not null
    || overrides.InvoiceSummary is not null
    || overrides.ProductClassification is not null
    || overrides.AllergenAssessment is not null
    || overrides.InvoiceClassification is not null
    || overrides.RecipeGeneration is not null;

  private static bool HasMerchantCapabilityOverrides(MerchantAnalysisOverridesDto overrides) =>
    overrides.MerchantClassification is not null
    || overrides.DescriptionGeneration is not null;

  private static (bool RecipeGeneration, int MaximumRecipes) ResolveRecipeSelection(
    InvoiceAnalysisOptions baseline,
    RecipeGenerationOverrideDto? recipeOverride)
  {
    if (recipeOverride is null)
    {
      return (baseline.RecipeGeneration, baseline.MaximumRecipes);
    }

    RecipeGenerationOverrideDto selection = recipeOverride.Value;

    if (!selection.Enabled)
    {
      if (selection.MaximumRecipes is int configuredMaximumRecipes && configuredMaximumRecipes != 0)
      {
        throw new ArgumentOutOfRangeException(
          nameof(recipeOverride),
          configuredMaximumRecipes,
          "Maximum recipes must be zero or omitted when recipe generation is disabled.");
      }

      return (false, 0);
    }

    int maximumRecipes = selection.MaximumRecipes ?? MaximumSupportedRecipes;

    if (maximumRecipes is < 1 or > MaximumSupportedRecipes)
    {
      throw new ArgumentOutOfRangeException(
        nameof(recipeOverride),
        maximumRecipes,
        $"Maximum recipes must be in the inclusive range 1 to {MaximumSupportedRecipes}.");
    }

    return (true, maximumRecipes);
  }
}
