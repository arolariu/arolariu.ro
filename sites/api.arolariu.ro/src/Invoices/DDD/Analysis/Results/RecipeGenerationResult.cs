namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

/// <summary>
/// Represents the immutable transient recipe suggestions generated for one invoice analysis request.
/// </summary>
public sealed record RecipeGenerationResult
{
  /// <summary>
  /// Initializes a new instance of the <see cref="RecipeGenerationResult"/> record.
  /// </summary>
  /// <param name="recipes">The generated recipe suggestions.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="recipes"/> is null.</exception>
  /// <exception cref="ArgumentException">Thrown when any recipe entry is null.</exception>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when more than three recipes are supplied.</exception>
  public RecipeGenerationResult(IReadOnlyList<RecipeSuggestion> recipes)
  {
    Recipes = AnalysisContractGuards.Snapshot(recipes, nameof(recipes));

    if (Recipes.Count > 3)
    {
      throw new ArgumentOutOfRangeException(nameof(recipes), Recipes.Count, "Recipe generation results must not contain more than three recipes.");
    }
  }

  /// <summary>Gets the generated recipe suggestions.</summary>
  public IReadOnlyList<RecipeSuggestion> Recipes { get; }
}
