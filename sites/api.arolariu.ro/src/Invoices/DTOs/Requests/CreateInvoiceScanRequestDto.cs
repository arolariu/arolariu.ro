namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// Data transfer object for creating a new invoice scan.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Adds a new scan record to an existing invoice.</para>
/// <para><b>Conversion:</b> Use <see cref="ToInvoiceScan"/> to convert to the domain <see cref="InvoiceScan"/> value object.</para>
/// <para><b>Supported Types:</b> See <see cref="ScanType"/> for supported image/document formats.</para>
/// </remarks>
/// <param name="Type">The scan format type (JPG, PNG, PDF, etc.).</param>
/// <param name="Location">The URI where the scan image/document is stored.</param>
/// <param name="Metadata">Optional metadata associated with this scan.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct CreateInvoiceScanRequestDto(
  [Required] ScanType Type,
  [Required] Uri Location,
  IDictionary<string, object>? Metadata)
{
  /// <summary>
  /// Converts this DTO to an <see cref="InvoiceScan"/> domain value object.
  /// </summary>
  /// <returns>A new <see cref="InvoiceScan"/> instance.</returns>
  public InvoiceScan ToInvoiceScan() => new(Type, Location, Metadata);
}
