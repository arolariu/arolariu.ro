using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.Models;

/// <summary>
/// The currency model.
/// </summary>
/// <param name="Name"></param>
/// <param name="Symbol"></param>
[Serializable]
[ExcludeFromCodeCoverage]
public record struct Currency(string Name, string Symbol);