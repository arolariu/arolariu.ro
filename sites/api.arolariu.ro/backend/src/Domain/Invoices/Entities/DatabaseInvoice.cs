using System;

namespace arolariu.Backend.Core.Domain.Invoices.Models;

/// <summary>
/// Record that gets retrieved from the database.
/// </summary>
public record DatabaseInvoice
{
    /// <summary>
    /// Id field
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Image field
    /// </summary>
    public required string ImageURI { get; init; }

    /// <summary>
    /// Merchant Name field
    /// </summary>
    public string MerchantName { get; init; } = string.Empty;

    /// <summary>
    /// Merchant Address field
    /// </summary>
    public string MerchantAddress { get; init; } = string.Empty;

    /// <summary>
    /// Merchant Phone Number field
    /// </summary>
    public string MerchantPhoneNumber { get; init; } = string.Empty;

    /// <summary>
    /// Invoice metadata bag
    /// </summary>
    public string MetadataBag { get; init; } = string.Empty;

    /// <summary>
    /// Invoice Identified Date field
    /// </summary>
    public DateTime InvoiceIdentifiedDate { get; init; } = DateTime.MinValue;

    /// <summary>
    /// Invoice Submitted Date field
    /// </summary>
    public DateTime InvoiceSubmittedDate { get; init; } = DateTime.MinValue;

    /// <summary>
    /// Invoice bought items as a JSON string
    /// </summary>
    public string BoughtItems { get; init; } = string.Empty;

    /// <summary>
    /// Invoice discounted items as a JSON string
    /// </summary>
    public string DiscountedItems { get; init; } = string.Empty;

    /// <summary>
    /// Invoice total cost field
    /// </summary>
    public double InvoiceTransactionTotal { get; init; } = 0.0;
}