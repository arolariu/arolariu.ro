namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using System;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// The allergen model.
/// </summary>
[ExcludeFromCodeCoverage]
public sealed record Allergen
{
	/// <summary>
	/// The allergen name.
	/// </summary>
	public string Name { get; set; } = string.Empty;

	/// <summary>
	/// The allergen description.
	/// </summary>
	public string Description { get; set; } = string.Empty;

	/// <summary>
	/// The allergen learn more address.
	/// </summary>
	public Uri LearnMoreAddress { get; set; } = new Uri("https://arolariu.ro");
}
