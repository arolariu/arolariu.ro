namespace arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;

using System;
using System.Threading;
using System.Threading.Tasks;

using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Blobs.Specialized;

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
public sealed class AzureStorageBlobBroker : IBlobStorageBroker
{
  private const string InvoiceContainerName = "invoices";
  private readonly BlobContainerClient invoiceContainer;

  /// <summary>
  /// Initializes a new instance of the <see cref="AzureStorageBlobBroker"/> class.
  /// </summary>
  /// <param name="blobServiceClient">The configured Azure Blob service client.</param>
  public AzureStorageBlobBroker(BlobServiceClient blobServiceClient)
  {
    ArgumentNullException.ThrowIfNull(blobServiceClient);
    invoiceContainer = blobServiceClient.GetBlobContainerClient(InvoiceContainerName);
  }

  /// <inheritdoc/>
  public async ValueTask<InvoiceScanBlobProperties> InspectInvoiceScanAsync(
    Uri scanLocation,
    CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(InspectInvoiceScanAsync));
    activity?.SetTag("storage.container", InvoiceContainerName);
    string blobName = ResolveInvoiceBlobName(invoiceContainer.Uri, scanLocation);

    Response<BlobProperties> response = await invoiceContainer
      .GetBlobClient(blobName)
      .GetPropertiesAsync(cancellationToken: cancellationToken)
      .ConfigureAwait(false);

    BlobProperties properties = response.Value;
    activity?.SetTag("storage.blob.length", properties.ContentLength);

    return new InvoiceScanBlobProperties(
      properties.ContentLength,
      properties.BlobType == BlobType.Block,
      properties.ContentType);
  }

  internal static string ResolveInvoiceBlobName(Uri containerUri, Uri scanLocation)
  {
    ArgumentNullException.ThrowIfNull(containerUri);
    ArgumentNullException.ThrowIfNull(scanLocation);

    var expected = new BlobUriBuilder(containerUri);
    var candidate = new BlobUriBuilder(scanLocation);

    if (!string.Equals(expected.AccountName, candidate.AccountName, StringComparison.OrdinalIgnoreCase)
        || !string.Equals(expected.BlobContainerName, candidate.BlobContainerName, StringComparison.Ordinal)
        || string.IsNullOrWhiteSpace(candidate.BlobName))
    {
      throw new ArgumentException(
        "The scan URI must identify a blob in the backend-owned invoices container.",
        nameof(scanLocation));
    }

    return candidate.BlobName;
  }
}
