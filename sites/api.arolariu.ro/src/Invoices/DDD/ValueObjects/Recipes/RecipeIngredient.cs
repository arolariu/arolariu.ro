namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Represents a structured ingredient entry inside a recipe suggestion.
/// </summary>
public sealed record RecipeIngredient
{
  /// <summary>
  /// Initializes a new instance of the <see cref="RecipeIngredient"/> record.
  /// </summary>
  /// <param name="name">The ingredient display name.</param>
  /// <param name="quantity">The quantity or amount expression for the ingredient.</param>
  /// <param name="preparation">Optional preparation guidance for the ingredient.</param>
  /// <exception cref="ArgumentException">Thrown when <paramref name="name"/> or <paramref name="quantity"/> is null, empty, or whitespace.</exception>
  public RecipeIngredient(string name, string quantity, string? preparation)
  {
    Name = AnalysisContractGuards.RequireText(name, nameof(name));
    Quantity = AnalysisContractGuards.RequireText(quantity, nameof(quantity));
    Preparation = AnalysisContractGuards.NormalizeOptionalText(preparation);
  }

  /// <summary>
  /// Gets the ingredient display name.
  /// </summary>
  public string Name { get; }

  /// <summary>
  /// Gets the quantity or amount expression for the ingredient.
  /// </summary>
  public string Quantity { get; }

  /// <summary>
  /// Gets optional preparation guidance for the ingredient.
  /// </summary>
  public string? Preparation { get; }
}
