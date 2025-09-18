namespace arolariu.Backend.Domain.Invoices.DTOs;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// The InvoiceStatus DTO class represents the invoice status data transfer object.
/// </summary>
/// <param name="HitCount"></param>
/// <param name="OccupiedSpace"></param>
[Serializable]
[ExcludeFromCodeCoverage] // DTOs are not tested - they are used to transfer data between the client and the server.
public readonly record struct InvoiceStatusDto(
  [Required] int HitCount,
  [Required] double OccupiedSpace)
{
}
