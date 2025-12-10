namespace arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Common.DDD.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Represents the invoice aggregate root controlling line items, merchant linkage, payment details, scan data, AI enrichment artifacts (recipes, categorization)
/// and arbitrary extensible metadata within the bounded invoices context.
/// </summary>
/// <remarks>
/// <para>This aggregate encapsulates the canonical mutable state of an invoice. Identity (<c>id</c>) is immutable (Version 7 GUID) and is never reassigned.</para>
/// <para>Collections (<c>Items</c>, <c>PossibleRecipes</c>, <c>SharedWith</c>) preserve insertion order and allow duplicates. There is currently
/// no de-duplication or concurrency token; last writer wins on updates. Future optimization may introduce distinct filtering.</para>
/// <para><b>Soft Delete Lifecycle:</b> When soft-deleted at the storage layer, the invoice and each contained product are marked; queries exclude
/// soft-deleted entities unless explicitly overridden. See service layer deletion logic for cascade behavior.</para>
/// <para><b>Sentinel Defaults:</b> <c>Guid.Empty</c> for <c>UserIdentifier</c> and <c>MerchantReference</c>, <c>InvoiceCategory.NOT_DEFINED</c> for <c>Category</c>,
/// and <c>InvoiceScan.Default()</c> for <c>Scans</c> indicate an unenriched or unlinked state. These SHOULD be replaced by upstream enrichment / user input
/// flows prior to final analytical usage.</para>
/// <para><b>Merge Semantics:</b> See <see cref="Merge(Invoice, Invoice)"/> for partial update precedence rules.</para>
/// <para><b>Thread-safety:</b> Not thread-safe. Do not share instances across threads without external synchronization.</para>
/// </remarks>
[ExcludeFromCodeCoverage] // Entities are not tested - they are used to represent the data in the application domain.
public sealed class Invoice : NamedEntity<Guid>
{
  /// <inheritdoc/>
  [JsonPropertyName("id")]
  [JsonPropertyOrder(0)]
  public override required Guid id { get; init; } = Guid.CreateVersion7();

  /// <summary>
  /// The invoice 1:1 user relationship (owner).
  /// </summary>
  [JsonPropertyOrder(3)]
  public required Guid UserIdentifier { get; set; } = Guid.Empty;

  /// <summary>
  /// The list of users that have access to this invoice.
  /// </summary>
  [JsonPropertyOrder(4)]
  public ICollection<Guid> SharedWith { get; init; } = [];

  /// <summary>
  /// The invoice category.
  /// </summary>
  [JsonPropertyOrder(5)]
  public InvoiceCategory Category { get; set; } = InvoiceCategory.NOT_DEFINED;

  /// <summary>
  /// The invoice scan value object.
  /// </summary>
  [JsonPropertyOrder(6)]
  public ICollection<InvoiceScan> Scans { get; init; } = [];

  /// <summary>
  /// Payment information (currency, total amount, total tax).
  /// </summary>
  [JsonPropertyOrder(7)]
  public PaymentInformation PaymentInformation { get; set; } = new PaymentInformation();

  /// <summary>
  /// The invoice's possible merchant relationship.
  /// </summary>
  [JsonPropertyOrder(8)]
  public Guid MerchantReference { get; set; } = Guid.Empty;

  /// <summary>
  /// The invoice 1:*? - item relationship.
  /// </summary>
  [JsonPropertyOrder(9)]
  [SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Set is only exposed for tests.")]
  public ICollection<Product> Items { get; set; } = [];

  /// <summary>
  /// Possible recipes for the invoice.
  /// </summary>
  [JsonPropertyOrder(10)]
  [SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Set is only exposed for tests.")]
  public ICollection<Recipe> PossibleRecipes { get; set; } = [];

  /// <summary>
  /// The invoice additional metadata.
  /// This metadata is used to store additional information about the invoice.
  /// Metadata is used to generate the invoice statistics.
  /// </summary>
  [JsonPropertyOrder(11)]
  [SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Set is only exposed for tests.")]
  public IDictionary<string, object> AdditionalMetadata { get; set; } = new Dictionary<string, object>();

  /// <summary>
  /// Factory producing a new invoice aggregate initialized with sentinel defaults.
  /// </summary>
  /// <remarks>
  /// <para>Assigned identity is a Version 7 GUID for chronological ordering. All relationship references and enrichment
  /// fields are initialized to sentinel states (see aggregate remarks). This method does not persist the entity.</para>
  /// <para>Use this factory when constructing a brand new invoice prior to population via OCR / AI enrichment
  /// or user-submitted metadata.</para>
  /// </remarks>
  /// <returns>A new <see cref="Invoice"/> instance with immutable identity and sentinel defaults.</returns>
  internal static Invoice Default() => new Invoice
  {
    id = Guid.NewGuid(),
    UserIdentifier = Guid.Empty,
  };

  /// <summary>
  /// Internal method to determine whether an invoice instance is non-default (i.e., has at least one field set to a non-sentinel value).
  /// </summary>
  /// <param name="invoice"></param>
  /// <returns></returns>
  internal static bool NotDefault(Invoice invoice)
  {
    bool idAndUserAreSet = invoice.id != Guid.Empty && invoice.UserIdentifier != Guid.Empty;
    return idAndUserAreSet;
  }

  /// <summary>
  /// Produces a new invoice aggregate representing a non-destructive merge of an original invoice and a set of partial updates.
  /// </summary>
  /// <remarks>
  /// <para><b>Identity:</b> The original <c>id</c> is preserved.</para>
  /// <para><b>Precedence Rules:</b> A field in <paramref name="partialUpdates"/> replaces the original when it is non-sentinel / non-empty;
  /// otherwise the original value is retained. Collections are <em>concatenated</em> (original first unless otherwise stated) without de-duplication.
  /// <c>NumberOfUpdates</c> is incremented. <c>LastUpdatedAt</c> is set to <see cref="DateTime.UtcNow"/>.</para>
  /// <list type="table">
  /// <listheader>
  /// <term>Field</term><term>Partial Considered Non-Default When</term><term>Merge Behavior</term><term>Notes</term>
  /// </listheader>
  /// <item><term>UserIdentifier</term><term>!= Guid.Empty</term><term>Replace</term><term>Owner transfer possible; no authorization guard here.</term></item>
  /// <item><term>Category</term><term>!= InvoiceCategory.NOT_DEFINED</term><term>Replace</term><term>Category enrichment applied late.</term></item>
  /// <item><term>Name</term><term>!IsNullOrWhiteSpace</term><term>Replace</term><term>Whitespace-only ignored.</term></item>
  /// <item><term>Description</term><term>!IsNullOrWhiteSpace</term><term>Replace</term><term>Trimming not currently applied.</term></item>
  /// <item><term>IsImportant</term><term>Value differs</term><term>Replace</term><term>Boolean toggle recognized.</term></item>
  /// <item><term>Scans</term><term><see cref="InvoiceScan.NotDefault(InvoiceScan)"/> true</term><term>Replace</term><term>Scans treated as value object snapshot.</term></item>
  /// <item><term>PaymentInformation</term><term>Not null</term><term>Replace</term><term>Whole object replacement; no deep merge.</term></item>
  /// <item><term>MerchantReference</term><term>!= Guid.Empty</term><term>Replace</term><term>Caller responsible for referential validity.</term></item>
  /// <item><term>Items</term><term>Count > 0</term><term>Concatenate (original + partial)</term><term>No de-duplication; may introduce duplicates.</term></item>
  /// <item><term>PossibleRecipes</term><term>Count > 0</term><term>Concatenate (original + partial)</term><term>Recipes appended; duplicates possible.</term></item>
  /// <item><term>SharedWith</term><term>Count > 0</term><term>Concatenate (partial + original)</term><term>Order chosen to prioritize newly added principals.</term></item>
  /// <item><term>AdditionalMetadata</term><term>Count > 0</term><term>Key-wise overwrite</term><term>Last writer wins per key.</term></item>
  /// </list>
  /// <para><b>Side Effects:</b> Original instances are left unmodified (pure functional merge). Returned instance has updated
  /// audit counters (<c>NumberOfUpdates</c>, <c>LastUpdatedAt</c>).</para>
  /// <para><b>Thread-safety:</b> Not thread-safe; callers must ensure exclusive access to original references during merge decision workflow.</para>
  /// </remarks>
  /// <param name="original">The persisted (authoritative) invoice snapshot.</param>
  /// <param name="partialUpdates">A partially populated invoice carrying candidate replacement values.</param>
  /// <returns>A new <see cref="Invoice"/> representing the merged state.</returns>
  internal static Invoice Merge(Invoice original, Invoice partialUpdates)
  {
    var newInvoice = new Invoice
    {
      id = original.id, // The identifier remains the same.
      UserIdentifier = partialUpdates.UserIdentifier != Guid.Empty ? partialUpdates.UserIdentifier : original.UserIdentifier,
      Category = partialUpdates.Category != InvoiceCategory.NOT_DEFINED ? partialUpdates.Category : original.Category,
      Name = !string.IsNullOrWhiteSpace(partialUpdates.Name) ? partialUpdates.Name : original.Name,
      Description = !string.IsNullOrWhiteSpace(partialUpdates.Description) ? partialUpdates.Description : original.Description,
      IsImportant = partialUpdates.IsImportant != original.IsImportant ? partialUpdates.IsImportant : original.IsImportant,
      LastUpdatedAt = DateTime.UtcNow,
      Scans = partialUpdates.Scans.Count > 0 ? [.. partialUpdates.Scans, .. original.Scans] : original.Scans,
      PaymentInformation = partialUpdates.PaymentInformation ?? original.PaymentInformation,
      MerchantReference = partialUpdates.MerchantReference != Guid.Empty ? partialUpdates.MerchantReference : original.MerchantReference,
      PossibleRecipes = partialUpdates.PossibleRecipes.Count > 0 ? [.. partialUpdates.PossibleRecipes, .. original.PossibleRecipes] : original.PossibleRecipes,
      SharedWith = partialUpdates.SharedWith.Count > 0 ? [.. partialUpdates.SharedWith, .. original.SharedWith] : original.SharedWith,
      NumberOfUpdates = original.NumberOfUpdates + 1,
    };

    if (partialUpdates.AdditionalMetadata is not null && partialUpdates.AdditionalMetadata.Count > 0)
    {
      newInvoice.AdditionalMetadata = new Dictionary<string, object>(original.AdditionalMetadata);
      foreach (var (key, value) in partialUpdates.AdditionalMetadata)
      {
        newInvoice.AdditionalMetadata[key] = value;
      }
    }

    if (partialUpdates.Items is not null && partialUpdates.Items.Count > 0)
    {
      newInvoice.Items = [.. original.Items, .. partialUpdates.Items];
    }

    if (partialUpdates.PossibleRecipes is not null && partialUpdates.PossibleRecipes.Count > 0)
    {
      newInvoice.PossibleRecipes = [.. original.PossibleRecipes, .. partialUpdates.PossibleRecipes];
    }

    return newInvoice;
  }
}
