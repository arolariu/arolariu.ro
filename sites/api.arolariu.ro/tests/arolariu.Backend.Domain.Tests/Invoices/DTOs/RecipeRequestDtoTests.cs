namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies recipe ingredient, step, and suggestion request DTO mapping to domain value objects.</summary>
[TestClass]
public sealed class RecipeRequestDtoTests
{
  /// <summary>
  /// Verifies that a fully populated request maps every field onto the domain object,
  /// including trimming of text values enforced by the domain guard.
  /// </summary>
  [TestMethod]
  public void RecipeSuggestionRequestDto_FullyPopulated_MapsToRecipeSuggestion()
  {
    var purchasedIngredient = new RecipeIngredientRequestDto("Tomatoes", "500 g", "diced");
    var pantryStaple = new RecipeIngredientRequestDto("Salt", "1 tsp", null);
    var step = new RecipeStepRequestDto(1, "Mix all ingredients and cook.", null);

    var request = new RecipeSuggestionRequestDto(
      Name: " Tomato soup ",
      Description: "A simple tomato soup.",
      Servings: 2,
      PreparationMinutes: 10,
      CookingMinutes: 20,
      TotalMinutes: 30,
      Difficulty: RecipeDifficulty.Easy,
      PurchasedIngredients: [purchasedIngredient],
      AssumedPantryStaples: [pantryStaple],
      MissingOptionalIngredients: [],
      Steps: [step],
      AllergenWarnings: [AllergenCode.Milk]);

    RecipeSuggestion result = request.ToRecipeSuggestion();

    Assert.AreEqual("Tomato soup", result.Name);
    Assert.AreEqual("A simple tomato soup.", result.Description);
    Assert.AreEqual(2, result.Servings);
    Assert.AreEqual(10, result.PreparationMinutes);
    Assert.AreEqual(20, result.CookingMinutes);
    Assert.AreEqual(30, result.TotalMinutes);
    Assert.AreEqual(RecipeDifficulty.Easy, result.Difficulty);
    Assert.HasCount(1, result.PurchasedIngredients);
    Assert.AreEqual("Tomatoes", result.PurchasedIngredients[0].Name);
    Assert.AreEqual("500 g", result.PurchasedIngredients[0].Quantity);
    Assert.AreEqual("diced", result.PurchasedIngredients[0].Preparation);
    Assert.HasCount(1, result.AssumedPantryStaples);
    Assert.AreEqual("Salt", result.AssumedPantryStaples[0].Name);
    Assert.IsEmpty(result.MissingOptionalIngredients);
    Assert.HasCount(1, result.Steps);
    Assert.AreEqual(1, result.Steps[0].Sequence);
    Assert.AreEqual("Mix all ingredients and cook.", result.Steps[0].Instruction);
    Assert.HasCount(1, result.AllergenWarnings);
    Assert.AreEqual(AllergenCode.Milk, result.AllergenWarnings[0]);
  }

  /// <summary>
  /// Verifies that a request with an empty steps collection throws <see cref="ArgumentException"/>
  /// from the domain guard when <see cref="RecipeSuggestionRequestDto.ToRecipeSuggestion"/> is called.
  /// </summary>
  [TestMethod]
  public void RecipeSuggestionRequestDto_NoSteps_Throws()
  {
    var request = new RecipeSuggestionRequestDto(
      Name: "Tomato soup",
      Description: "A simple tomato soup.",
      Servings: 2,
      PreparationMinutes: 10,
      CookingMinutes: 20,
      TotalMinutes: 30,
      Difficulty: RecipeDifficulty.Easy,
      PurchasedIngredients: [],
      AssumedPantryStaples: [],
      MissingOptionalIngredients: [],
      Steps: [],
      AllergenWarnings: []);

    Assert.ThrowsExactly<ArgumentException>(() => request.ToRecipeSuggestion());
  }

  /// <summary>
  /// Verifies that null ingredient collections, allergen warnings, and optional ingredients
  /// are treated as empty collections rather than causing a null reference exception.
  /// Steps must still be supplied with at least one entry since the domain enforces that invariant.
  /// </summary>
  [TestMethod]
  public void RecipeSuggestionRequestDto_NullCollections_TreatedAsEmpty()
  {
    var step = new RecipeStepRequestDto(1, "Serve.", null);
    var request = new RecipeSuggestionRequestDto(
      Name: "Simple dish",
      Description: "A simple dish.",
      Servings: 1,
      PreparationMinutes: 5,
      CookingMinutes: 10,
      TotalMinutes: 15,
      Difficulty: RecipeDifficulty.Easy,
      PurchasedIngredients: null,
      AssumedPantryStaples: null,
      MissingOptionalIngredients: null,
      Steps: [step],
      AllergenWarnings: null);

    RecipeSuggestion result = request.ToRecipeSuggestion();

    Assert.IsEmpty(result.PurchasedIngredients);
    Assert.IsEmpty(result.AssumedPantryStaples);
    Assert.IsEmpty(result.MissingOptionalIngredients);
    Assert.IsEmpty(result.AllergenWarnings);
  }
}
