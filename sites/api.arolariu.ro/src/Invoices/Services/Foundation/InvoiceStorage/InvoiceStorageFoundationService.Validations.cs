namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Collections.Generic;

using arolariu.Backend.Common.Validators;
using arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

public partial class InvoiceStorageFoundationService
{
  private static void ValidateIdentifierIsSet(Guid? identifier)
  {
    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier is not null, "Identifier not set!");
    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier != Guid.Empty, "Identifier not set!");
    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(identifier, identifier => identifier != default, "Identifier not set!");
  }

  private static void ValidateInvoiceInformationIsValid(Invoice invoice)
  {
    Validator.ValidateAndThrow<Invoice, InvoiceNotFoundException>(
      invoice,
      static candidate => candidate is not null,
      "Invoice not found!");

    ValidateIdentifierIsSet(invoice.id);
    ValidateIdentifierIsSet(invoice.UserIdentifier);
    ValidateScansAreSet(invoice.Scans);
    ValidateProductsAreReadyForPersistence(invoice.Items);
  }

  private static void ValidateScansAreSet(IEnumerable<InvoiceScan>? scans)
  {
    Validator.ValidateAndThrow<IEnumerable<InvoiceScan>?, InvoicePhotoLocationNotCorrectException>(
      scans,
      static candidate => candidate is not null,
      "Invoice must contain at least one scan.");
  }

  private static void ValidateScanIsUsable(InvoiceScan scan)
  {
    if (!InvoiceScan.NotDefault(scan))
    {
      throw new InvoicePhotoLocationNotCorrectException(
        new ArgumentException("Invoice scan information is invalid.", nameof(scan)));
    }

    if (scan.Location is null || !scan.Location.IsAbsoluteUri)
    {
      throw new InvoicePhotoLocationNotCorrectException(
        new ArgumentException("Invoice scan location is invalid.", nameof(scan)));
    }
  }

  private static void ValidateScanProperties(ScanType scanType, InvoiceScanBlobProperties properties)
  {
    if (properties.ContentLength is < 0 or > (10L * 1024L * 1024L))
    {
      throw new InvoiceScanBlobValidationException("The uploaded scan must not exceed 10 MiB.");
    }

    if (!properties.IsBlockBlob)
    {
      throw new InvoiceScanBlobValidationException("The uploaded scan must be stored as a block blob.");
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

  private static void ValidateProductsAreReadyForPersistence(IEnumerable<Product>? products)
  {
    if (products is null)
    {
      return;
    }

    foreach (Product product in products)
    {
      ArgumentNullException.ThrowIfNull(product);

      if (product.RequiresCommercialValidation)
      {
        product.ValidateForPersistence();
      }
    }
  }
}
