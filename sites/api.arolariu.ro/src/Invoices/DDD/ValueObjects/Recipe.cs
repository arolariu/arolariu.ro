namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

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
	public TimeOnly Duration { get; set; } = new TimeOnly(0, 0, 0);

	/// <summary>
	/// The recipe complexity.
	/// </summary>
	public RecipeComplexity Complexity { get; set; } = RecipeComplexity.UNKNOWN;

	/// <summary>
	/// The recipe ingredients.
	/// </summary>
	public ICollection<Product> Ingredients { get; init; } = new List<Product>();

	/// <summary>
	/// The recipe learn more address.
	/// </summary>
	public Uri ReferenceForMoreDetails { get; set; } = new Uri("https://arolariu.ro");

	/// <summary>
	/// Parameterized constructor.
	/// </summary>
	/// <param name="name"></param>
	/// <param name="description"></param>
	/// <param name="duration"></param>
	/// <param name="complexity"></param>
	/// <param name="ingredients"></param>
	/// <param name="referenceForMoreDetails"></param>
	public Recipe(
		string name, string description, TimeOnly duration,
		RecipeComplexity complexity, ICollection<Product> ingredients,
		Uri referenceForMoreDetails) : this()
	{
		Name = name;
		Description = description;
		Duration = duration;
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
		Duration = new TimeOnly(0, 0, 0);
		Complexity = RecipeComplexity.UNKNOWN;
		Ingredients = new List<Product>();
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
