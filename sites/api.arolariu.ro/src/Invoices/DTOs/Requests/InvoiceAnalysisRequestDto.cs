namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Represents the request body accepted by the invoice analyze endpoint.
/// </summary>
/// <remarks>
/// <para><b>Tenant safety:</b> This body deliberately carries no user, tenant, or partition identifier. The owner of a
/// run is always resolved server-side from the authenticated principal, so a caller can never queue analysis on behalf
/// of another user by editing the payload.</para>
/// <para><b>Resolution order:</b> the profile (defaulting to <see cref="AnalysisProfile.Comprehensive"/>) resolves the
/// preset baseline, then non-null capability selections are layered over it. All-null capability fields preserve the
/// named profile; one or more explicit selections produce the effective <see cref="AnalysisProfile.Custom"/> profile.
/// <see cref="AnalysisProfile.Custom"/> itself is an output-only effective profile and is rejected on requests.</para>
/// </remarks>
/// <param name="Profile">The named analysis profile to resolve. Defaults to <see cref="AnalysisProfile.Comprehensive"/>.</param>
/// <param name="DocumentExtraction">Optional receipt OCR extraction selection.</param>
/// <param name="InvoiceSummary">Optional invoice summary selection.</param>
/// <param name="ProductClassification">Optional GS1 GPC classification selection.</param>
/// <param name="AllergenAssessment">Optional allergen assessment selection.</param>
/// <param name="InvoiceClassification">Optional ECOICOP classification selection.</param>
/// <param name="RecipeGeneration">Optional recipe generation selection.</param>
/// <param name="MaximumRecipes">Optional recipe result cap in the inclusive range 1 to 3 when generation is enabled.</param>
[Serializable]
public readonly record struct InvoiceAnalysisRequestDto(
  AnalysisProfile? Profile,
  bool? DocumentExtraction,
  bool? InvoiceSummary,
  bool? ProductClassification,
  bool? AllergenAssessment,
  bool? InvoiceClassification,
  bool? RecipeGeneration,
  int? MaximumRecipes)
{
  private const int MaximumSupportedRecipes = 3;

  /// <summary>
  /// Resolves the effective invoice analysis options described by this request.
  /// </summary>
  /// <returns>The effective, validated invoice analysis capability selection.</returns>
  /// <exception cref="ArgumentException">
  /// Thrown when the resolved capability set is empty, violates the capability dependency closure, or when
  /// <see cref="AnalysisProfile.Custom"/> is requested.
  /// </exception>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when the requested maximum recipe count falls outside the inclusive range 1 to 3, or when a disabled
  /// recipe capability is paired with a non-zero recipe count.
  /// </exception>
  public InvoiceAnalysisOptions ToInvoiceAnalysisOptions()
  {
    AnalysisProfile requestedProfile = Profile ?? AnalysisProfile.Comprehensive;

    if (!Enum.IsDefined(requestedProfile))
    {
      throw new ArgumentOutOfRangeException(
        nameof(Profile),
        requestedProfile,
        "Profile must be a defined analysis profile.");
    }

    if (requestedProfile == AnalysisProfile.Custom)
    {
      throw new ArgumentException(
        "The custom profile is an effective response value and cannot be requested.",
        nameof(Profile));
    }

    InvoiceAnalysisOptions baseline = ResolveBaseline(requestedProfile);

    if (!HasCapabilityOverrides())
    {
      return baseline;
    }

    bool documentExtraction = DocumentExtraction ?? baseline.DocumentExtraction;
    bool invoiceSummary = InvoiceSummary ?? baseline.InvoiceSummary;
    bool productClassification = ProductClassification ?? baseline.ProductClassification;
    bool allergenAssessment = AllergenAssessment ?? baseline.AllergenAssessment;
    bool invoiceClassification = InvoiceClassification ?? baseline.InvoiceClassification;
    (bool recipeGeneration, int maximumRecipes) = ResolveRecipeSelection(
      baseline,
      RecipeGeneration,
      MaximumRecipes);

    if (!documentExtraction
      && !invoiceSummary
      && !productClassification
      && !allergenAssessment
      && !invoiceClassification
      && !recipeGeneration)
    {
      throw new ArgumentException(
        "An analysis run must enable at least one capability.",
        nameof(InvoiceAnalysisRequestDto));
    }

    ValidateClientDependencyClosure(
      documentExtraction,
      productClassification,
      allergenAssessment,
      invoiceClassification,
      recipeGeneration);

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

  private static void ValidateClientDependencyClosure(
    bool documentExtraction,
    bool productClassification,
    bool allergenAssessment,
    bool invoiceClassification,
    bool recipeGeneration)
  {
    if (allergenAssessment && !productClassification)
    {
      throw new ArgumentException(
        "Allergen assessment requires product classification.",
        nameof(allergenAssessment));
    }

    if (invoiceClassification && (!documentExtraction || !productClassification))
    {
      throw new ArgumentException(
        "Invoice classification requires document extraction and product classification.",
        nameof(invoiceClassification));
    }

    if (recipeGeneration && (!productClassification || !allergenAssessment))
    {
      throw new ArgumentException(
        "Recipe generation requires product classification and allergen assessment.",
        nameof(recipeGeneration));
    }
  }

  private static InvoiceAnalysisOptions ResolveBaseline(AnalysisProfile profile) =>
    profile switch
    {
      AnalysisProfile.Comprehensive => InvoiceAnalysisOptions.Comprehensive(),
      AnalysisProfile.Fast => InvoiceAnalysisOptions.Fast(),
      _ => InvoiceAnalysisOptions.Balanced(),
    };

  private bool HasCapabilityOverrides() =>
    DocumentExtraction is not null
    || InvoiceSummary is not null
    || ProductClassification is not null
    || AllergenAssessment is not null
    || InvoiceClassification is not null
    || RecipeGeneration is not null
    || MaximumRecipes is not null;

  private static (bool RecipeGeneration, int MaximumRecipes) ResolveRecipeSelection(
    InvoiceAnalysisOptions baseline,
    bool? recipeGenerationOverride,
    int? maximumRecipesOverride)
  {
    bool recipeGeneration = recipeGenerationOverride ?? baseline.RecipeGeneration;

    if (!recipeGeneration)
    {
      if (maximumRecipesOverride is int configuredMaximumRecipes && configuredMaximumRecipes != 0)
      {
        throw new ArgumentOutOfRangeException(
          nameof(maximumRecipesOverride),
          configuredMaximumRecipes,
          "Maximum recipes must be zero or omitted when recipe generation is disabled.");
      }

      return (false, 0);
    }

    int maximumRecipes = maximumRecipesOverride
      ?? (recipeGenerationOverride is true ? MaximumSupportedRecipes : baseline.MaximumRecipes);

    if (maximumRecipes is < 1 or > MaximumSupportedRecipes)
    {
      throw new ArgumentOutOfRangeException(
        nameof(maximumRecipesOverride),
        maximumRecipes,
        $"Maximum recipes must be in the inclusive range 1 to {MaximumSupportedRecipes}.");
    }

    return (true, maximumRecipes);
  }
}
