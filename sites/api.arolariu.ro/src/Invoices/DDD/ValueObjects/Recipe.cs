using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.DDD.Contracts;

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
    IEnumerable<string> Observations);