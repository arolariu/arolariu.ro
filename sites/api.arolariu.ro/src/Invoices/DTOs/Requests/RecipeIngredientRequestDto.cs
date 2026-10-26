namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

/// <summary>Client-supplied recipe ingredient for a read-modify-write workflow.</summary>
/// <param name="Name">The ingredient display name.</param>
/// <param name="Quantity">The ingredient quantity, expressed as free text such as "500 g".</param>
/// <param name="Preparation">Optional preparation note such as "diced".</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct RecipeIngredientRequestDto(
  [property: JsonPropertyName("name")][Required] string Name,
  [property: JsonPropertyName("quantity")][Required] string Quantity,
  [property: JsonPropertyName("preparation")] string? Preparation)
{
  /// <summary>Converts this DTO into its domain value object.</summary>
  /// <returns>The mapped <see cref="RecipeIngredient"/>.</returns>
  public RecipeIngredient ToRecipeIngredient() => new(Name, Quantity, Preparation);
}
