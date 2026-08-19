namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Defines invariant tests for structured recipe suggestion contracts.
/// </summary>
[TestClass]
public sealed class RecipeSuggestionTests
{
  /// <summary>
  /// Verifies that total duration cannot be below preparation and cooking components.
  /// </summary>
  [TestMethod]
  public void RecipeSuggestion_TotalBelowComponents_Throws() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
      new RecipeSuggestion(
        "Soup",
        "Description",
        2,
        15,
        30,
        20,
        RecipeDifficulty.Easy,
        [],
        [],
        [],
        [new RecipeStep(1, "Cook", null)],
        [],
        Guid.NewGuid()));

  /// <summary>
  /// Verifies that recipe suggestions snapshot collection inputs.
  /// </summary>
  [TestMethod]
  public void RecipeSuggestion_ValidInput_SnapshotsCollections()
  {
    // Arrange
    var purchasedIngredients = new List<RecipeIngredient>
    {
      new("Tomatoes", "2", "ripe")
    };

    var steps = new List<RecipeStep>
    {
      new(1, "Chop the tomatoes.", null)
    };

    var warnings = new List<AllergenCode>
    {
      AllergenCode.Celery
    };

    // Act
    var recipe = new RecipeSuggestion(
      "Tomato salad",
      "A quick salad.",
      2,
      10,
      0,
      10,
      RecipeDifficulty.Easy,
      purchasedIngredients,
      [],
      [],
      steps,
      warnings,
      Guid.NewGuid());

    purchasedIngredients.Clear();
    steps.Add(new RecipeStep(2, "Serve immediately.", null));
    warnings.Clear();

    // Assert
    Assert.AreEqual(1, recipe.PurchasedIngredients.Count);
    Assert.AreEqual(1, recipe.Steps.Count);
    Assert.AreEqual(1, recipe.AllergenWarnings.Count);
  }

  /// <summary>
  /// Verifies that recipe steps must start with a positive sequence number.
  /// </summary>
  [TestMethod]
  public void RecipeStep_SequenceBelowOne_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new RecipeStep(0, "Cook", null));
}
