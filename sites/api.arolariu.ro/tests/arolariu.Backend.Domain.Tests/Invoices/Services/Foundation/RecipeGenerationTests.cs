namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using GenerativeService = arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis.AnalysisFoundationService;

/// <summary>
/// Verifies structured recipe generation behavior for the generative analysis foundation service.
/// </summary>
[TestClass]
public sealed class RecipeGenerationTests
{
  /// <summary>
  /// Verifies that recipe generation filters non-food products from the provider payload and returns the typed recipes.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_NonFoodProductsExcludedFromPayload_ReturnsRecipes()
  {
    var harness = GenerativeCapabilityHarness.WithRecipes(
      [
        new GenerativeService.RecipeStructuredSuggestion(
          "Warm milk porridge",
          "A simple warm breakfast bowl.",
          2,
          5,
          10,
          15,
          "Easy",
          [
            new GenerativeService.RecipeStructuredIngredient(
              "lapte",
              "500 ml",
              null)
          ],
          [
            new GenerativeService.RecipeStructuredIngredient(
              "oats",
              "100 g",
              null)
          ],
          [],
          [
            new GenerativeService.RecipeStructuredStep(
              1,
              "Heat the milk in a saucepan.",
              null),
            new GenerativeService.RecipeStructuredStep(
              2,
              "Stir in the oats and simmer until thickened.",
              null),
          ],
          [AllergenCode.Milk.ToString()])
      ]);

    System.Collections.Generic.IReadOnlyList<RecipeSuggestion> result =
      await harness.Service.GenerateRecipesAsync(
      harness.Products,
      harness.Classifications,
      harness.Allergens,
      maximumRecipes: 3,
      Guid.NewGuid(),
      CancellationToken.None);

    string payload = JsonSerializer.Serialize(harness.Broker.CapturedRequests[0].UserPayload);

    Assert.AreEqual(1, result.Count);
    StringAssert.Contains(payload, "lapte", StringComparison.Ordinal);
    Assert.IsFalse(payload.Contains("pensula", StringComparison.Ordinal));
  }

  /// <summary>
  /// Verifies that recipe ingredient buckets must remain disjoint.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_DuplicateIngredientAcrossBuckets_ThrowsDependencyException()
  {
    var harness = GenerativeCapabilityHarness.WithRecipes(
      [
        new GenerativeService.RecipeStructuredSuggestion(
          "Warm milk porridge",
          "A simple warm breakfast bowl.",
          2,
          5,
          10,
          15,
          "Easy",
          [
            new GenerativeService.RecipeStructuredIngredient(
              "lapte",
              "500 ml",
              null)
          ],
          [
            new GenerativeService.RecipeStructuredIngredient(
              "lapte",
              "100 ml",
              null)
          ],
          [],
          [
            new GenerativeService.RecipeStructuredStep(
              1,
              "Heat the milk in a saucepan.",
              null)
          ],
          [AllergenCode.Milk.ToString()])
      ]);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.Service.GenerateRecipesAsync(
        harness.Products,
        harness.Classifications,
        harness.Allergens,
        maximumRecipes: 3,
        Guid.NewGuid(),
        CancellationToken.None));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that recipe steps must start at one and remain ordered.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_StepsDoNotStartAtOne_ThrowsDependencyException()
  {
    var harness = GenerativeCapabilityHarness.WithRecipes(
      [
        new GenerativeService.RecipeStructuredSuggestion(
          "Warm milk porridge",
          "A simple warm breakfast bowl.",
          2,
          5,
          10,
          15,
          "Easy",
          [
            new GenerativeService.RecipeStructuredIngredient(
              "lapte",
              "500 ml",
              null)
          ],
          [],
          [],
          [
            new GenerativeService.RecipeStructuredStep(
              2,
              "Heat the milk in a saucepan.",
              null)
          ],
          [AllergenCode.Milk.ToString()])
      ]);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.Service.GenerateRecipesAsync(
        harness.Products,
        harness.Classifications,
        harness.Allergens,
        maximumRecipes: 3,
        Guid.NewGuid(),
        CancellationToken.None));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that total recipe minutes must not be below preparation plus cooking time.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_TotalMinutesBelowComponents_ThrowsDependencyException()
  {
    var harness = GenerativeCapabilityHarness.WithRecipes(
      [
        new GenerativeService.RecipeStructuredSuggestion(
          "Warm milk porridge",
          "A simple warm breakfast bowl.",
          2,
          5,
          10,
          12,
          "Easy",
          [
            new GenerativeService.RecipeStructuredIngredient(
              "lapte",
              "500 ml",
              null)
          ],
          [],
          [],
          [
            new GenerativeService.RecipeStructuredStep(
              1,
              "Heat the milk in a saucepan.",
              null)
          ],
          [AllergenCode.Milk.ToString()])
      ]);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.Service.GenerateRecipesAsync(
        harness.Products,
        harness.Classifications,
        harness.Allergens,
        maximumRecipes: 3,
        Guid.NewGuid(),
        CancellationToken.None));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that recipe allergen warnings must be derived from the current assessment set.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_WarningNotPresentInAssessments_ThrowsDependencyException()
  {
    var harness = GenerativeCapabilityHarness.WithRecipes(
      [
        new GenerativeService.RecipeStructuredSuggestion(
          "Warm milk porridge",
          "A simple warm breakfast bowl.",
          2,
          5,
          10,
          15,
          "Easy",
          [
            new GenerativeService.RecipeStructuredIngredient(
              "lapte",
              "500 ml",
              null)
          ],
          [],
          [],
          [
            new GenerativeService.RecipeStructuredStep(
              1,
              "Heat the milk in a saucepan.",
              null)
          ],
          [AllergenCode.Soybeans.ToString()])
      ]);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.Service.GenerateRecipesAsync(
        harness.Products,
        harness.Classifications,
        harness.Allergens,
        maximumRecipes: 3,
        Guid.NewGuid(),
        CancellationToken.None));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that structured recipe responses must contain between one and three recipes.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_MoreThanThreeRecipes_ThrowsDependencyException()
  {
    var recipes = Enumerable.Range(1, 4)
      .Select(index =>
        new GenerativeService.RecipeStructuredSuggestion(
          $"Recipe {index}",
          "A simple meal.",
          2,
          5,
          10,
          15,
          "Easy",
          [
            new GenerativeService.RecipeStructuredIngredient(
              "lapte",
              "500 ml",
              null)
          ],
          [],
          [],
          [
            new GenerativeService.RecipeStructuredStep(
              1,
              "Heat the milk in a saucepan.",
              null)
          ],
          [AllergenCode.Milk.ToString()]))
      .ToArray();

    var harness = GenerativeCapabilityHarness.WithRecipes(recipes);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.Service.GenerateRecipesAsync(
        harness.Products,
        harness.Classifications,
        harness.Allergens,
        maximumRecipes: 3,
        Guid.NewGuid(),
        CancellationToken.None));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that the structured recipe response must not exceed a requested maximum below three.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_ResponseExceedsRequestedMaximum_ThrowsDependencyException()
  {
    var recipes = Enumerable.Range(1, 3)
      .Select(index =>
        new GenerativeService.RecipeStructuredSuggestion(
          $"Recipe {index}",
          "A simple meal.",
          2,
          5,
          10,
          15,
          "Easy",
          [
            new GenerativeService.RecipeStructuredIngredient(
              "lapte",
              "500 ml",
              null)
          ],
          [],
          [],
          [
            new GenerativeService.RecipeStructuredStep(
              1,
              "Heat the milk in a saucepan.",
              null)
          ],
          [AllergenCode.Milk.ToString()]))
      .ToArray();

    var harness = GenerativeCapabilityHarness.WithRecipes(recipes);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.Service.GenerateRecipesAsync(
        harness.Products,
        harness.Classifications,
        harness.Allergens,
        maximumRecipes: 2,
        Guid.NewGuid(),
        CancellationToken.None));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that all-non-food recipe inputs return an empty success result without calling the broker.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_AllNonFoodInput_ReturnsEmptyResultWithoutBrokerCall()
  {
    var harness = GenerativeCapabilityHarness.WithNonFoodOnlyRecipeInputs();

    System.Collections.Generic.IReadOnlyList<RecipeSuggestion> result =
      await harness.Service.GenerateRecipesAsync(
      harness.Products,
      harness.Classifications,
      harness.Allergens,
      maximumRecipes: 2,
      Guid.NewGuid(),
      CancellationToken.None);

    Assert.AreEqual(0, result.Count);
    Assert.AreEqual(0, harness.Broker.InvocationCount);
    Assert.AreEqual(0, harness.Broker.CapturedRequests.Count);
  }
}
