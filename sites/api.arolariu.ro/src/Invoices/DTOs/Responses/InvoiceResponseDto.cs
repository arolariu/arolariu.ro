namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
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
/// <b>Content:</b> Includes complete invoice data: line items, scans (OCR sources),
/// AI-generated recipes, shared access list, payment details, and extensible metadata.
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
/// <param name="Category">
/// The invoice category classification. Defaults to <see cref="InvoiceCategory.NOT_DEFINED"/>
/// until AI analysis categorizes the invoice.
/// </param>
/// <param name="Scans">
/// Collection of invoice scan records (photos, PDFs). Each scan includes URI and metadata.
/// Empty if no scans have been uploaded.
/// </param>
/// <param name="PaymentInformation">
/// Payment details including currency code, total amount, tax breakdown, and payment method.
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
/// Collection of AI-inferred recipes based on invoice items. Populated after analysis.
/// Empty if analysis not performed or no recipes detected.
/// </param>
/// <param name="AdditionalMetadata">
/// Extensible key-value metadata dictionary for custom fields. Keys are case-sensitive strings;
/// values are serializable objects. Empty dictionary if no custom metadata.
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
  Guid Id,
  Guid UserIdentifier,
  IReadOnlyCollection<Guid> SharedWith,
  string Name,
  string Description,
  InvoiceCategory Category,
  IReadOnlyCollection<InvoiceScan> Scans,
  PaymentInformation PaymentInformation,
  Guid MerchantReference,
  IReadOnlyCollection<ProductResponseDto> Items,
  IReadOnlyCollection<Recipe> PossibleRecipes,
  IReadOnlyDictionary<string, object> AdditionalMetadata,
  bool IsImportant,
  bool IsSoftDeleted,
  DateTimeOffset CreatedAt,
  Guid CreatedBy,
  DateTimeOffset LastUpdatedAt,
  Guid LastUpdatedBy,
  int NumberOfUpdates)
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
  ///   <item><description>Collections use <c>ToList().AsReadOnly()</c> for immutability</description></item>
  ///   <item><description>Metadata dictionary is copied to prevent external mutation</description></item>
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
      Category: invoice.Category,
      Scans: invoice.Scans.ToList().AsReadOnly(),
      PaymentInformation: invoice.PaymentInformation,
      MerchantReference: invoice.MerchantReference,
      Items: invoice.Items.Select(ProductResponseDto.FromProduct).ToList().AsReadOnly(),
      PossibleRecipes: invoice.PossibleRecipes.ToList().AsReadOnly(),
      AdditionalMetadata: new Dictionary<string, object>(invoice.AdditionalMetadata),
      IsImportant: invoice.IsImportant,
      IsSoftDeleted: invoice.IsSoftDeleted,
      CreatedAt: invoice.CreatedAt,
      CreatedBy: invoice.CreatedBy,
      LastUpdatedAt: invoice.LastUpdatedAt,
      LastUpdatedBy: invoice.LastUpdatedBy,
      NumberOfUpdates: invoice.NumberOfUpdates);
  }
}
