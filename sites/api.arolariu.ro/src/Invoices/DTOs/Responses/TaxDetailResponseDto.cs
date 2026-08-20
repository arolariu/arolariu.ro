namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>
/// Represents one detailed tax line extracted from an invoice receipt.
/// </summary>
/// <param name="Amount">The tax amount for the line.</param>
/// <param name="Rate">The tax rate percentage for the line.</param>
/// <param name="NetAmount">The net amount before tax for the line.</param>
/// <param name="Description">The tax description supplied by the receipt.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct TaxDetailResponseDto(
  [property: JsonPropertyName("amount")] decimal Amount,
  [property: JsonPropertyName("rate")] decimal Rate,
  [property: JsonPropertyName("netAmount")] decimal NetAmount,
  [property: JsonPropertyName("description")] string Description)
{
  /// <summary>
  /// Projects a tax detail into its public transport representation.
  /// </summary>
  /// <param name="taxDetail">The tax detail to project.</param>
  /// <returns>An immutable tax-detail response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="taxDetail"/> is null.</exception>
  public static TaxDetailResponseDto FromTaxDetail(TaxDetail taxDetail)
  {
    ArgumentNullException.ThrowIfNull(taxDetail);
    return new(taxDetail.Amount, taxDetail.Rate, taxDetail.NetAmount, taxDetail.Description);
  }
}
