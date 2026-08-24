namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

/// <summary>Client-supplied recipe suggestion for a read-modify-write workflow.</summary>
/// <remarks>
/// <para>
/// The JSON shape of this DTO intentionally mirrors <c>RecipeSuggestionResponseDto</c> so that
/// a read-modify-write round trip is lossless: a client may deserialize a response, modify
/// fields, and send the same payload back without any mapping overhead.
/// </para>
/// <para>
/// Domain invariants — at least one step required; total minutes must be greater than or equal
/// to preparation plus cooking minutes — are enforced by <see cref="RecipeSuggestion"/> itself.
/// The DTO does not duplicate those guards.
/// </para>
/// </remarks>
/// <param name="Name">The recipe display name.</param>
/// <param name="Description">The recipe summary or serving description.</param>
/// <param name="Servings">The number of servings the recipe yields.</param>
/// <param name="PreparationMinutes">The estimated preparation time in minutes.</param>
/// <param name="CookingMinutes">The estimated cooking time in minutes.</param>
/// <param name="TotalMinutes">The total estimated elapsed time in minutes.</param>
/// <param name="Difficulty">The overall recipe difficulty.</param>
/// <param name="PurchasedIngredients">Ingredients fulfilled by purchased products.</param>
/// <param name="AssumedPantryStaples">Ingredients assumed to be pantry staples.</param>
/// <param name="MissingOptionalIngredients">Optional ingredients not present on the invoice.</param>
/// <param name="Steps">Ordered actionable recipe steps.</param>
/// <param name="AllergenWarnings">EU-14 allergen warnings relevant to the recipe.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct RecipeSuggestionRequestDto(
  [property: JsonPropertyName("name")][Required] string Name,
  [property: JsonPropertyName("description")][Required] string Description,
  [property: JsonPropertyName("servings")] int Servings,
  [property: JsonPropertyName("preparationMinutes")] int PreparationMinutes,
  [property: JsonPropertyName("cookingMinutes")] int CookingMinutes,
  [property: JsonPropertyName("totalMinutes")] int TotalMinutes,
  [property: JsonPropertyName("difficulty")] RecipeDifficulty Difficulty,
  [property: JsonPropertyName("purchasedIngredients")] IReadOnlyList<RecipeIngredientRequestDto>? PurchasedIngredients,
  [property: JsonPropertyName("assumedPantryStaples")] IReadOnlyList<RecipeIngredientRequestDto>? AssumedPantryStaples,
  [property: JsonPropertyName("missingOptionalIngredients")] IReadOnlyList<RecipeIngredientRequestDto>? MissingOptionalIngredients,
  [property: JsonPropertyName("steps")] IReadOnlyList<RecipeStepRequestDto>? Steps,
  [property: JsonPropertyName("allergenWarnings")] IReadOnlyList<AllergenCode>? AllergenWarnings)
{
  /// <summary>
  /// Converts this DTO into its domain value object, applying all domain invariants.
  /// </summary>
  /// <returns>The mapped <see cref="RecipeSuggestion"/>.</returns>
  /// <exception cref="ArgumentException">
  /// Thrown when required text values are missing, when the steps collection is empty,
  /// or when a collection item is null.
  /// </exception>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when numeric values are invalid or when <see cref="TotalMinutes"/> is less than
  /// the sum of <see cref="PreparationMinutes"/> and <see cref="CookingMinutes"/>.
  /// </exception>
  public RecipeSuggestion ToRecipeSuggestion() => new(
    Name,
    Description,
    Servings,
    PreparationMinutes,
    CookingMinutes,
    TotalMinutes,
    Difficulty,
    MapIngredients(PurchasedIngredients),
    MapIngredients(AssumedPantryStaples),
    MapIngredients(MissingOptionalIngredients),
    Steps?.Select(step => step.ToRecipeStep()).ToList() ?? [],
    AllergenWarnings?.ToList() ?? []);

  private static List<RecipeIngredient> MapIngredients(IReadOnlyList<RecipeIngredientRequestDto>? ingredients) =>
    ingredients?.Select(ingredient => ingredient.ToRecipeIngredient()).ToList() ?? [];
}
