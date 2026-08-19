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
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using GenerativeService = arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis.AnalysisFoundationService;

/// <summary>
/// Verifies validation guard edge cases in the generative analysis foundation service.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisValidationGuardTests
{
  /// <summary>
  /// Verifies that invalid structured confidence values are rejected before allergen signals are returned.
  /// </summary>
  [TestMethod]
  [DataRow(double.NaN)]
  [DataRow(double.PositiveInfinity)]
  [DataRow(double.NegativeInfinity)]
  [DataRow(-0.01)]
  [DataRow(1.01)]
  public async Task AssessAllergensAsync_InvalidStructuredConfidence_ThrowsDependencyException(double confidence)
  {
    var response = new GenerativeService.AllergenAssessmentBatchStructuredResult(
      [
        new GenerativeService.AllergenAssessmentStructuredEntry(
          "item-0001",
          "SignalsFound",
          [
            new GenerativeService.AllergenSignalStructuredEntry(
              AllergenCode.Milk.ToString(),
              ProductAllergenEvidenceTier.Likely.ToString(),
              confidence,
              [new GenerativeService.AllergenEvidenceStructuredEntry("productName", "lapte")])
          ])
      ]);
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(response));
    var harness = GenerativeClassificationHarness.Create(broker);

    await AssertInvalidStructuredOutputAsync(
      () => harness.Service.AssessAllergensAsync(
        CreateProducts(),
        CreateProductClassifications(),
        Guid.NewGuid(),
        CancellationToken.None));
  }

  /// <summary>
  /// Verifies that boundary confidence values zero and one are accepted.
  /// </summary>
  [TestMethod]
  [DataRow(0.0)]
  [DataRow(1.0)]
  public async Task AssessAllergensAsync_BoundaryStructuredConfidence_ReturnsAssessment(double confidence)
  {
    var response = new GenerativeService.AllergenAssessmentBatchStructuredResult(
      [
        new GenerativeService.AllergenAssessmentStructuredEntry(
          "item-0001",
          "SignalsFound",
          [
            new GenerativeService.AllergenSignalStructuredEntry(
              AllergenCode.Milk.ToString(),
              ProductAllergenEvidenceTier.Likely.ToString(),
              confidence,
              [new GenerativeService.AllergenEvidenceStructuredEntry("productName", "lapte")])
          ])
      ]);
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(response));
    var harness = GenerativeClassificationHarness.Create(broker);

    ProductAllergenAssessmentResult result = await harness.Service.AssessAllergensAsync(
      CreateProducts(),
      CreateProductClassifications(),
      Guid.NewGuid(),
      CancellationToken.None);

    Assert.AreEqual(confidence, result.Assessments["item-0001"].Signals[0].Confidence);
  }

  /// <summary>
  /// Verifies that recipe maximums outside the inclusive range are rejected before broker invocation.
  /// </summary>
  [TestMethod]
  [DataRow(-1)]
  [DataRow(0)]
  [DataRow(4)]
  public async Task GenerateRecipesAsync_InvalidMaximumRecipes_ThrowsValidationException(int maximumRecipes)
  {
    var broker = new ScriptedGenerativeAnalysisBroker();
    var harness = GenerativeClassificationHarness.Create(broker);

    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => harness.Service.GenerateRecipesAsync(
        CreateProducts(),
        CreateProductClassifications(),
        CreateAllergenAssessments(),
        maximumRecipes,
        Guid.NewGuid(),
        CancellationToken.None));

    Assert.AreEqual(0, broker.InvocationCount);
  }

  /// <summary>
  /// Verifies that valid recipe maximum boundaries are accepted.
  /// </summary>
  [TestMethod]
  [DataRow(1)]
  [DataRow(3)]
  public async Task GenerateRecipesAsync_ValidMaximumRecipes_ReturnsRecipes(int maximumRecipes)
  {
    var harness = CreateRecipeHarness(CreateRecipe());

    RecipeGenerationResult result = await harness.Service.GenerateRecipesAsync(
      CreateProducts(),
      CreateProductClassifications(),
      CreateAllergenAssessments(),
      maximumRecipes,
      Guid.NewGuid(),
      CancellationToken.None);

    Assert.AreEqual(1, result.Recipes.Count);
  }

  /// <summary>
  /// Verifies that an empty source run identifier is rejected before broker invocation.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_EmptySourceRunId_ThrowsValidationException()
  {
    var broker = new ScriptedGenerativeAnalysisBroker();
    var harness = GenerativeClassificationHarness.Create(broker);

    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => harness.Service.GenerateInvoiceSummaryAsync(CreateProducts(), Guid.Empty, CancellationToken.None));

    Assert.AreEqual(0, broker.InvocationCount);
  }

  /// <summary>
  /// Verifies that recipe generation rejects allergen assessment sets that do not cover every requested product.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_AllergenAssessmentsMissingProduct_ThrowsValidationException()
  {
    var broker = new ScriptedGenerativeAnalysisBroker();
    var harness = GenerativeClassificationHarness.Create(broker);
    var missingAssessments = new ProductAllergenAssessmentResult(
      new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal));

    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => harness.Service.GenerateRecipesAsync(
        CreateProducts(),
        CreateProductClassifications(),
        missingAssessments,
        maximumRecipes: 1,
        Guid.NewGuid(),
        CancellationToken.None));

    Assert.AreEqual(0, broker.InvocationCount);
  }

  /// <summary>
  /// Verifies that optional structured recipe text normalizes null and blank values to null and trims padded text.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_OptionalStructuredTextValues_NormalizesNullBlankAndPaddedText()
  {
    var recipe = CreateRecipe() with
    {
      PurchasedIngredients =
      [
        new GenerativeService.RecipeStructuredIngredient("lapte", "500 ml", null),
        new GenerativeService.RecipeStructuredIngredient("oats", "100 g", " "),
        new GenerativeService.RecipeStructuredIngredient("honey", "1 tsp", "  warmed  "),
      ],
      Steps =
      [
        new GenerativeService.RecipeStructuredStep(1, "Heat the milk.", null),
        new GenerativeService.RecipeStructuredStep(2, "Add oats.", " "),
        new GenerativeService.RecipeStructuredStep(3, "Serve warm.", "  optional garnish  "),
      ],
    };
    var harness = CreateRecipeHarness(recipe);

    RecipeGenerationResult result = await harness.Service.GenerateRecipesAsync(
      CreateProducts(),
      CreateProductClassifications(),
      CreateAllergenAssessments(),
      maximumRecipes: 1,
      Guid.NewGuid(),
      CancellationToken.None);

    Assert.IsNull(result.Recipes[0].PurchasedIngredients[0].Preparation);
    Assert.IsNull(result.Recipes[0].PurchasedIngredients[1].Preparation);
    Assert.AreEqual("warmed", result.Recipes[0].PurchasedIngredients[2].Preparation);
    Assert.IsNull(result.Recipes[0].Steps[0].Notes);
    Assert.IsNull(result.Recipes[0].Steps[1].Notes);
    Assert.AreEqual("optional garnish", result.Recipes[0].Steps[2].Notes);
  }

  /// <summary>
  /// Verifies that non-positive structured serving counts are rejected.
  /// </summary>
  [TestMethod]
  [DataRow(0)]
  [DataRow(-1)]
  public async Task GenerateRecipesAsync_NonPositiveServings_ThrowsDependencyException(int servings)
  {
    var harness = CreateRecipeHarness(CreateRecipe() with { Servings = servings });

    await AssertInvalidStructuredOutputAsync(
      () => harness.Service.GenerateRecipesAsync(
        CreateProducts(),
        CreateProductClassifications(),
        CreateAllergenAssessments(),
        maximumRecipes: 1,
        Guid.NewGuid(),
        CancellationToken.None));
  }

  /// <summary>
  /// Verifies that negative structured minute counts are rejected.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_NegativePreparationMinutes_ThrowsDependencyException()
  {
    var harness = CreateRecipeHarness(CreateRecipe() with { PreparationMinutes = -1, TotalMinutes = 10 });

    await AssertInvalidStructuredOutputAsync(
      () => harness.Service.GenerateRecipesAsync(
        CreateProducts(),
        CreateProductClassifications(),
        CreateAllergenAssessments(),
        maximumRecipes: 1,
        Guid.NewGuid(),
        CancellationToken.None));
  }

  private static GenerativeClassificationHarness CreateRecipeHarness(GenerativeService.RecipeStructuredSuggestion recipe)
  {
    var response = new GenerativeService.RecipeGenerationStructuredResult([recipe]);
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(response));
    return GenerativeClassificationHarness.Create(broker);
  }

  private static GenerativeService.RecipeStructuredSuggestion CreateRecipe() =>
    new(
      "Warm milk porridge",
      "A simple warm breakfast bowl.",
      2,
      5,
      10,
      15,
      "Easy",
      [new GenerativeService.RecipeStructuredIngredient("lapte", "500 ml", null)],
      [],
      [],
      [new GenerativeService.RecipeStructuredStep(1, "Heat the milk.", null)],
      [AllergenCode.Milk.ToString()]);

  private static IReadOnlyList<ProductAnalysisInput> CreateProducts() =>
    [new ProductAnalysisInput("item-0001", new Product { Name = "lapte", Quantity = 1, QuantityUnit = "l" })];

  private static ProductClassificationResult CreateProductClassifications() =>
    new(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
    {
      ["item-0001"] = new StandardClassification(
        ClassificationSystem.Gs1Gpc,
        "2026-05",
        "10000025",
        "Milk (Perishable)",
        [
          new ClassificationNode("segment", "50000000", "Food/Beverage"),
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
            ProductAllergenEvidenceTier.Declared,
            0.98,
            [new AllergenEvidence("ingredientsText", "milk")])
        ]),
    });

  private static async Task AssertInvalidStructuredOutputAsync(Func<Task> action)
  {
    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(action);
    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }
}
