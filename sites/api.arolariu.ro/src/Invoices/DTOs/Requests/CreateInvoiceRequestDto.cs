namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;

/// <summary>
/// Request DTO for creating a new invoice in the system.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Captures client-editable invoice state at creation while explicitly excluding all server-owned
/// identity, ownership, sharing, audit, lifecycle, and analysis fields.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Ownership:</b> The transport never accepts a user identifier. The endpoint obtains the owner from the
/// authenticated <c>userIdentifier</c> claim and supplies it to <see cref="ToInvoice(Guid)"/>.
/// </para>
/// <para>
/// <b>Document Intelligence:</b> Each scan must be a supported input type. HEIC must be converted to HEIF before
/// submission because Azure Document Intelligence does not document HEIC as an accepted input.
/// </para>
/// </remarks>
/// <param name="Name">
/// The required user-facing invoice name. Whitespace-only values are rejected.
/// </param>
/// <param name="Description">Optional descriptive text supplied by the client.</param>
/// <param name="Classification">
/// Optional manual ECOICOP v2 classification selection. The storage foundation canonicalizes it before persistence.
/// </param>
/// <param name="PaymentInformation">
/// Optional client-supplied transaction date, payment type, currency, and monetary amounts. Null uses domain defaults
/// until document analysis or a later edit provides payment details.
/// </param>
/// <param name="MerchantReference">Optional existing merchant identifier to associate with the new invoice.</param>
/// <param name="IsImportant">Whether the authenticated owner marks the invoice as important.</param>
/// <param name="Scans">
/// Required collection of uploaded scans. Every scan must be supported by the Document Intelligence input pipeline.
/// </param>
/// <param name="Items">Optional client-created line items. Server-owned product analysis metadata is never accepted.</param>
/// <param name="Metadata">
/// Optional safe key-value metadata for client-specific annotations such as source application, import batch ID, or
/// custom tags.
/// </param>
/// <example>
/// <code>
/// var request = new CreateInvoiceRequestDto(
///     Name: "Groceries",
///     Description: "Weekly shop",
///     Classification: null,
///     PaymentInformation: null,
///     MerchantReference: null,
///     IsImportant: false,
///     Scans: [new CreateInvoiceScanRequestDto(ScanType.JPG, blobUri, null)],
///     Items: null,
///     Metadata: new Dictionary&lt;string, object&gt; { ["source"] = "mobile-app" });
///
/// var invoice = request.ToInvoice(serverOwnerIdentifier);
/// await invoiceService.CreateAsync(invoice);
/// </code>
/// </example>
/// <seealso cref="Invoice"/>
/// <seealso cref="InvoiceScan"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct CreateInvoiceRequestDto(
  [Required] string Name,
  string? Description,
  ClassificationSelectionDto? Classification,
  PaymentInformation? PaymentInformation,
  Guid? MerchantReference,
  bool IsImportant,
  [Required, MinLength(1)] IReadOnlyCollection<CreateInvoiceScanRequestDto> Scans,
  IReadOnlyCollection<CreateInvoiceItemRequestDto>? Items,
  IDictionary<string, object>? Metadata)
{
  /// <summary>
  /// Converts this DTO to a new <see cref="Invoice"/> domain aggregate.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>Server Ownership:</b> The supplied <paramref name="serverOwnerIdentifier"/> is the sole source for the
  /// aggregate owner, creator, updater, and partition context. No request-body field can override it.
  /// </para>
  /// <para>
  /// <b>Client Boundary:</b> Only approved client-editable fields are mapped. The generated identifier, sharing,
  /// soft-delete state, analysis outputs, receipt extraction, and audit lifecycle remain server-owned.
  /// </para>
  /// </remarks>
  /// <param name="serverOwnerIdentifier">The non-empty owner identifier resolved from the authenticated request claim.</param>
  /// <returns>
  /// A new <see cref="Invoice"/> instance initialized with the validated client fields and server-derived ownership.
  /// </returns>
  /// <exception cref="ArgumentException">Thrown when client-editable fields violate the creation contract.</exception>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="serverOwnerIdentifier"/> is empty.</exception>
  public Invoice ToInvoice(Guid serverOwnerIdentifier)
  {
    ValidateOrThrow(serverOwnerIdentifier);

    var scans = new List<InvoiceScan>(Scans.Count);
    foreach (CreateInvoiceScanRequestDto scan in Scans)
    {
      scans.Add(scan.ToInvoiceScan());
    }

    var items = new List<Product>(Items?.Count ?? 0);
    if (Items is not null)
    {
      foreach (CreateInvoiceItemRequestDto item in Items)
      {
        items.Add(item.ToProduct());
      }
    }

    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = serverOwnerIdentifier,
      Name = Name.Trim(),
      Description = Description ?? string.Empty,
      Classification = Classification?.ToManualSelection(),
      PaymentInformation = CopyPaymentInformation(PaymentInformation),
      MerchantReference = MerchantReference ?? Guid.Empty,
      IsImportant = IsImportant,
      CreatedAt = DateTimeOffset.UtcNow,
      CreatedBy = serverOwnerIdentifier,
      Scans = [.. scans],
      Items = items,
    };

    if (Metadata is not null)
    {
      foreach (var (key, value) in Metadata)
      {
        string valueAsString = value?.ToString() ?? string.Empty;
        invoice.AdditionalMetadata.Add(key, valueAsString);
      }
    }

    invoice.PerformUpdate(serverOwnerIdentifier);
    return invoice;
  }

  /// <summary>
  /// Validates the client-controlled part of the creation transport without consulting authentication state.
  /// </summary>
  /// <param name="validationErrors">
  /// Field-keyed validation failures. The collection is empty when this method returns <see langword="true"/>.
  /// </param>
  /// <returns><see langword="true"/> when the request can be mapped into an invoice; otherwise, <see langword="false"/>.</returns>
  public bool TryValidate(out Dictionary<string, string[]> validationErrors)
  {
    validationErrors = new Dictionary<string, string[]>(StringComparer.Ordinal);

    if (string.IsNullOrWhiteSpace(Name))
    {
      validationErrors[nameof(Name)] = ["Invoice name is required."];
    }

    if (Classification is { System: not ClassificationSystem.EcoicopV2 })
    {
      validationErrors[nameof(Classification)] = ["Invoice classification must use the ECOICOP v2 system."];
    }
    else if (Classification is { Code: var classificationCode } && string.IsNullOrWhiteSpace(classificationCode))
    {
      validationErrors[nameof(Classification)] = ["Invoice classification code is required when a classification is supplied."];
    }

    ValidatePaymentInformation(PaymentInformation, validationErrors);
    ValidateScans(validationErrors);
    ValidateItems(validationErrors);
    ValidateMetadata(validationErrors);

    return validationErrors.Count == 0;
  }

  private void ValidateOrThrow(Guid serverOwnerIdentifier)
  {
    if (serverOwnerIdentifier == Guid.Empty)
    {
      throw new ArgumentOutOfRangeException(
        nameof(serverOwnerIdentifier),
        serverOwnerIdentifier,
        "The server-derived invoice owner identifier must not be empty.");
    }

    if (!TryValidate(out Dictionary<string, string[]> validationErrors))
    {
      throw new ArgumentException(
        string.Join(" ", validationErrors.Values.SelectMany(static errors => errors)));
    }
  }

  private static PaymentInformation CopyPaymentInformation(PaymentInformation? paymentInformation) =>
    paymentInformation is null
      ? new PaymentInformation()
      : new PaymentInformation
      {
        TransactionDate = paymentInformation.TransactionDate,
        PaymentType = paymentInformation.PaymentType,
        Currency = paymentInformation.Currency,
        TotalCostAmount = paymentInformation.TotalCostAmount,
        TotalTaxAmount = paymentInformation.TotalTaxAmount,
        SubtotalAmount = paymentInformation.SubtotalAmount,
        TipAmount = paymentInformation.TipAmount,
      };

  private static void ValidatePaymentInformation(
    PaymentInformation? paymentInformation,
    Dictionary<string, string[]> validationErrors)
  {
    if (paymentInformation is null)
    {
      return;
    }

    if (!Enum.IsDefined(paymentInformation.PaymentType))
    {
      validationErrors[nameof(PaymentInformation)] = ["Payment type is not supported."];
    }

    if (string.IsNullOrWhiteSpace(paymentInformation.Currency.Name)
      || string.IsNullOrWhiteSpace(paymentInformation.Currency.Code)
      || string.IsNullOrWhiteSpace(paymentInformation.Currency.Symbol))
    {
      validationErrors[nameof(PaymentInformation)] = ["Payment currency name, code, and symbol are required."];
    }

    if (paymentInformation.TotalCostAmount < 0
      || paymentInformation.TotalTaxAmount < 0
      || paymentInformation.SubtotalAmount < 0
      || paymentInformation.TipAmount < 0)
    {
      validationErrors[nameof(PaymentInformation)] = ["Payment amounts must not be negative."];
    }
    else if (paymentInformation.TotalTaxAmount > paymentInformation.TotalCostAmount)
    {
      validationErrors[nameof(PaymentInformation)] = ["Total tax amount cannot exceed total cost amount."];
    }
  }

  private void ValidateScans(Dictionary<string, string[]> validationErrors)
  {
    if (Scans is null || Scans.Count == 0)
    {
      validationErrors[nameof(Scans)] = ["At least one supported invoice scan is required."];
      return;
    }

    int index = 0;
    foreach (CreateInvoiceScanRequestDto scan in Scans)
    {
      if (!scan.TryValidate(out Dictionary<string, string[]> scanValidationErrors))
      {
        foreach (var (field, errors) in scanValidationErrors)
        {
          validationErrors[$"{nameof(Scans)}[{index}].{field}"] = errors;
        }
      }

      index++;
    }
  }

  private void ValidateItems(Dictionary<string, string[]> validationErrors)
  {
    if (Items is null)
    {
      return;
    }

    int index = 0;
    foreach (CreateInvoiceItemRequestDto item in Items)
    {
      if (!item.TryValidate(out Dictionary<string, string[]> itemValidationErrors))
      {
        foreach (var (field, errors) in itemValidationErrors)
        {
          validationErrors[$"{nameof(Items)}[{index}].{field}"] = errors;
        }
      }

      index++;
    }
  }

  private void ValidateMetadata(Dictionary<string, string[]> validationErrors)
  {
    if (Metadata is null)
    {
      return;
    }

    foreach (string key in Metadata.Keys)
    {
      if (string.IsNullOrWhiteSpace(key))
      {
        validationErrors[nameof(Metadata)] = ["Metadata keys must not be null, empty, or whitespace."];
        return;
      }
    }
  }
}

/// <summary>
/// Request DTO for a client-created invoice line item.
/// </summary>
/// <remarks>
/// This transport intentionally carries only client-editable commercial data. Analysis outputs and operational
/// product metadata remain server-owned and are initialized by the domain model.
/// </remarks>
/// <param name="Name">The required item name.</param>
/// <param name="Classification">Optional manual GS1 GPC classification selection.</param>
/// <param name="Quantity">The non-negative purchased quantity.</param>
/// <param name="QuantityUnit">The optional unit of measure.</param>
/// <param name="ProductCode">The optional SKU, barcode, or merchant product code.</param>
/// <param name="Price">The non-negative unit price in the parent invoice currency.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct CreateInvoiceItemRequestDto(
  [Required] string Name,
  ClassificationSelectionDto? Classification,
  decimal Quantity,
  string? QuantityUnit,
  string? ProductCode,
  decimal Price)
{
  internal Product ToProduct() => new()
  {
    Name = Name.Trim(),
    Classification = Classification?.ToManualSelection(),
    Quantity = Quantity,
    QuantityUnit = QuantityUnit ?? string.Empty,
    ProductCode = ProductCode ?? string.Empty,
    Price = Price,
  };

  internal bool TryValidate(out Dictionary<string, string[]> validationErrors)
  {
    validationErrors = new Dictionary<string, string[]>(StringComparer.Ordinal);

    if (string.IsNullOrWhiteSpace(Name))
    {
      validationErrors[nameof(Name)] = ["Item name is required."];
    }

    if (Quantity < 0)
    {
      validationErrors[nameof(Quantity)] = ["Item quantity must not be negative."];
    }

    if (Price < 0)
    {
      validationErrors[nameof(Price)] = ["Item price must not be negative."];
    }

    if (Classification is { System: not ClassificationSystem.Gs1Gpc })
    {
      validationErrors[nameof(Classification)] = ["Item classification must use the GS1 GPC system."];
    }
    else if (Classification is { Code: var classificationCode } && string.IsNullOrWhiteSpace(classificationCode))
    {
      validationErrors[nameof(Classification)] = ["Item classification code is required when a classification is supplied."];
    }

    return validationErrors.Count == 0;
  }
}
