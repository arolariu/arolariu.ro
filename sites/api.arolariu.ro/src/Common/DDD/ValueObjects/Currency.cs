namespace arolariu.Backend.Common.DDD.ValueObjects;

/// <summary>
///	The currency value object.
///	This object adheres to the ISO 4217 standard.
/// </summary>
public readonly record struct Currency
  (string Name, string Code, string Symbol)
{

}
