namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Recipe model.
/// </summary>
[ExcludeFromCodeCoverage]
public sealed record Recipe
{
  /// <summary>
  /// The recipe name.
  /// </summary>
  public string Name { get; set; } = string.Empty;

  /// <summary>
  /// The recipe description.
  /// </summary>
  public string Description { get; set; } = string.Empty;

  /// <summary>
  /// The recipe estimated duration.
  /// </summary>
  public int ApproximateTotalDuration { get; set; } = -1;

  /// <summary>
  /// The recipe complexity.
  /// </summary>
  public RecipeComplexity Complexity { get; set; } = RecipeComplexity.UNKNOWN;

  /// <summary>
  /// The recipe ingredients.
  /// </summary>
  public ICollection<string> Ingredients { get; init; } = [];

  /// <summary>
  /// The recipe learn more address.
  /// </summary>
  public Uri ReferenceForMoreDetails { get; set; } = new Uri("https://arolariu.ro");

  /// <summary>
  /// Parameterized constructor.
  /// </summary>
  /// <param name="name"></param>
  /// <param name="description"></param>
  /// <param name="approximateTotalDuration"></param>
  /// <param name="complexity"></param>
  /// <param name="ingredients"></param>
  /// <param name="referenceForMoreDetails"></param>
  public Recipe(
    string name, string description, int approximateTotalDuration,
    RecipeComplexity complexity, ICollection<string> ingredients,
    Uri referenceForMoreDetails) : this()
  {
    Name = name;
    Description = description;
    ApproximateTotalDuration = approximateTotalDuration;
    Complexity = complexity;
    Ingredients = ingredients;
    ReferenceForMoreDetails = referenceForMoreDetails;
  }

  /// <summary>
  /// Parameterless constructor.
  /// </summary>
  public Recipe()
  {
    Name = string.Empty;
    Description = string.Empty;
    ApproximateTotalDuration = -1;
    Complexity = RecipeComplexity.UNKNOWN;
    Ingredients = [];
    ReferenceForMoreDetails = new Uri("https://arolariu.ro");
  }
}


/// <summary>
/// The recipe complexity enumeration.
/// </summary>
public enum RecipeComplexity
{
  /// <summary>
  /// The recipe complexity is unknown.
  /// </summary>
  UNKNOWN = 0,

  /// <summary>
  /// The recipe is easy to prepare.
  /// </summary>
  EASY = 1,

  /// <summary>
  /// The recipe is normal to prepare.
  /// </summary>
  NORMAL = 2,

  /// <summary>
  /// The recipe is hard to prepare.
  /// </summary>
  HARD = 3
}
