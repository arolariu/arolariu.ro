namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

/// <summary>
/// Represents one structured ingredient in a recipe suggestion.
/// </summary>
/// <param name="Name">The ingredient display name.</param>
/// <param name="Quantity">The ingredient quantity expression.</param>
/// <param name="Preparation">Optional ingredient preparation guidance.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct RecipeIngredientResponseDto(
  [property: JsonPropertyName("name")] string Name,
  [property: JsonPropertyName("quantity")] string Quantity,
  [property: JsonPropertyName("preparation")] string? Preparation)
{
  /// <summary>
  /// Projects a recipe ingredient into its public transport representation.
  /// </summary>
  /// <param name="ingredient">The recipe ingredient to project.</param>
  /// <returns>An immutable recipe-ingredient response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="ingredient"/> is null.</exception>
  public static RecipeIngredientResponseDto FromRecipeIngredient(RecipeIngredient ingredient)
  {
    ArgumentNullException.ThrowIfNull(ingredient);
    return new(ingredient.Name, ingredient.Quantity, ingredient.Preparation);
  }
}
