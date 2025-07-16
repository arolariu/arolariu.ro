namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>
///	The currency value object.
/// </summary>
public sealed record Currency
{
	/// <summary>
	/// The currency name, e.g. Euro, Dollar, etc.
	/// </summary>
	public string Name { get; set; } = string.Empty;

	/// <summary>
	/// The currency code, in ISO 4217 format.
	/// </summary>
	public string Code { get; set; } = string.Empty;

	/// <summary>
	/// The currency symbol, e.g. $, €, £, etc.
	/// </summary>
	public string Symbol { get; set; } = string.Empty;
}
