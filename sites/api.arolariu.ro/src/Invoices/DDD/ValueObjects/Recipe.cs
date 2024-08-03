namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Recipe model.
/// </summary>
/// <param name="Name"></param>
/// <param name="Duration"></param>
/// <param name="Complexity"></param>
/// <param name="Ingredients"></param>
/// <param name="Observations"></param>
[ExcludeFromCodeCoverage]
public record Recipe(
	string Name,
	TimeOnly Duration,
	RecipeComplexity Complexity,
	IEnumerable<string> Ingredients,
	IEnumerable<string> Observations)
{
	/// <summary>
	/// Parameterless constructor.
	/// </summary>
	public Recipe() : this(
		"Unknown Recipe",
		new TimeOnly(0, 0, 0),
		RecipeComplexity.UNKNOWN,
		new List<string>(),
		new List<string>())
	{
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
