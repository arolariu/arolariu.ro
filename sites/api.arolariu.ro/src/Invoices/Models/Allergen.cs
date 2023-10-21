using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.Models;

/// <summary>
/// The allergen model.
/// </summary>
/// <param name="Name"></param>
[Serializable]
[ExcludeFromCodeCoverage]
public record struct Allergen(string Name);
