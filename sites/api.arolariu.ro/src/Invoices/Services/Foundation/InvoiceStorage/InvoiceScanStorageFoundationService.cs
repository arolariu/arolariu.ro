namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.Modules;

using Azure;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Validates trusted Blob Storage properties for invoice scan persistence.
/// </summary>
/// <remarks>
/// <para>
/// <b>Security Boundary:</b> URI approval always occurs through
/// <see cref="InvoiceScanStorageLocationPolicy"/> before the blob broker is invoked. The broker receives only a
/// resolved container-relative path, preventing SSRF through arbitrary client URIs.
/// </para>
/// <para>
/// <b>Size Control:</b> SAS permissions cannot constrain an upload's final content length. The 10 MiB ceiling is
/// checked from server-observed Blob Storage properties and is the authoritative enforcement point.
/// </para>
/// </remarks>
public sealed class InvoiceScanStorageFoundationService(
  IInvoiceBlobStorageBroker invoiceBlobStorageBroker,
  IOptionsManager optionsManager,
  ILoggerFactory loggerFactory) : IInvoiceScanStorageFoundationService
{
  private const long MaximumScanLengthBytes = 10L * 1024L * 1024L;

  private readonly IInvoiceBlobStorageBroker invoiceBlobStorageBroker =
    invoiceBlobStorageBroker ?? throw new ArgumentNullException(nameof(invoiceBlobStorageBroker));
  private readonly IOptionsManager optionsManager =
    optionsManager ?? throw new ArgumentNullException(nameof(optionsManager));
  private readonly ILogger<IInvoiceScanStorageFoundationService> logger =
    (loggerFactory ?? throw new ArgumentNullException(nameof(loggerFactory)))
      .CreateLogger<IInvoiceScanStorageFoundationService>();

  /// <inheritdoc/>
  public async Task ValidateInvoiceScanAsync(InvoiceScan scan, CancellationToken cancellationToken) =>
    await TryCatchAsync(
      () => ValidateScanAsync(scan, optionsManager.GetApplicationOptions(), cancellationToken))
      .ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task ValidateInvoiceScansAsync(
    IEnumerable<InvoiceScan> scans,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      ArgumentNullException.ThrowIfNull(scans);

      using var activity = InvoicePackageTracing.StartActivity(nameof(ValidateInvoiceScansAsync));
      ApplicationOptions storageOptions = optionsManager.GetApplicationOptions();

      foreach (InvoiceScan scan in scans)
      {
        cancellationToken.ThrowIfCancellationRequested();
        await ValidateScanAsync(scan, storageOptions, cancellationToken).ConfigureAwait(false);
      }
    }).ConfigureAwait(false);

  private async Task ValidateScanAsync(
    InvoiceScan scan,
    ApplicationOptions storageOptions,
    CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ValidateInvoiceScanAsync));

    if (!InvoiceScanStorageLocationPolicy.TryResolveApprovedBlobPath(
      scan.Location,
      storageOptions,
      out string blobPath,
      out string validationMessage))
    {
      throw new InvoiceScanBlobValidationException(validationMessage);
    }

    InvoiceScanBlobProperties properties;

    try
    {
      properties = await invoiceBlobStorageBroker
        .GetPropertiesAsync(blobPath, cancellationToken)
        .ConfigureAwait(false);
    }
    catch (RequestFailedException exception) when (exception.Status == 404)
    {
      throw new InvoiceScanBlobValidationException(
        "The uploaded scan was not found in approved storage.",
        exception);
    }
    catch (Exception exception) when (exception is RequestFailedException or HttpRequestException or TimeoutException)
    {
      throw new InvoiceScanBlobDependencyException(
        "The uploaded scan could not be inspected in storage.",
        exception);
    }

    ValidateProperties(scan.Type, properties);
    activity?.SetTag("scan.content_length", properties.ContentLength);
  }

  private static void ValidateProperties(ScanType scanType, InvoiceScanBlobProperties properties)
  {
    if (properties.ContentLength is < 0 or > MaximumScanLengthBytes)
    {
      throw new InvoiceScanBlobValidationException(
        "The uploaded scan must not exceed 10 MiB.");
    }

    if (!properties.IsBlockBlob)
    {
      throw new InvoiceScanBlobValidationException(
        "The uploaded scan must be stored as a block blob.");
    }

    if (!HasExpectedContentType(scanType, properties.ContentType))
    {
      throw new InvoiceScanBlobValidationException(
        "The uploaded scan content type does not match the selected scan type.");
    }
  }

  private static bool HasExpectedContentType(ScanType scanType, string? contentType)
  {
    if (string.IsNullOrWhiteSpace(contentType))
    {
      return true;
    }

    string normalizedContentType = contentType
      .Split(';', 2, StringSplitOptions.TrimEntries)[0];

    if (string.Equals(normalizedContentType, "application/octet-stream", StringComparison.OrdinalIgnoreCase))
    {
      return true;
    }

    return scanType switch
    {
      ScanType.JPG or ScanType.JPEG
        => string.Equals(normalizedContentType, "image/jpeg", StringComparison.OrdinalIgnoreCase),
      ScanType.PNG
        => string.Equals(normalizedContentType, "image/png", StringComparison.OrdinalIgnoreCase),
      ScanType.PDF
        => string.Equals(normalizedContentType, "application/pdf", StringComparison.OrdinalIgnoreCase),
      ScanType.BMP
        => string.Equals(normalizedContentType, "image/bmp", StringComparison.OrdinalIgnoreCase),
      ScanType.TIFF
        => string.Equals(normalizedContentType, "image/tiff", StringComparison.OrdinalIgnoreCase),
      ScanType.HEIF
        => string.Equals(normalizedContentType, "image/heif", StringComparison.OrdinalIgnoreCase)
          || string.Equals(normalizedContentType, "image/heic", StringComparison.OrdinalIgnoreCase),
      _ => false,
    };
  }

  private async Task TryCatchAsync(Func<Task> callback)
  {
    try
    {
      await callback().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception exception) when (exception is IValidationException)
    {
      var outer = new InvoiceFoundationValidationException(exception);
      logger.LogInvoiceStorageValidationException(outer.Message);
      throw outer;
    }
    catch (Exception exception) when (exception is IDependencyException)
    {
      var outer = new InvoiceFoundationDependencyException(exception);
      logger.LogInvoiceStorageDependencyException(outer.Message);
      throw outer;
    }
    catch (Exception exception)
    {
      var outer = new InvoiceFoundationServiceException(exception);
      logger.LogInvoiceStorageServiceException(outer.Message);
      throw outer;
    }
  }
}
