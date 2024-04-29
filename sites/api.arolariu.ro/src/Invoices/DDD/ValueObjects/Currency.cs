namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// The currency model.
/// </summary>
/// <param name="Name"></param>
/// <param name="Symbol"></param>
[ExcludeFromCodeCoverage]
public record struct Currency(string Name, string Symbol);
