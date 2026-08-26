namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

/// <summary>
/// Represents a structured recipe suggestion generated from analyzed invoice products.
/// </summary>
/// <remarks>
/// <para>Each ingredient collection is a non-null section. An empty collection means the capability succeeded but produced no items for that section.</para>
/// </remarks>
public sealed record RecipeSuggestion
{
  /// <summary>
  /// Initializes a new instance of the <see cref="RecipeSuggestion"/> record.
  /// </summary>
  /// <param name="name">The recipe display name.</param>
  /// <param name="description">The recipe summary or serving description.</param>
  /// <param name="servings">The number of servings the recipe yields.</param>
  /// <param name="preparationMinutes">The estimated preparation time in minutes.</param>
  /// <param name="cookingMinutes">The estimated cooking time in minutes.</param>
  /// <param name="totalMinutes">The total estimated elapsed time in minutes.</param>
  /// <param name="difficulty">The overall recipe difficulty.</param>
  /// <param name="purchasedIngredients">Ingredients satisfied by purchased products.</param>
  /// <param name="assumedPantryStaples">Ingredients assumed to be pantry staples.</param>
  /// <param name="missingOptionalIngredients">Ingredients that are optional and may be missing.</param>
  /// <param name="steps">The ordered recipe steps.</param>
  /// <param name="allergenWarnings">The allergen warnings relevant to the recipe.</param>
  /// <exception cref="ArgumentException">
  /// Thrown when required text values are missing or when the steps collection is empty.
  /// </exception>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when numeric values are invalid or when <paramref name="totalMinutes"/> is less than the sum of
  /// <paramref name="preparationMinutes"/> and <paramref name="cookingMinutes"/>.
  /// </exception>
  public RecipeSuggestion(
    string name,
    string description,
    int servings,
    int preparationMinutes,
    int cookingMinutes,
    int totalMinutes,
    RecipeDifficulty difficulty,
    IReadOnlyList<RecipeIngredient> purchasedIngredients,
    IReadOnlyList<RecipeIngredient> assumedPantryStaples,
    IReadOnlyList<RecipeIngredient> missingOptionalIngredients,
    IReadOnlyList<RecipeStep> steps,
    IReadOnlyList<AllergenCode> allergenWarnings)
  {
    if (!Enum.IsDefined(difficulty))
    {
      throw new ArgumentOutOfRangeException(nameof(difficulty), difficulty, "Recipe difficulty must be a defined difficulty.");
    }

    Name = AnalysisContractGuards.RequireText(name, nameof(name));
    Description = AnalysisContractGuards.RequireText(description, nameof(description));
    Servings = AnalysisContractGuards.RequirePositive(servings, nameof(servings));
    PreparationMinutes = AnalysisContractGuards.RequireNonNegative(preparationMinutes, nameof(preparationMinutes));
    CookingMinutes = AnalysisContractGuards.RequireNonNegative(cookingMinutes, nameof(cookingMinutes));
    TotalMinutes = AnalysisContractGuards.RequireNonNegative(totalMinutes, nameof(totalMinutes));
    Difficulty = difficulty;
    PurchasedIngredients = AnalysisContractGuards.Snapshot(purchasedIngredients, nameof(purchasedIngredients));
    AssumedPantryStaples = AnalysisContractGuards.Snapshot(assumedPantryStaples, nameof(assumedPantryStaples));
    MissingOptionalIngredients = AnalysisContractGuards.Snapshot(missingOptionalIngredients, nameof(missingOptionalIngredients));
    Steps = AnalysisContractGuards.Snapshot(steps, nameof(steps));
    AllergenWarnings = AnalysisContractGuards.Snapshot(allergenWarnings, nameof(allergenWarnings));

    if (Steps.Count == 0)
    {
      throw new ArgumentException("Recipe suggestions must contain at least one step.", nameof(steps));
    }

    if (TotalMinutes < PreparationMinutes + CookingMinutes)
    {
      throw new ArgumentOutOfRangeException(nameof(totalMinutes), totalMinutes, "Total minutes must be greater than or equal to preparation plus cooking minutes.");
    }
  }

  /// <summary>
  /// Gets the recipe display name.
  /// </summary>
  public string Name { get; }

  /// <summary>
  /// Gets the recipe summary or serving description.
  /// </summary>
  public string Description { get; }

  /// <summary>
  /// Gets the number of servings the recipe yields.
  /// </summary>
  public int Servings { get; }

  /// <summary>
  /// Gets the estimated preparation time in minutes.
  /// </summary>
  public int PreparationMinutes { get; }

  /// <summary>
  /// Gets the estimated cooking time in minutes.
  /// </summary>
  public int CookingMinutes { get; }

  /// <summary>
  /// Gets the total estimated elapsed time in minutes.
  /// </summary>
  public int TotalMinutes { get; }

  /// <summary>
  /// Gets the overall recipe difficulty.
  /// </summary>
  public RecipeDifficulty Difficulty { get; }

  /// <summary>
  /// Gets ingredients satisfied by purchased products.
  /// </summary>
  public IReadOnlyList<RecipeIngredient> PurchasedIngredients { get; }

  /// <summary>
  /// Gets ingredients assumed to be pantry staples.
  /// </summary>
  public IReadOnlyList<RecipeIngredient> AssumedPantryStaples { get; }

  /// <summary>
  /// Gets optional ingredients that may be missing.
  /// </summary>
  public IReadOnlyList<RecipeIngredient> MissingOptionalIngredients { get; }

  /// <summary>
  /// Gets the ordered recipe steps.
  /// </summary>
  public IReadOnlyList<RecipeStep> Steps { get; }

  /// <summary>
  /// Gets allergen warnings relevant to the recipe.
  /// </summary>
  public IReadOnlyList<AllergenCode> AllergenWarnings { get; }
}
