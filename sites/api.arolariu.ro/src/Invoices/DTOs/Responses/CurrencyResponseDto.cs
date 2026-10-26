namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Common.DDD.ValueObjects;

/// <summary>
/// Represents the public currency details associated with a payment.
/// </summary>
/// <param name="Name">The currency display name.</param>
/// <param name="Code">The stable currency code.</param>
/// <param name="Symbol">The currency display symbol.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct CurrencyResponseDto(
  [property: JsonPropertyName("name")] string Name,
  [property: JsonPropertyName("code")] string Code,
  [property: JsonPropertyName("symbol")] string Symbol)
{
  /// <summary>
  /// Projects a currency value object into its public transport representation.
  /// </summary>
  /// <param name="currency">The currency value object to project.</param>
  /// <returns>An immutable currency response.</returns>
  public static CurrencyResponseDto FromCurrency(Currency currency) =>
    new(currency.Name, currency.Code, currency.Symbol);
}
