namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using GenerativeService = arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis.GenerativeAnalysisFoundationService;

/// <summary>
/// Covers remaining recipe generation structured-output and ingredient bucket branch combinations.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisRecipeBranchCoverageTests
{
  /// <summary>
  /// Verifies a null recipes collection is rejected as invalid structured output.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_NullRecipesCollection_ThrowsDependencyException()
  {
    await AssertInvalidStructuredOutputAsync(() => ExecuteRecipesAsync(null!));
  }

  /// <summary>
  /// Verifies an empty recipes collection is rejected as invalid structured output.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_EmptyRecipesCollection_ThrowsDependencyException()
  {
    GenerativeService.RecipeStructuredSuggestion[] recipes = [];

    await AssertInvalidStructuredOutputAsync(() => ExecuteRecipesAsync(recipes));
  }

  /// <summary>
  /// Verifies every ingredient bucket overlap clause rejects only the matching duplicate-name combination.
  /// </summary>
  /// <param name="overlapCase">The overlap case selector.</param>
  /// <param name="expectsDependencyException">Whether the structured output should be rejected.</param>
  [TestMethod]
  [DataRow("none", false)]
  [DataRow("purchased-pantry", true)]
  [DataRow("purchased-missing", true)]
  [DataRow("pantry-missing", true)]
  public async Task GenerateRecipesAsync_IngredientBucketOverlapMatrix_ReturnsExpectedOutcome(
    string overlapCase,
    bool expectsDependencyException)
  {
    GenerativeService.RecipeStructuredSuggestion recipe = CreateRecipeForOverlapCase(overlapCase);

    if (expectsDependencyException)
    {
      await AssertInvalidStructuredOutputAsync(() => ExecuteRecipesAsync([recipe]));
    }
    else
    {
      RecipeGenerationResult result = await ExecuteRecipesAsync([recipe]);

      Assert.AreEqual(1, result.Recipes.Count);
    }
  }

  /// <summary>
  /// Verifies provider-controlled recipe text cannot escape through the structured-output exception logging path.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_WhenRecipeOutputContainsSensitiveContent_ExcludesItFromTelemetry()
  {
    const string sensitiveSentinel =
      "https://scan.example.test/receipt.jpg?sig=FAKE-SAS|MERCHANT=PRIVATE-MERCHANT|RESPONSE=PRIVATE-RECEIPT";
    GenerativeService.RecipeStructuredSuggestion recipe = new(
      sensitiveSentinel,
      "Provider response text.",
      Servings: 1,
      PreparationMinutes: 5,
      CookingMinutes: 10,
      TotalMinutes: 1,
      Difficulty: nameof(RecipeDifficulty.Easy),
      PurchasedIngredients: [CreateIngredient("Milk")],
      AssumedPantryStaples: [],
      MissingOptionalIngredients: [],
      Steps: [new GenerativeService.RecipeStructuredStep(1, "Heat.", null)],
      AllergenWarnings: [nameof(AllergenCode.Milk)]);
    using var capture = new AnalysisTelemetryPrivacyCapture();
    using ILoggerFactory loggerFactory = LoggerFactory.Create(builder => builder.AddProvider(capture));
    using var activities = new InvoiceActivityRecorder();
    var service = new GenerativeService(
      new ScriptedGenerativeAiBroker(
        ScriptedGenerativeAiBroker.Success(new GenerativeService.RecipeGenerationStructuredResult([recipe]))),
      TaxonomyBrokerTestFactory.Create(),
      loggerFactory);

    await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => service.GenerateRecipesAsync(
        CreateProducts(),
        CreateFoodClassifications(),
        CreateAllergenAssessments(),
        maximumRecipes: 3,
        Guid.NewGuid(),
        CancellationToken.None));

    capture.AssertSurfaceExcludes(activities, sensitiveSentinel);
  }

  private static async Task<RecipeGenerationResult> ExecuteRecipesAsync(
    IReadOnlyList<GenerativeService.RecipeStructuredSuggestion> recipes)
  {
    var response = new GenerativeService.RecipeGenerationStructuredResult(recipes);
    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(response));
    GenerativeClassificationHarness harness = GenerativeClassificationHarness.Create(broker);

    return await harness.Service.GenerateRecipesAsync(
      CreateProducts(),
      CreateFoodClassifications(),
      CreateAllergenAssessments(),
      maximumRecipes: 3,
      Guid.NewGuid(),
      CancellationToken.None);
  }

  private static GenerativeService.RecipeStructuredSuggestion CreateRecipeForOverlapCase(string overlapCase) =>
    overlapCase switch
    {
      "purchased-pantry" => CreateRecipe(
        [CreateIngredient("Milk")],
        [CreateIngredient("milk")],
        [CreateIngredient("Honey")]),
      "purchased-missing" => CreateRecipe(
        [CreateIngredient("Milk")],
        [CreateIngredient("Oats")],
        [CreateIngredient("milk")]),
      "pantry-missing" => CreateRecipe(
        [CreateIngredient("Milk")],
        [CreateIngredient("Oats")],
        [CreateIngredient("oats")]),
      _ => CreateRecipe(
        [CreateIngredient("Milk")],
        [CreateIngredient("Oats")],
        [CreateIngredient("Honey")]),
    };

  private static GenerativeService.RecipeStructuredSuggestion CreateRecipe(
    GenerativeService.RecipeStructuredIngredient[] purchasedIngredients,
    GenerativeService.RecipeStructuredIngredient[] pantryStaples,
    GenerativeService.RecipeStructuredIngredient[] missingOptionalIngredients) =>
    new(
      "Warm milk porridge",
      "A simple warm breakfast bowl.",
      2,
      5,
      10,
      15,
      nameof(RecipeDifficulty.Easy),
      purchasedIngredients,
      pantryStaples,
      missingOptionalIngredients,
      [new GenerativeService.RecipeStructuredStep(1, "Heat the milk.", null)],
      [nameof(AllergenCode.Milk)]);

  private static GenerativeService.RecipeStructuredIngredient CreateIngredient(string name) =>
    new(name, "1 cup", null);

  private static ProductAnalysisInput[] CreateProducts() =>
    [new ProductAnalysisInput("item-0001", new Product { Name = "lapte", Quantity = 1, QuantityUnit = "l" })];

  private static ProductClassificationResult CreateFoodClassifications() =>
    new(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
    {
      ["item-0001"] = new StandardClassification(
        ClassificationSystem.Gs1Gpc,
        "2026-05",
        "10000025",
        "Milk (Perishable)",
        [
          new ClassificationNode("segment", "50000000", "Dairy"),
          new ClassificationNode("brick", "10000025", "Milk (Perishable)"),
        ],
        ClassificationOrigin.Analysis,
        0.9,
        [new ClassificationEvidence("subject.description", "lapte")]),
    });

  private static ProductAllergenAssessmentResult CreateAllergenAssessments() =>
    new(new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal)
    {
      ["item-0001"] = ProductAllergenAssessment.SignalsFound(
        [
          new ProductAllergenSignal(
            AllergenCode.Milk,
            ProductAllergenEvidenceTier.Likely,
            0.98,
            [new AllergenEvidence("productName", "milk")]),
        ]),
    });

  private static async Task AssertInvalidStructuredOutputAsync(Func<Task> action)
  {
    AnalysisFoundationDependencyException exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(action);
    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }
}
