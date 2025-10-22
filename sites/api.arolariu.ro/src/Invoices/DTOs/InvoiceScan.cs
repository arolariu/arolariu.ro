namespace arolariu.Backend.Domain.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// The scan type enum represents the type of scan.
/// </summary>
public enum ScanType
{
  /// <summary>
  /// JPG format.
  /// </summary>
  JPG,

  /// <summary>
  /// JPEG format.
  /// </summary>
  JPEG,

  /// <summary>
  /// PNG format.
  /// </summary>
  PNG,

  /// <summary>
  /// PDF format.
  /// </summary>
  PDF,

  /// <summary>
  /// Other format.
  /// </summary>
  OTHER,

  /// <summary>
  /// Unknown format.
  /// </summary>
  UNKNOWN,
}


/// <summary>
/// The InvoiceScan DTO class represents the invoice scan data transfer object.
/// This object is used to transfer the invoice scan data from the client to the server.
/// </summary>
/// <param name="Type"></param>
/// <param name="Location"></param>
/// <param name="Metadata"></param>
[Serializable]
[ExcludeFromCodeCoverage] // DTOs are not tested - they are used to transfer data between the client and the server.
public readonly record struct InvoiceScan(
  [Required] ScanType Type,
  [Required] Uri Location,
  IDictionary<string, object>? Metadata)
{
  /// <summary>
  /// Static method to create a new instance of the InvoiceScan with default values.
  /// </summary>
  /// <returns></returns>
  public static InvoiceScan Default() => new InvoiceScan
  {
    Type = ScanType.UNKNOWN,
    Location = new Uri("https://arolariu.ro"),
    Metadata = new Dictionary<string, object>(),
  };

  /// <summary>
  /// Static method to determine if the scan is not new (i.e. has been set to something else than the default values).
  /// </summary>
  /// <param name="scan"></param>
  /// <returns></returns>
  public static bool NotDefault(InvoiceScan scan) =>
    scan.Type != ScanType.UNKNOWN && scan.Location != new Uri("https://arolariu.ro");
}
