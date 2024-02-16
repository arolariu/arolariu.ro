using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>
/// Recipe model.
/// </summary>
/// <param name="Name"></param>
/// <param name="Duration"></param>
/// <param name="Complexity"></param>
/// <param name="RecipeIngredients"></param>
/// <param name="Observations"></param>
[ExcludeFromCodeCoverage]
public record struct Recipe(
    string Name,
    TimeOnly Duration,
    int Complexity,
    IEnumerable<Product> RecipeIngredients,
    IEnumerable<string> Observations)
{
    /// <summary>
    /// Parameterless constructor.
    /// </summary>
    public Recipe() : this(
        "Unknown Recipe",
        new TimeOnly(0, 0, 0),
        0,
        new List<Product>(),
        new List<string>())
    {
    }

    /// <summary>
    /// Basic constructor that initializes the object with a name.
    /// </summary>
    /// <param name="name"></param>
    public Recipe(string name) : this()
    {
        Name = name;
    }
}