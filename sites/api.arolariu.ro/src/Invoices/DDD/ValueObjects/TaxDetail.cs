namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using System;

using Microsoft.EntityFrameworkCore;

/// <summary>
/// Represents a single tax line item extracted from a receipt via Document Intelligence.
/// </summary>
/// <remarks>
/// <para>Receipts may contain multiple tax lines (e.g., VAT, sales tax, service tax).
/// Each <c>TaxDetail</c> captures the amount, rate, net amount, and description for one tax entry.</para>
/// <para><b>Source:</b> Azure Document Intelligence v4.0 <c>prebuilt-receipt</c> model — <c>TaxDetails</c> array field.</para>
/// </remarks>
[Serializable]
[Owned]
public sealed record TaxDetail
{
  /// <summary>The tax amount for this line.</summary>
  public decimal Amount { get; set; } = 0.0m;

  /// <summary>The tax rate as a percentage (e.g., 19 for 19% VAT).</summary>
  public decimal Rate { get; set; } = 0.0m;

  /// <summary>The net amount before this tax was applied.</summary>
  public decimal NetAmount { get; set; } = 0.0m;

  /// <summary>Description of the tax type (e.g., "VAT", "Sales Tax", "Service Tax").</summary>
  public string Description { get; set; } = string.Empty;
}
