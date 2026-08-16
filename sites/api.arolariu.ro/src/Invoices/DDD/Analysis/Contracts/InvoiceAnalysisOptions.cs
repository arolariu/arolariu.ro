namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Represents the selected invoice analysis capability set for a single workflow invocation.
/// </summary>
/// <remarks>
/// <para>This contract captures only capability selection and recipe limits. It deliberately excludes run metadata and persisted stamps because those arrive in later pipeline tasks.</para>
/// <para><b>Dependency Closure:</b> Recipe generation and allergen assessment both require product classification to be enabled.</para>
/// <para><b>Profiles:</b> <see cref="AnalysisProfile.Comprehensive"/> must exactly match the published comprehensive preset; callers requiring custom combinations must use <see cref="AnalysisProfile.Custom"/>.</para>
/// </remarks>
public sealed record InvoiceAnalysisOptions
{
  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceAnalysisOptions"/> record.
  /// </summary>
  /// <param name="profile">The composition profile describing how these capability selections were produced.</param>
  /// <param name="documentExtraction">Whether document extraction should run.</param>
  /// <param name="merchantResolution">Whether merchant resolution should run.</param>
  /// <param name="invoiceSummary">Whether invoice summarization should run.</param>
  /// <param name="productClassification">Whether product classification should run.</param>
  /// <param name="allergenAssessment">Whether allergen assessment should run.</param>
  /// <param name="invoiceClassification">Whether invoice classification should run.</param>
  /// <param name="recipeGeneration">Whether recipe generation should run.</param>
  /// <param name="maximumRecipes">The maximum number of recipes that may be produced when recipe generation is enabled.</param>
  /// <exception cref="ArgumentException">
  /// Thrown when the profile conflicts with the supplied capability flags or when capability dependency closure rules are violated.
  /// </exception>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when <paramref name="maximumRecipes"/> is negative, when recipe generation is enabled without a positive limit,
  /// or when recipe generation is disabled but a non-zero limit is supplied.
  /// </exception>
  public InvoiceAnalysisOptions(
    AnalysisProfile profile,
    bool documentExtraction,
    bool merchantResolution,
    bool invoiceSummary,
    bool productClassification,
    bool allergenAssessment,
    bool invoiceClassification,
    bool recipeGeneration,
    int maximumRecipes)
  {
    if (!Enum.IsDefined(profile))
    {
      throw new ArgumentOutOfRangeException(nameof(profile), profile, "Profile must be a defined analysis profile.");
    }

    if (allergenAssessment && !productClassification)
    {
      throw new ArgumentException("Allergen assessment requires product classification.", nameof(allergenAssessment));
    }

    if (recipeGeneration && !productClassification)
    {
      throw new ArgumentException("Recipe generation requires product classification.", nameof(recipeGeneration));
    }

    maximumRecipes = AnalysisContractGuards.RequireNonNegative(maximumRecipes, nameof(maximumRecipes));

    if (recipeGeneration)
    {
      AnalysisContractGuards.RequirePositive(maximumRecipes, nameof(maximumRecipes));
    }
    else if (maximumRecipes != 0)
    {
      throw new ArgumentOutOfRangeException(nameof(maximumRecipes), maximumRecipes, "Maximum recipes must be zero when recipe generation is disabled.");
    }

    if (profile == AnalysisProfile.Comprehensive
        && !HasComprehensiveShape(
          documentExtraction,
          merchantResolution,
          invoiceSummary,
          productClassification,
          allergenAssessment,
          invoiceClassification,
          recipeGeneration,
          maximumRecipes))
    {
      throw new ArgumentException("Comprehensive analysis options must match the published comprehensive preset.", nameof(profile));
    }

    Profile = profile;
    DocumentExtraction = documentExtraction;
    MerchantResolution = merchantResolution;
    InvoiceSummary = invoiceSummary;
    ProductClassification = productClassification;
    AllergenAssessment = allergenAssessment;
    InvoiceClassification = invoiceClassification;
    RecipeGeneration = recipeGeneration;
    MaximumRecipes = maximumRecipes;
  }

  /// <summary>
  /// Gets the composition profile describing how this capability set was produced.
  /// </summary>
  public AnalysisProfile Profile { get; }

  /// <summary>
  /// Gets a value indicating whether document extraction should run.
  /// </summary>
  public bool DocumentExtraction { get; }

  /// <summary>
  /// Gets a value indicating whether merchant resolution should run.
  /// </summary>
  public bool MerchantResolution { get; }

  /// <summary>
  /// Gets a value indicating whether invoice summarization should run.
  /// </summary>
  public bool InvoiceSummary { get; }

  /// <summary>
  /// Gets a value indicating whether product classification should run.
  /// </summary>
  public bool ProductClassification { get; }

  /// <summary>
  /// Gets a value indicating whether allergen assessment should run.
  /// </summary>
  public bool AllergenAssessment { get; }

  /// <summary>
  /// Gets a value indicating whether invoice classification should run.
  /// </summary>
  public bool InvoiceClassification { get; }

  /// <summary>
  /// Gets a value indicating whether recipe generation should run.
  /// </summary>
  public bool RecipeGeneration { get; }

  /// <summary>
  /// Gets the maximum number of recipes that may be produced.
  /// </summary>
  public int MaximumRecipes { get; }

  /// <summary>
  /// Creates the published comprehensive invoice analysis preset.
  /// </summary>
  /// <returns>The comprehensive invoice analysis option set.</returns>
  public static InvoiceAnalysisOptions Comprehensive() =>
    new(
      AnalysisProfile.Comprehensive,
      documentExtraction: true,
      merchantResolution: true,
      invoiceSummary: true,
      productClassification: true,
      allergenAssessment: true,
      invoiceClassification: true,
      recipeGeneration: true,
      maximumRecipes: 3);

  private static bool HasComprehensiveShape(
    bool documentExtraction,
    bool merchantResolution,
    bool invoiceSummary,
    bool productClassification,
    bool allergenAssessment,
    bool invoiceClassification,
    bool recipeGeneration,
    int maximumRecipes) =>
      documentExtraction
      && merchantResolution
      && invoiceSummary
      && productClassification
      && allergenAssessment
      && invoiceClassification
      && recipeGeneration
      && maximumRecipes == 3;
}
