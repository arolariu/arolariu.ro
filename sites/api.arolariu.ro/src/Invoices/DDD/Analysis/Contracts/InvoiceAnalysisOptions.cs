namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Represents the selected invoice analysis capability set for a single workflow invocation.
/// </summary>
/// <remarks>
/// <para>This contract captures only capability selection and recipe limits. It deliberately excludes run metadata and persisted stamps because those arrive in later pipeline tasks.</para>
/// <para><b>Dependency Closure:</b> Allergen assessment requires product classification to be enabled. Recipe generation
/// requires allergen assessment to be enabled (and therefore, transitively, product classification as well) — this
/// mirrors the orchestration DAG (Task 9), which only attempts recipe generation once both product classification and
/// allergen assessment outcomes are available; without this closure a legal <see cref="AnalysisProfile.Custom"/>
/// selection could enable recipe generation while disabling allergen assessment, causing the DAG to silently skip
/// recipes forever.</para>
/// <para><b>Profiles:</b> <see cref="AnalysisProfile.Fast"/>, <see cref="AnalysisProfile.Balanced"/>, and <see cref="AnalysisProfile.Comprehensive"/> must each exactly match their published preset shape; callers requiring custom combinations must use <see cref="AnalysisProfile.Custom"/>.</para>
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

    if (merchantResolution && !documentExtraction)
    {
      throw new ArgumentException("Merchant resolution requires document extraction.", nameof(merchantResolution));
    }

    if (invoiceClassification && !documentExtraction)
    {
      throw new ArgumentException("Invoice classification requires document extraction.", nameof(invoiceClassification));
    }

    if (invoiceClassification && !productClassification)
    {
      throw new ArgumentException("Invoice classification requires product classification.", nameof(invoiceClassification));
    }

    if (recipeGeneration && !productClassification)
    {
      throw new ArgumentException("Recipe generation requires product classification.", nameof(recipeGeneration));
    }

    if (recipeGeneration && !allergenAssessment)
    {
      throw new ArgumentException("Recipe generation requires allergen assessment.", nameof(recipeGeneration));
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

    if (profile == AnalysisProfile.Fast
        && !HasFastShape(
          documentExtraction,
          merchantResolution,
          invoiceSummary,
          productClassification,
          allergenAssessment,
          invoiceClassification,
          recipeGeneration,
          maximumRecipes))
    {
      throw new ArgumentException("Fast analysis options must match the published fast preset.", nameof(profile));
    }

    if (profile == AnalysisProfile.Balanced
        && !HasBalancedShape(
          documentExtraction,
          merchantResolution,
          invoiceSummary,
          productClassification,
          allergenAssessment,
          invoiceClassification,
          recipeGeneration,
          maximumRecipes))
    {
      throw new ArgumentException("Balanced analysis options must match the published balanced preset.", nameof(profile));
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

  /// <summary>
  /// Creates the published fast (minimal, low-latency) invoice analysis preset: document extraction, merchant
  /// resolution, product GPC classification, and invoice ECOICOP classification only.
  /// </summary>
  /// <returns>The fast invoice analysis option set.</returns>
  public static InvoiceAnalysisOptions Fast() =>
    new(
      AnalysisProfile.Fast,
      documentExtraction: true,
      merchantResolution: true,
      invoiceSummary: false,
      productClassification: true,
      allergenAssessment: false,
      invoiceClassification: true,
      recipeGeneration: false,
      maximumRecipes: 0);

  /// <summary>
  /// Creates the published balanced (mid-tier) invoice analysis preset: the fast preset plus invoice
  /// summarization and allergen assessment. Recipe generation remains disabled.
  /// </summary>
  /// <returns>The balanced invoice analysis option set.</returns>
  public static InvoiceAnalysisOptions Balanced() =>
    new(
      AnalysisProfile.Balanced,
      documentExtraction: true,
      merchantResolution: true,
      invoiceSummary: true,
      productClassification: true,
      allergenAssessment: true,
      invoiceClassification: true,
      recipeGeneration: false,
      maximumRecipes: 0);

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

  private static bool HasFastShape(
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
      && !invoiceSummary
      && productClassification
      && !allergenAssessment
      && invoiceClassification
      && !recipeGeneration
      && maximumRecipes == 0;

  private static bool HasBalancedShape(
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
      && !recipeGeneration
      && maximumRecipes == 0;
}
