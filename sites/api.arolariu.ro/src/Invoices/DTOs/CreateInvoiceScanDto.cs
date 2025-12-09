namespace arolariu.Backend.Domain.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// The InvoiceScan DTO class represents the invoice scan data transfer object used when creating an invoice.
/// </summary>
/// <param name="Type"></param>
/// <param name="Location"></param>
/// <param name="Metadata"></param>
[Serializable]
[ExcludeFromCodeCoverage] // DTOs are not tested - they are used to transfer data between the client and the server.
public readonly record struct CreateInvoiceScanDto
(
  [Required] ScanType Type,
  [Required] Uri Location,
  IDictionary<string, object>? Metadata)
{
  /// <summary>
  /// Method used to convert the DTO to an InvoiceScan.
  /// </summary>
  /// <returns></returns>
  public InvoiceScan ToInvoiceScan() => new InvoiceScan(Type, Location, Metadata);
}
