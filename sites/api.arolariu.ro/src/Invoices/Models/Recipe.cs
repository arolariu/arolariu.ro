using arolariu.Backend.Domain.Invoices.Entities.Products;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.Models;

/// <summary>
/// Recipe model.
/// </summary>
/// <param name="Name"></param>
/// <param name="Duration"></param>
/// <param name="Complexity"></param>
/// <param name="RecipeIngredients"></param>
/// <param name="Observations"></param>
[Serializable]
[ExcludeFromCodeCoverage]
public record struct Recipe(
    string Name,
    TimeOnly Duration,
    int Complexity,
    IEnumerable<Product> RecipeIngredients,
    IEnumerable<string> Observations);