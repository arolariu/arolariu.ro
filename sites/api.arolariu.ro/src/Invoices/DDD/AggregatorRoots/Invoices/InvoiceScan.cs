namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

/// <summary>
/// The scan type enum represents the type of scan.
/// </summary>
public enum ScanType
{
  /// <summary>
  /// JPEG image using the JPG file extension. Stable transport value: <c>0</c>.
  /// </summary>
  JPG = 0,

  /// <summary>
  /// JPEG image. Stable transport value: <c>1</c>.
  /// </summary>
  JPEG = 1,

  /// <summary>
  /// PNG image. Stable transport value: <c>2</c>.
  /// </summary>
  PNG = 2,

  /// <summary>
  /// PDF document. Stable transport value: <c>3</c>.
  /// </summary>
  PDF = 3,

  /// <summary>
  /// Unclassified format. Stable transport value: <c>4</c>.
  /// This is not a supported Document Intelligence input type.
  /// </summary>
  OTHER = 4,

  /// <summary>
  /// Unknown format. Stable transport value: <c>5</c>.
  /// This is not a supported Document Intelligence input type.
  /// </summary>
  UNKNOWN = 5,

  /// <summary>
  /// BMP image. Stable transport value: <c>6</c>.
  /// </summary>
  BMP = 6,

  /// <summary>
  /// TIFF image. Stable transport value: <c>7</c>.
  /// </summary>
  TIFF = 7,

  /// <summary>
  /// HEIF image. Stable transport value: <c>8</c>.
  /// </summary>
  HEIF = 8,
}


/// <summary>
/// The InvoiceScan DTO class represents the invoice scan data transfer object.
/// This object is used to transfer the invoice scan data from the client to the server.
/// </summary>
/// <param name="Type"></param>
/// <param name="Location"></param>
/// <param name="Metadata"></param>
[Serializable]
public readonly record struct InvoiceScan(
  [Required] ScanType Type,
  [Required] Uri Location,
  IDictionary<string, object>? Metadata)
{
  /// <summary>
  /// Gets or sets the approved blob path relative to the invoices container.
  /// </summary>
  /// <remarks>
  /// This transient property is populated at transport-mapping time for newly supplied scans so the invoice storage
  /// foundation can validate server-observed blob properties without resolving configuration. It is not serialized or
  /// persisted because existing stored scans have already crossed that trust boundary.
  /// </remarks>
  [JsonIgnore]
  internal string? ApprovedBlobPath { get; init; }

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

  /// <summary>
  /// Determines whether a scan type is accepted by the Azure Document Intelligence URI analysis pipeline.
  /// </summary>
  /// <remarks>
  /// The prebuilt receipt pipeline accepts JPEG/JPG, PNG, BMP, TIFF, HEIF, and PDF inputs. HEIC is deliberately
  /// absent because it is not an Azure Document Intelligence documented input format and must be converted before
  /// it reaches an invoice creation boundary.
  /// </remarks>
  /// <param name="scanType">The client-supplied scan type to assess.</param>
  /// <returns><see langword="true"/> for a supported Document Intelligence input type; otherwise, <see langword="false"/>.</returns>
  internal static bool IsSupportedByDocumentIntelligence(ScanType scanType) =>
    scanType is ScanType.JPG
      or ScanType.JPEG
      or ScanType.PNG
      or ScanType.PDF
      or ScanType.BMP
      or ScanType.TIFF
      or ScanType.HEIF;
}
