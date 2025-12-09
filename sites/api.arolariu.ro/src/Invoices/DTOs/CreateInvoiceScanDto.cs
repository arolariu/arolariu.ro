namespace arolariu.Backend.Domain.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// The InvoiceScan DTO class represents the invoice scan data transfer object used when creating an invoice.
/// </summary>
/// <param name="Type">The type of scan (e.g., Receipt, Invoice, etc.).</param>
/// <param name="Location">The URI location where the scan is stored.</param>
/// <param name="Metadata">Optional metadata associated with the scan.</param>
[Serializable]
[ExcludeFromCodeCoverage] // DTOs are not tested - they are used to transfer data between the client and the server.
public readonly record struct CreateInvoiceScanDto
(
  [Required] ScanType Type,
  [Required] Uri Location,
  IDictionary<string, object>? Metadata)
{
  /// <summary>
  /// Converts the DTO to an <see cref="InvoiceScan"/> value object.
  /// </summary>
  /// <returns>A new <see cref="InvoiceScan"/> instance.</returns>
  public InvoiceScan ToInvoiceScan() => new(Type, Location, Metadata);
}
