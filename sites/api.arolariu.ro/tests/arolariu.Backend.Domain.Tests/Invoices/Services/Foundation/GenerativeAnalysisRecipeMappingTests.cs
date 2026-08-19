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

using Microsoft.VisualStudio.TestTools.UnitTesting;

using GenerativeService = arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis.GenerativeAnalysisFoundationService;

/// <summary>
/// Verifies recipe structured-output mapping branches.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisRecipeMappingTests
{
  /// <summary>
  /// Verifies every supported recipe difficulty is parsed successfully.
  /// </summary>
  [TestMethod]
  [DataRow(nameof(RecipeDifficulty.Easy))]
  [DataRow(nameof(RecipeDifficulty.Medium))]
  [DataRow(nameof(RecipeDifficulty.Hard))]
  public async Task GenerateRecipesAsync_SupportedDifficulty_ReturnsRecipe(string difficulty)
  {
    RecipeGenerationResult result = await ExecuteRecipeAsync(CreateRecipe(difficulty: difficulty));

    Assert.AreEqual(difficulty, result.Recipes[0].Difficulty.ToString());
  }

  /// <summary>
  /// Verifies unsupported and wrong-case recipe difficulty values are rejected.
  /// </summary>
  [TestMethod]
  [DataRow(null)]
  [DataRow("")]
  [DataRow("   ")]
  [DataRow("easy")]
  [DataRow("Unknown")]
  public async Task GenerateRecipesAsync_InvalidDifficulty_ThrowsDependencyException(string? difficulty)
  {
    await AssertInvalidStructuredOutputAsync(() => ExecuteRecipeAsync(CreateRecipe(difficulty: difficulty!)));
  }

  /// <summary>
  /// Verifies empty ingredient buckets and warning collections map to empty result sections.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_EmptyIngredientsAndWarnings_ReturnsRecipeWithEmptySections()
  {
    GenerativeService.RecipeStructuredSuggestion recipe = CreateRecipe(
      purchasedIngredients: [],
      pantryStaples: [],
      missingOptionalIngredients: [],
      allergenWarnings: []);

    RecipeGenerationResult result = await ExecuteRecipeAsync(recipe);

    Assert.AreEqual(0, result.Recipes[0].PurchasedIngredients.Count);
    Assert.AreEqual(0, result.Recipes[0].AssumedPantryStaples.Count);
    Assert.AreEqual(0, result.Recipes[0].MissingOptionalIngredients.Count);
    Assert.AreEqual(0, result.Recipes[0].AllergenWarnings.Count);
  }

  /// <summary>
  /// Verifies null ingredient buckets are rejected before recipe construction.
  /// </summary>
  [TestMethod]
  [DataRow("purchased")]
  [DataRow("pantry")]
  [DataRow("missing")]
  public async Task GenerateRecipesAsync_NullIngredientBucket_ThrowsDependencyException(string bucket)
  {
    GenerativeService.RecipeStructuredSuggestion recipe = bucket switch
    {
      "purchased" => CreateRecipe() with { PurchasedIngredients = null! },
      "pantry" => CreateRecipe() with { AssumedPantryStaples = null! },
      _ => CreateRecipe() with { MissingOptionalIngredients = null! },
    };

    await AssertInvalidStructuredOutputAsync(() => ExecuteRecipeAsync(recipe));
  }

  /// <summary>
  /// Verifies null recipe steps are rejected before ordered-step validation.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_NullSteps_ThrowsDependencyException()
  {
    await AssertInvalidStructuredOutputAsync(() => ExecuteRecipeAsync(CreateRecipe() with { Steps = null! }));
  }

  /// <summary>
  /// Verifies empty recipe steps are rejected by the recipe value object.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_EmptySteps_ThrowsDependencyException()
  {
    await AssertInvalidStructuredOutputAsync(() => ExecuteRecipeAsync(CreateRecipe(steps: [])));
  }

  /// <summary>
  /// Verifies null recipe warnings are rejected before warning mapping succeeds.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_NullWarnings_ThrowsDependencyException()
  {
    await AssertInvalidStructuredOutputAsync(() => ExecuteRecipeAsync(CreateRecipe() with { AllergenWarnings = null! }));
  }

  /// <summary>
  /// Verifies ingredient buckets must be disjoint across purchased, pantry, and missing sections.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_OverlappingIngredientBuckets_ThrowsDependencyException()
  {
    await AssertInvalidStructuredOutputAsync(
      () => ExecuteRecipeAsync(CreateRecipe(
        purchasedIngredients: [CreateIngredient("Milk")],
        pantryStaples: [CreateIngredient("milk")])));
  }

  /// <summary>
  /// Verifies disjoint ingredient buckets map successfully.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_DisjointIngredientBuckets_ReturnsRecipe()
  {
    RecipeGenerationResult result = await ExecuteRecipeAsync(CreateRecipe(
      purchasedIngredients: [CreateIngredient("Milk")],
      pantryStaples: [CreateIngredient("Oats")],
      missingOptionalIngredients: [CreateIngredient("Honey")],
      allergenWarnings: [nameof(AllergenCode.Milk)]));

    Assert.AreEqual(1, result.Recipes[0].PurchasedIngredients.Count);
    Assert.AreEqual(1, result.Recipes[0].AssumedPantryStaples.Count);
    Assert.AreEqual(1, result.Recipes[0].MissingOptionalIngredients.Count);
    Assert.AreEqual(AllergenCode.Milk, result.Recipes[0].AllergenWarnings[0]);
  }

  /// <summary>
  /// Verifies non-food classifications short-circuit recipe generation without invoking the broker.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_NonFoodClassification_ReturnsEmptyResultWithoutBrokerInvocation()
  {
    var broker = new ScriptedGenerativeAnalysisBroker();
    GenerativeClassificationHarness harness = GenerativeClassificationHarness.Create(broker);

    RecipeGenerationResult result = await harness.Service.GenerateRecipesAsync(
      CreateProducts(),
      CreateNonFoodClassifications(),
      CreateAllergenAssessments(),
      maximumRecipes: 1,
      Guid.NewGuid(),
      CancellationToken.None);

    Assert.AreEqual(0, result.Recipes.Count);
    Assert.AreEqual(0, broker.InvocationCount);
  }


  /// <summary>
  /// Verifies food classifications can be recognized by the hierarchy label when the segment code differs.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_FoodClassificationLabel_ReturnsRecipe()
  {
    RecipeGenerationResult result = await ExecuteRecipeAsync(CreateRecipe(), CreateFoodLabelClassifications());

    Assert.AreEqual(1, result.Recipes.Count);
  }

  /// <summary>
  /// Verifies non-GPC classifications short-circuit recipe generation even when their labels mention food.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_NonGpcClassification_ReturnsEmptyResultWithoutBrokerInvocation()
  {
    var broker = new ScriptedGenerativeAnalysisBroker();
    GenerativeClassificationHarness harness = GenerativeClassificationHarness.Create(broker);

    RecipeGenerationResult result = await harness.Service.GenerateRecipesAsync(
      CreateProducts(),
      CreateNonGpcClassifications(),
      CreateAllergenAssessments(),
      maximumRecipes: 1,
      Guid.NewGuid(),
      CancellationToken.None);

    Assert.AreEqual(0, result.Recipes.Count);
    Assert.AreEqual(0, broker.InvocationCount);
  }

  private static Task<RecipeGenerationResult> ExecuteRecipeAsync(GenerativeService.RecipeStructuredSuggestion recipe) =>
    ExecuteRecipeAsync(recipe, CreateFoodClassifications());

  private static async Task<RecipeGenerationResult> ExecuteRecipeAsync(
    GenerativeService.RecipeStructuredSuggestion recipe,
    ProductClassificationResult classifications)
  {
    var response = new GenerativeService.RecipeGenerationStructuredResult([recipe]);
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(response));
    GenerativeClassificationHarness harness = GenerativeClassificationHarness.Create(broker);

    return await harness.Service.GenerateRecipesAsync(
      CreateProducts(),
      classifications,
      CreateAllergenAssessments(),
      maximumRecipes: 1,
      Guid.NewGuid(),
      CancellationToken.None);
  }

  private static GenerativeService.RecipeStructuredSuggestion CreateRecipe(
    string difficulty = nameof(RecipeDifficulty.Easy),
    IReadOnlyList<GenerativeService.RecipeStructuredIngredient>? purchasedIngredients = null,
    IReadOnlyList<GenerativeService.RecipeStructuredIngredient>? pantryStaples = null,
    IReadOnlyList<GenerativeService.RecipeStructuredIngredient>? missingOptionalIngredients = null,
    IReadOnlyList<GenerativeService.RecipeStructuredStep>? steps = null,
    IReadOnlyList<string>? allergenWarnings = null) =>
    new(
      "Warm milk porridge",
      "A simple warm breakfast bowl.",
      2,
      5,
      10,
      15,
      difficulty,
      purchasedIngredients ?? [CreateIngredient("Milk")],
      pantryStaples ?? [],
      missingOptionalIngredients ?? [],
      steps ?? [new GenerativeService.RecipeStructuredStep(1, "Heat the milk.", null)],
      allergenWarnings ?? []);

  private static GenerativeService.RecipeStructuredIngredient CreateIngredient(string name) =>
    new(name, "1 cup", null);

  private static List<ProductAnalysisInput> CreateProducts() =>
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


  private static ProductClassificationResult CreateFoodLabelClassifications() =>
    new(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
    {
      ["item-0001"] = new StandardClassification(
        ClassificationSystem.Gs1Gpc,
        "2026-05",
        "10000025",
        "Milk (Perishable)",
        [
          new ClassificationNode("segment", "50100000", "Food/Beverage"),
          new ClassificationNode("brick", "10000025", "Milk (Perishable)"),
        ],
        ClassificationOrigin.Analysis,
        0.9,
        [new ClassificationEvidence("subject.description", "lapte")]),
    });

  private static ProductClassificationResult CreateNonGpcClassifications() =>
    new(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
    {
      ["item-0001"] = new StandardClassification(
        ClassificationSystem.Nace21,
        "2.1",
        "47.11",
        "Retail sale in non-specialised stores",
        [new ClassificationNode("class", "47.11", "Food/Beverage")],
        ClassificationOrigin.Analysis,
        0.9,
        [new ClassificationEvidence("subject.description", "merchant")]),
    });
  private static ProductClassificationResult CreateNonFoodClassifications() =>
    new(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
    {
      ["item-0001"] = new StandardClassification(
        ClassificationSystem.Gs1Gpc,
        "2026-05",
        "67000000",
        "Household appliances",
        [new ClassificationNode("segment", "67000000", "Household appliances")],
        ClassificationOrigin.Analysis,
        0.9,
        [new ClassificationEvidence("subject.description", "appliance")]),
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


