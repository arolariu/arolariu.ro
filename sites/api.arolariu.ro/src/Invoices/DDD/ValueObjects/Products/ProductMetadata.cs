﻿namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Product metadata.
/// </summary>
[ExcludeFromCodeCoverage]
public record struct ProductMetadata
{
	/// <summary>
	/// Flag indicating if the item has been edited by the user.
	/// </summary>
	public bool IsEdited { get; set; }

	/// <summary>
	/// Flag indicating if the item is "complete".
	/// </summary>
	public bool IsComplete { get; set; }

	/// <summary>
	/// Flag indicating if the item has been soft deleted.
	/// </summary>
	public bool IsSoftDeleted { get; set; }
}
