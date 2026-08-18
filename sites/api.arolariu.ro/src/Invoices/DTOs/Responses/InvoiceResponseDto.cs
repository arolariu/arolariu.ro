namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Linq;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Response DTO representing a complete invoice returned from the REST API.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Provides a clean, stable API contract separate from the internal
/// <see cref="Invoice"/> domain model. This decoupling allows the domain to evolve
/// independently without breaking API consumers.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c>, ensuring:
/// <list type="bullet">
///   <item><description>Thread-safety without synchronization</description></item>
///   <item><description>Value semantics for equality comparisons</description></item>
///   <item><description>Efficient stack allocation for small instances</description></item>
/// </list>
/// </para>
/// <para>
/// <b>Serialization:</b> Marked <c>[Serializable]</c> for JSON serialization in API responses.
/// All collection properties use read-only interfaces to prevent mutation after creation.
/// </para>
/// <para>
/// <b>Usage Pattern:</b> Always use the <see cref="FromInvoice(Invoice)"/> factory method
/// to create instances from domain entities. Direct construction is supported but discouraged
/// outside of testing scenarios.
/// </para>
/// <para>
/// <b>Content:</b> Includes complete rendering data for line items, scan references, structured analysis output,
/// receipt extraction, payment details, audit fields, and safe extensible metadata. Internal prompts, raw OCR,
/// analysis runs, leases, and persistence-only values are deliberately excluded.
/// </para>
/// </remarks>
/// <param name="Id">
/// The unique invoice identifier (Version 7 GUID). Immutable after creation.
/// </param>
/// <param name="UserIdentifier">
/// The owner's user identifier. <see cref="Guid.Empty"/> indicates system-owned or unassigned.
/// </param>
/// <param name="SharedWith">
/// Collection of user identifiers granted read access. Empty collection if not shared.
/// </param>
/// <param name="Name">
/// The invoice display name (user-provided or auto-generated). Never null; may be empty string.
/// </param>
/// <param name="Description">
/// A detailed description of the invoice contents. Never null; may be empty string.
/// </param>
/// <param name="Classification">
/// The standardised ECOICOP classification assigned to this invoice. Null until a manual selection or an analysis
/// run categorizes the invoice.
/// </param>
/// <param name="Scans">
/// Collection of invoice scan references (photos, PDFs). Each scan includes only the format and authorized location;
/// raw scan metadata is not returned.
/// </param>
/// <param name="PaymentInformation">
/// Public payment details including currency, total amount, subtotal, tax, tip, and payment method.
/// </param>
/// <param name="MerchantReference">
/// Reference to an associated merchant entity. <see cref="Guid.Empty"/> if
/// no merchant is linked (pre-analysis state or manual invoice).
/// </param>
/// <param name="Items">
/// Collection of line items as <see cref="ProductResponseDto"/>. Empty for newly created
/// invoices before OCR analysis extracts products.
/// </param>
/// <param name="PossibleRecipes">
/// Collection of structured recipe suggestions based on invoice items. Empty if analysis did not generate recipes
/// or successfully generated an empty result.
/// </param>
/// <param name="AdditionalMetadata">
/// Extensible safe scalar metadata dictionary for custom fields. Values preserve nullability and are materialized as
/// strings; non-scalar values are excluded rather than exposing raw processing artifacts.
/// </param>
/// <param name="ReceiptType">
/// The receipt type extracted from the source document, or an empty string when it was not determined.
/// </param>
/// <param name="CountryRegion">
/// The country or region extracted from the source document, or an empty string when it was not determined.
/// </param>
/// <param name="TaxDetails">
/// Structured receipt tax lines. Empty when no granular tax details were extracted.
/// </param>
/// <param name="Payments">
/// Structured receipt payment records. Empty when no granular payment records were extracted.
/// </param>
/// <param name="IsImportant">
/// Flag indicating user-marked importance for filtering/sorting. Defaults to <c>false</c>.
/// </param>
/// <param name="IsSoftDeleted">
/// Flag indicating soft deletion status. Soft-deleted invoices may still be returned
/// in specific queries but are excluded from standard listings.
/// </param>
/// <param name="CreatedAt">
/// UTC timestamp when the invoice was first created. Immutable after creation.
/// </param>
/// <param name="CreatedBy">
/// The user identifier who created this invoice. <see cref="Guid.Empty"/> for system-created.
/// </param>
/// <param name="LastUpdatedAt">
/// UTC timestamp of the most recent modification. Updated on every change.
/// </param>
/// <param name="LastUpdatedBy">
/// The user identifier who last modified this invoice.
/// </param>
/// <param name="NumberOfUpdates">
/// Count of modifications performed on this invoice. Incremented on each update operation.
/// </param>
/// <example>
/// <code>
/// // Creating from domain entity (recommended)
/// Invoice domainInvoice = await invoiceService.ReadInvoiceAsync(invoiceId);
/// InvoiceResponseDto dto = InvoiceResponseDto.FromInvoice(domainInvoice);
///
/// // Returning from API endpoint
/// return TypedResults.Ok(dto);
/// </code>
/// </example>
/// <seealso cref="Invoice"/>
/// <seealso cref="ProductResponseDto"/>
/// <seealso cref="MerchantResponseDto"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct InvoiceResponseDto(
  [property: JsonPropertyName("id")] Guid Id,
  [property: JsonPropertyName("userIdentifier")] Guid UserIdentifier,
  [property: JsonPropertyName("sharedWith")] IReadOnlyCollection<Guid> SharedWith,
  [property: JsonPropertyName("name")] string Name,
  [property: JsonPropertyName("description")] string Description,
  [property: JsonPropertyName("classification")] StandardClassificationResponseDto? Classification,
  [property: JsonPropertyName("scans")] IReadOnlyCollection<InvoiceScanResponseDto> Scans,
  [property: JsonPropertyName("paymentInformation")] PaymentInformationResponseDto PaymentInformation,
  [property: JsonPropertyName("merchantReference")] Guid MerchantReference,
  [property: JsonPropertyName("items")] IReadOnlyCollection<ProductResponseDto> Items,
  [property: JsonPropertyName("possibleRecipes")] IReadOnlyCollection<RecipeSuggestionResponseDto> PossibleRecipes,
  [property: JsonPropertyName("additionalMetadata")] IReadOnlyDictionary<string, string?> AdditionalMetadata,
  [property: JsonPropertyName("receiptType")] string ReceiptType,
  [property: JsonPropertyName("countryRegion")] string CountryRegion,
  [property: JsonPropertyName("taxDetails")] IReadOnlyCollection<TaxDetailResponseDto> TaxDetails,
  [property: JsonPropertyName("payments")] IReadOnlyCollection<PaymentDetailResponseDto> Payments,
  [property: JsonPropertyName("isImportant")] bool IsImportant,
  [property: JsonPropertyName("isSoftDeleted")] bool IsSoftDeleted,
  [property: JsonPropertyName("createdAt")] DateTimeOffset CreatedAt,
  [property: JsonPropertyName("createdBy")] Guid CreatedBy,
  [property: JsonPropertyName("lastUpdatedAt")] DateTimeOffset LastUpdatedAt,
  [property: JsonPropertyName("lastUpdatedBy")] Guid LastUpdatedBy,
  [property: JsonPropertyName("numberOfUpdates")] int NumberOfUpdates)
{
  /// <summary>
  /// Creates an <see cref="InvoiceResponseDto"/> from a domain <see cref="Invoice"/> aggregate.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>Factory Pattern:</b> This is the preferred method for creating DTOs from domain entities.
  /// It ensures consistent mapping and proper conversion of nested collections.
  /// </para>
  /// <para>
  /// <b>Collection Handling:</b> All collections are converted to read-only snapshots:
  /// <list type="bullet">
  ///   <item><description>Items are mapped through <see cref="ProductResponseDto.FromProduct"/></description></item>
  ///   <item><description>Nested values are projected to dedicated response DTOs rather than leaking domain types</description></item>
  ///   <item><description>Collections use <c>ToList().AsReadOnly()</c> for immutability</description></item>
  ///   <item><description>Metadata is copied into a read-only safe-scalar dictionary</description></item>
  /// </list>
  /// </para>
  /// <para>
  /// <b>Performance:</b> Performs shallow copies of value types and creates new collection
  /// instances. For large invoices with many items, consider caching the result.
  /// </para>
  /// </remarks>
  /// <param name="invoice">
  /// The domain invoice aggregate to convert. Must not be null.
  /// All properties are read and mapped to the corresponding DTO properties.
  /// </param>
  /// <returns>
  /// A fully populated <see cref="InvoiceResponseDto"/> containing all invoice data
  /// suitable for API serialization and client consumption.
  /// </returns>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="invoice"/> is <c>null</c>.
  /// </exception>
  /// <example>
  /// <code>
  /// // Single invoice conversion
  /// Invoice invoice = await repository.GetByIdAsync(invoiceId);
  /// InvoiceResponseDto dto = InvoiceResponseDto.FromInvoice(invoice);
  ///
  /// // Batch conversion using LINQ
  /// IEnumerable&lt;InvoiceResponseDto&gt; dtos = invoices.Select(InvoiceResponseDto.FromInvoice);
  /// </code>
  /// </example>
  public static InvoiceResponseDto FromInvoice(Invoice invoice)
  {
    ArgumentNullException.ThrowIfNull(invoice);
    return new(
      Id: invoice.id,
      UserIdentifier: invoice.UserIdentifier,
      SharedWith: invoice.SharedWith.ToList().AsReadOnly(),
      Name: invoice.Name,
      Description: invoice.Description,
      Classification: StandardClassificationResponseDto.FromStandardClassification(invoice.Classification),
      Scans: invoice.Scans.Select(InvoiceScanResponseDto.FromInvoiceScan).ToList().AsReadOnly(),
      PaymentInformation: PaymentInformationResponseDto.FromPaymentInformation(invoice.PaymentInformation),
      MerchantReference: invoice.MerchantReference,
      Items: invoice.Items.Select(ProductResponseDto.FromProduct).ToList().AsReadOnly(),
      PossibleRecipes: invoice.PossibleRecipes.Select(RecipeSuggestionResponseDto.FromRecipeSuggestion).ToList().AsReadOnly(),
      AdditionalMetadata: CreatePublicMetadataSnapshot(invoice.AdditionalMetadata),
      ReceiptType: invoice.ReceiptType,
      CountryRegion: invoice.CountryRegion,
      TaxDetails: invoice.TaxDetails.Select(TaxDetailResponseDto.FromTaxDetail).ToList().AsReadOnly(),
      Payments: invoice.Payments.Select(PaymentDetailResponseDto.FromPaymentDetail).ToList().AsReadOnly(),
      IsImportant: invoice.IsImportant,
      IsSoftDeleted: invoice.IsSoftDeleted,
      CreatedAt: invoice.CreatedAt,
      CreatedBy: invoice.CreatedBy,
      LastUpdatedAt: invoice.LastUpdatedAt,
      LastUpdatedBy: invoice.LastUpdatedBy,
      NumberOfUpdates: invoice.NumberOfUpdates);
  }

  private static ReadOnlyDictionary<string, string?> CreatePublicMetadataSnapshot(
    IDictionary<string, object> additionalMetadata)
  {
    var snapshot = new Dictionary<string, string?>(additionalMetadata.Count, StringComparer.Ordinal);

    foreach ((string key, object value) in additionalMetadata)
    {
      if (!IsInternalMetadataKey(key) && TryCreatePublicMetadataValue(value, out string? publicValue))
      {
        snapshot.Add(key, publicValue);
      }
    }

    return new ReadOnlyDictionary<string, string?>(snapshot);
  }

  private static bool IsInternalMetadataKey(string key) =>
    key.Contains("raw", StringComparison.OrdinalIgnoreCase)
    || key.Contains("ocr", StringComparison.OrdinalIgnoreCase)
    || key.Contains("prompt", StringComparison.OrdinalIgnoreCase)
    || key.Contains("lease", StringComparison.OrdinalIgnoreCase)
    || key.Contains("analysis.run", StringComparison.OrdinalIgnoreCase)
    || key.Contains("analysisrun", StringComparison.OrdinalIgnoreCase)
    || key.Contains("sourceRunId", StringComparison.OrdinalIgnoreCase)
    || key.Contains("runId", StringComparison.OrdinalIgnoreCase)
    || key.Contains("secret", StringComparison.OrdinalIgnoreCase)
    || key.Contains("token", StringComparison.OrdinalIgnoreCase)
    || key.Contains("credential", StringComparison.OrdinalIgnoreCase)
    || key.Contains("connectionString", StringComparison.OrdinalIgnoreCase)
    || key.Contains("sas", StringComparison.OrdinalIgnoreCase);

  private static bool TryCreatePublicMetadataValue(object value, out string? publicValue)
  {
    switch (value)
    {
      case null:
        publicValue = null;
        return true;
      case string text:
        publicValue = text;
        return true;
      case bool boolean:
        publicValue = boolean.ToString(CultureInfo.InvariantCulture);
        return true;
      case byte number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case sbyte number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case short number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case ushort number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case int number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case uint number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case long number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case ulong number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case float number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case double number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case decimal number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case DateTime dateTime:
        publicValue = dateTime.ToString("O", CultureInfo.InvariantCulture);
        return true;
      case DateTimeOffset dateTimeOffset:
        publicValue = dateTimeOffset.ToString("O", CultureInfo.InvariantCulture);
        return true;
      case Guid identifier:
        publicValue = identifier.ToString("D");
        return true;
      default:
        publicValue = null;
        return false;
    }
  }
}
