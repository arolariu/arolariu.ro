namespace arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;

using System;
using System.Threading;
using System.Threading.Tasks;

using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Reads invoice scan blob properties through the configured Azure Blob Storage client.
/// </summary>
/// <remarks>
/// <para>
/// <b>Layer Role (The Standard):</b> This broker only selects the backend-owned <c>invoices</c> container, invokes
/// <c>BlobClient.GetPropertiesAsync</c>, and maps the SDK response into a
/// minimal contract. It contains no storage-policy or business validation.
/// </para>
/// <para>
/// <b>Telemetry:</b> The activity contains only the fixed container name and observed byte length; blob paths and SAS
/// query strings are never tagged.
/// </para>
/// </remarks>
public sealed class AzureInvoiceBlobStorageBroker(BlobServiceClient blobServiceClient) : IInvoiceBlobStorageBroker
{
  private const string InvoiceContainerName = "invoices";
  private readonly BlobContainerClient invoiceContainer =
    (blobServiceClient ?? throw new ArgumentNullException(nameof(blobServiceClient)))
      .GetBlobContainerClient(InvoiceContainerName);

  /// <inheritdoc/>
  public async Task<InvoiceScanBlobProperties> GetPropertiesAsync(
    string blobPath,
    CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(GetPropertiesAsync));
    activity?.SetTag("storage.container", InvoiceContainerName);

    Response<BlobProperties> response = await invoiceContainer
      .GetBlobClient(blobPath)
      .GetPropertiesAsync(cancellationToken: cancellationToken)
      .ConfigureAwait(false);

    BlobProperties properties = response.Value;
    activity?.SetTag("storage.blob.length", properties.ContentLength);

    return new InvoiceScanBlobProperties(
      properties.ContentLength,
      properties.BlobType == BlobType.Block,
      properties.ContentType);
  }
}
