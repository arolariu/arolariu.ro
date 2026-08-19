namespace arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

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
  /// <param name="request">The flattened invoice analysis request.</param>
  /// <returns>The effective, validated invoice analysis capability selection.</returns>
  internal static InvoiceAnalysisOptions ResolveInvoiceOptions(
    InvoiceAnalysisRequestDto request)
  {
    AnalysisProfile requestedProfile = request.Profile ?? AnalysisProfile.Comprehensive;

    if (!Enum.IsDefined(requestedProfile))
    {
      throw new ArgumentOutOfRangeException(nameof(request), requestedProfile, "Profile must be a defined analysis profile.");
    }

    if (requestedProfile == AnalysisProfile.Custom)
    {
      throw new ArgumentException(
        "The custom profile is an effective response value and cannot be requested.",
        nameof(request));
    }

    if (!HasInvoiceCapabilityOverrides(request))
    {
      return ResolveInvoiceBaseline(requestedProfile);
    }

    InvoiceAnalysisOptions baseline = ResolveInvoiceBaseline(requestedProfile);
    bool documentExtraction = request.DocumentExtraction?.Enabled ?? baseline.DocumentExtraction;
    bool invoiceSummary = request.InvoiceSummary?.Enabled ?? baseline.InvoiceSummary;
    bool productClassification = request.ProductClassification?.Enabled ?? baseline.ProductClassification;
    bool allergenAssessment = request.AllergenAssessment?.Enabled ?? baseline.AllergenAssessment;
    bool invoiceClassification = request.InvoiceClassification?.Enabled ?? baseline.InvoiceClassification;

    (bool recipeGeneration, int maximumRecipes) = ResolveRecipeSelection(baseline, request.RecipeGeneration);

    if (!documentExtraction
      && !invoiceSummary
      && !productClassification
      && !allergenAssessment
      && !invoiceClassification
      && !recipeGeneration)
    {
      throw new ArgumentException(
        "An analysis run must enable at least one capability.",
        nameof(request));
    }

    return new InvoiceAnalysisOptions(
      AnalysisProfile.Custom,
      documentExtraction,
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
  /// <param name="request">The flattened merchant analysis request.</param>
  /// <returns>The effective, validated merchant analysis capability selection.</returns>
  internal static MerchantAnalysisOptions ResolveMerchantOptions(
    MerchantAnalysisRequestDto request)
  {
    AnalysisProfile requestedProfile = request.Profile ?? AnalysisProfile.Comprehensive;

    if (!Enum.IsDefined(requestedProfile))
    {
      throw new ArgumentOutOfRangeException(nameof(request), requestedProfile, "Profile must be a defined analysis profile.");
    }

    if (requestedProfile == AnalysisProfile.Custom)
    {
      throw new ArgumentException(
        "The custom profile is an effective response value and cannot be requested.",
        nameof(request));
    }

    if (!HasMerchantCapabilityOverrides(request))
    {
      return ResolveMerchantBaseline(requestedProfile);
    }

    MerchantAnalysisOptions baseline = ResolveMerchantBaseline(requestedProfile);
    bool merchantClassification = request.MerchantClassification?.Enabled ?? baseline.MerchantClassification;
    bool descriptionGeneration = request.DescriptionGeneration?.Enabled ?? baseline.DescriptionGeneration;

    if (!merchantClassification && !descriptionGeneration)
    {
      throw new ArgumentException(
        "An analysis run must enable at least one capability.",
        nameof(request));
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

  private static bool HasInvoiceCapabilityOverrides(InvoiceAnalysisRequestDto request) =>
    request.DocumentExtraction is not null
    || request.InvoiceSummary is not null
    || request.ProductClassification is not null
    || request.AllergenAssessment is not null
    || request.InvoiceClassification is not null
    || request.RecipeGeneration is not null;

  private static bool HasMerchantCapabilityOverrides(MerchantAnalysisRequestDto request) =>
    request.MerchantClassification is not null
    || request.DescriptionGeneration is not null;

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
