namespace arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;

using System;
using System.Threading;
using System.Threading.Tasks;

/// <summary>
/// Defines the Azure Blob Storage boundary for server-side invoice scan inspection.
/// </summary>
/// <remarks>
/// <para>
/// <b>Layer Role (The Standard):</b> This broker is a thin external-dependency wrapper. It reads native blob
/// properties from the backend-owned <c>invoices</c> container and performs no file-size policy,
/// content validation, or exception classification.
/// </para>
/// <para>
/// Implementations use the service credential configured for the backend, not client SAS permissions.
/// </para>
/// </remarks>
public interface IBlobStorageBroker
{
  /// <summary>
  /// Retrieves server-observed properties for one approved invoice scan blob.
  /// </summary>
  /// <param name="scanLocation">The URI of the already-uploaded invoice scan.</param>
  /// <param name="cancellationToken">The token used to cancel the Azure SDK operation.</param>
  /// <returns>
  /// A task that resolves to the minimal property snapshot needed by the scan-validation foundation.
  /// </returns>
  ValueTask<InvoiceScanBlobProperties> InspectInvoiceScanAsync(
    Uri scanLocation,
    CancellationToken cancellationToken);
}
