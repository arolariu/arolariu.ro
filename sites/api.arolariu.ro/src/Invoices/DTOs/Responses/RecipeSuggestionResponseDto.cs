namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

/// <summary>
/// Represents a structured recipe suggestion available for an invoice.
/// </summary>
/// <remarks>
/// This public projection includes only rendering data. It intentionally excludes the internal analysis-run
/// identifier while retaining structured ingredient groups, ordered steps, and allergen warnings.
/// </remarks>
/// <param name="Name">The recipe display name.</param>
/// <param name="Description">The recipe summary.</param>
/// <param name="Servings">The number of servings produced by the recipe.</param>
/// <param name="PreparationMinutes">The estimated preparation time in minutes.</param>
/// <param name="CookingMinutes">The estimated cooking time in minutes.</param>
/// <param name="TotalMinutes">The estimated total elapsed time in minutes.</param>
/// <param name="Difficulty">The recipe preparation difficulty.</param>
/// <param name="PurchasedIngredients">Ingredients fulfilled by purchased products.</param>
/// <param name="AssumedPantryStaples">Ingredients assumed to be pantry staples.</param>
/// <param name="MissingOptionalIngredients">Optional ingredients not present on the invoice.</param>
/// <param name="Steps">Ordered actionable recipe steps.</param>
/// <param name="AllergenWarnings">EU-14 allergen warnings relevant to the recipe.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct RecipeSuggestionResponseDto(
  [property: JsonPropertyName("name")] string Name,
  [property: JsonPropertyName("description")] string Description,
  [property: JsonPropertyName("servings")] int Servings,
  [property: JsonPropertyName("preparationMinutes")] int PreparationMinutes,
  [property: JsonPropertyName("cookingMinutes")] int CookingMinutes,
  [property: JsonPropertyName("totalMinutes")] int TotalMinutes,
  [property: JsonPropertyName("difficulty")] RecipeDifficulty Difficulty,
  [property: JsonPropertyName("purchasedIngredients")] IReadOnlyList<RecipeIngredientResponseDto> PurchasedIngredients,
  [property: JsonPropertyName("assumedPantryStaples")] IReadOnlyList<RecipeIngredientResponseDto> AssumedPantryStaples,
  [property: JsonPropertyName("missingOptionalIngredients")] IReadOnlyList<RecipeIngredientResponseDto> MissingOptionalIngredients,
  [property: JsonPropertyName("steps")] IReadOnlyList<RecipeStepResponseDto> Steps,
  [property: JsonPropertyName("allergenWarnings")] IReadOnlyList<AllergenCode> AllergenWarnings)
{
  /// <summary>
  /// Projects a recipe suggestion into its public transport representation.
  /// </summary>
  /// <param name="recipe">The recipe suggestion to project.</param>
  /// <returns>An immutable structured recipe response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="recipe"/> is null.</exception>
  public static RecipeSuggestionResponseDto FromRecipeSuggestion(RecipeSuggestion recipe)
  {
    ArgumentNullException.ThrowIfNull(recipe);
    return new(
      Name: recipe.Name,
      Description: recipe.Description,
      Servings: recipe.Servings,
      PreparationMinutes: recipe.PreparationMinutes,
      CookingMinutes: recipe.CookingMinutes,
      TotalMinutes: recipe.TotalMinutes,
      Difficulty: recipe.Difficulty,
      PurchasedIngredients: recipe.PurchasedIngredients
        .Select(RecipeIngredientResponseDto.FromRecipeIngredient)
        .ToList()
        .AsReadOnly(),
      AssumedPantryStaples: recipe.AssumedPantryStaples
        .Select(RecipeIngredientResponseDto.FromRecipeIngredient)
        .ToList()
        .AsReadOnly(),
      MissingOptionalIngredients: recipe.MissingOptionalIngredients
        .Select(RecipeIngredientResponseDto.FromRecipeIngredient)
        .ToList()
        .AsReadOnly(),
      Steps: recipe.Steps
        .Select(RecipeStepResponseDto.FromRecipeStep)
        .ToList()
        .AsReadOnly(),
      AllergenWarnings: recipe.AllergenWarnings.ToList().AsReadOnly());
  }
}
