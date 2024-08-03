namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// The allergen model.
/// </summary>
/// <param name="Name"></param>
/// <param name="Description"></param>
[ExcludeFromCodeCoverage]
public record struct Allergen(string Name, string Description);
