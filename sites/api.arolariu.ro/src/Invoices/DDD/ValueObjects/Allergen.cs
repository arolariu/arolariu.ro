using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>
/// The allergen model.
/// </summary>
/// <param name="Name"></param>
[ExcludeFromCodeCoverage]
public record struct Allergen(string Name);
