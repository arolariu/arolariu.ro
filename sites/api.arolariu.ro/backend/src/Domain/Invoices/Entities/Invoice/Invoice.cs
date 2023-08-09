using System;
using System.Collections.Generic;

namespace arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

/// <summary>
/// The Invoice model as "represented" in the Application Domain.
/// </summary>
[Serializable]
public record class Invoice
{
    #region Invoice system-assigned fields
    /// <summary>
    /// The invoice id.
    /// </summary>
    public required Guid id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The invoice image URI.
    /// </summary>
    public required Uri ImageUri { get; set; } = null!;

    /// <summary>
    /// Invoice was analyzed by the system flag.
    /// </summary>
    public required bool IsAnalyzed { get; set; } = false;

    #region Invoice time information
    /// <summary>
    /// The invoice uploaded date (in the system).
    /// </summary>
    public required DateTimeOffset UploadedDate { get; set; } = DateTimeOffset.MinValue;

    /// <summary>
    /// The invoice identified date (from OCR service).
    /// </summary>
    public required DateTimeOffset IdentifiedDate { get; set; } = DateTimeOffset.MinValue;

    /// <summary>
    /// The invoice last modified date.
    /// </summary>
    public required DateTimeOffset LastModifiedDate { get; set; } = DateTimeOffset.MinValue;

    /// <summary>
    /// The invoice last analyzed date.
    /// </summary>
    public required DateTimeOffset LastAnalyzedDate { get; set; } = DateTimeOffset.MinValue;
    #endregion

    #region Invoice statistics information
    /// <summary>
    /// The invoice currency code - 3 letters - EUR, RON, SEK.
    /// </summary>
    public required string Currency { get; set; } = string.Empty;

    /// <summary>
    /// The invoice total amount (TOTAL = SUM(boughtItems) - SUM(discountedItems)).
    /// </summary>
    public required decimal TotalAmount { get; set; } = 0.0M;

    /// <summary>
    /// The invoice total tax.
    /// </summary>
    public required decimal TotalTax { get; set; } = 0.0M;
    #endregion
    #endregion

    #region Invoice user-assigned fields
    /// <summary>
    /// The invoice description, as suggested by the user.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Is the invoice important for the user?
    /// </summary>
    public bool IsImportant { get; set; } = false;
    #endregion

    #region Foreign Keys
    /// <summary>
    /// The invoice 1:1? user relationship.
    /// </summary>
    public Guid UserIdentifier { get; set; } = Guid.Empty;

    /// <summary>
    /// The invoice 1:1? merchant relationship.
    /// </summary>
    public InvoiceMerchant Merchant { get; set; } = null!;

    /// <summary>
    /// The invoice 1:*? - item relationship.
    /// </summary>
    public IEnumerable<InvoiceItem> Items { get; set; } = null!;
    #endregion

    /// <summary>
    /// The invoice additional metadata.
    /// This metadata is used to store additional information about the invoice.
    /// Metadata is used to generate the invoice statistics.
    /// </summary>
    public IEnumerable<KeyValuePair<string, string>> AdditionalMetadata { get; set; } = null!;
}