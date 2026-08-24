namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// Represents the minimal client request required to persist a new invoice artifact.
/// </summary>
/// <remarks>
/// The initial write stores the owning partition, the primary receipt scan, and optional client metadata only.
/// Invoice details, products, merchant data, classifications, and other enrichment are added by later analysis or
/// explicit update requests.
/// </remarks>
/// <param name="UserIdentifier">
/// The legacy user partition identifier supplied by the client. The API does not trust this value;
/// endpoint mapping derives ownership from the authenticated principal.
/// </param>
/// <param name="InitialScan">The primary receipt scan already uploaded by the client.</param>
/// <param name="AdditionalMetadata">Optional client metadata to persist with the initial invoice artifact.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct CreateInvoiceRequestDto(
  [Required] Guid UserIdentifier,
  [Required] InvoiceScan InitialScan,
  IDictionary<string, object>? AdditionalMetadata)
{
  /// <summary>Maps the minimal request into a new invoice aggregate owned by the authenticated caller.</summary>
  /// <remarks>
  /// The body-supplied <see cref="UserIdentifier"/> is retained for transport compatibility but is
  /// deliberately ignored so a client cannot select another tenant's storage partition.
  /// </remarks>
  /// <param name="authenticatedUserIdentifier">The owner identifier derived from authenticated JWT claims.</param>
  /// <returns>A new invoice containing the authenticated owner, initial scan, and metadata.</returns>
  public Invoice ToInvoice(Guid authenticatedUserIdentifier)
  {
    var invoice = new Invoice
    {
      id = Guid.CreateVersion7(),
      UserIdentifier = authenticatedUserIdentifier,
      CreatedAt = DateTime.UtcNow,
      CreatedBy = authenticatedUserIdentifier,
      Scans = [InitialScan],
    };

    if (AdditionalMetadata is not null)
    {
      foreach ((string key, object value) in AdditionalMetadata)
      {
        invoice.AdditionalMetadata[key] = value?.ToString() ?? string.Empty;
      }
    }

    invoice.PerformUpdate(authenticatedUserIdentifier);
    return invoice;
  }
}
