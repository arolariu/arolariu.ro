namespace arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;

/// <summary>
/// Represents the server-observed properties of an uploaded invoice scan blob.
/// </summary>
/// <remarks>
/// This immutable contract deliberately contains only the fields required by invoice scan validation. It prevents
/// Azure SDK response objects and request URIs from leaking above the broker boundary.
/// </remarks>
/// <param name="ContentLength">The exact blob length in bytes observed from Azure Blob Storage.</param>
/// <param name="IsBlockBlob">Whether Azure reports the blob as a block blob.</param>
/// <param name="ContentType">The optional media type stored with the blob.</param>
public readonly record struct InvoiceScanBlobProperties(
  long ContentLength,
  bool IsBlockBlob,
  string? ContentType);
