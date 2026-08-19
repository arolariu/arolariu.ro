namespace arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;

using System.Threading;
using System.Threading.Tasks;

/// <summary>
/// Defines the Azure Blob Storage boundary for server-side invoice scan inspection.
/// </summary>
/// <remarks>
/// <para>
/// <b>Layer Role (The Standard):</b> This broker is a thin external-dependency wrapper. It reads native blob
/// properties from the backend-owned <c>invoices</c> container and performs no URI approval, file-size policy,
/// content validation, or exception classification.
/// </para>
/// <para>
/// Implementations use the service credential configured for the backend, not client SAS permissions. Foundation
/// services must approve the blob path before calling this contract.
/// </para>
/// </remarks>
public interface IInvoiceBlobStorageBroker
{
  /// <summary>
  /// Retrieves server-observed properties for one approved invoice scan blob.
  /// </summary>
  /// <param name="blobPath">The already-approved path relative to the <c>invoices</c> container.</param>
  /// <param name="cancellationToken">The token used to cancel the Azure SDK operation.</param>
  /// <returns>
  /// A task that resolves to the minimal property snapshot needed by the scan-validation foundation.
  /// </returns>
  Task<InvoiceScanBlobProperties> GetPropertiesAsync(
    string blobPath,
    CancellationToken cancellationToken);
}
