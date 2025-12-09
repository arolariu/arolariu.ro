namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Response DTO representing a full invoice with all details returned from the API.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Provides complete invoice data for single-item retrieval endpoints.</para>
/// <para><b>Conversion:</b> Use <see cref="FromInvoice(Invoice)"/> to create from a domain <see cref="Invoice"/>.</para>
/// <para><b>Includes:</b> Full item list, scans, recipes, shared users, and metadata.</para>
/// </remarks>
/// <param name="Id">The unique invoice identifier.</param>
/// <param name="UserIdentifier">The owner's user identifier.</param>
/// <param name="SharedWith">Collection of user identifiers with shared access.</param>
/// <param name="Name">The invoice display name.</param>
/// <param name="Description">A detailed description of the invoice.</param>
/// <param name="Category">The invoice category classification.</param>
/// <param name="Scans">Collection of invoice scan records.</param>
/// <param name="PaymentInformation">Payment details including currency, total amount, and tax.</param>
/// <param name="MerchantReference">Reference to an associated merchant.</param>
/// <param name="Items">Collection of products/items in this invoice.</param>
/// <param name="PossibleRecipes">Collection of inferred recipes from items.</param>
/// <param name="AdditionalMetadata">Extensible key-value metadata.</param>
/// <param name="IsImportant">Flag indicating importance.</param>
/// <param name="CreatedAt">Creation timestamp.</param>
/// <param name="LastUpdatedAt">Last update timestamp.</param>
/// <param name="NumberOfUpdates">Count of updates performed.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct InvoiceDetailDto(
  Guid Id,
  Guid UserIdentifier,
  IReadOnlyCollection<Guid> SharedWith,
  string Name,
  string Description,
  InvoiceCategory Category,
  IReadOnlyCollection<InvoiceScan> Scans,
  PaymentInformation PaymentInformation,
  Guid MerchantReference,
  IReadOnlyCollection<ProductDto> Items,
  IReadOnlyCollection<Recipe> PossibleRecipes,
  IReadOnlyDictionary<string, object> AdditionalMetadata,
  bool IsImportant,
  DateTimeOffset CreatedAt,
  DateTimeOffset LastUpdatedAt,
  int NumberOfUpdates)
{
  /// <summary>
  /// Creates an <see cref="InvoiceDetailDto"/> from a domain <see cref="Invoice"/>.
  /// </summary>
  /// <param name="invoice">The domain invoice to convert.</param>
  /// <returns>A detailed DTO representing the full invoice.</returns>
  public static InvoiceDetailDto FromInvoice(Invoice invoice) => new(
    Id: invoice.id,
    UserIdentifier: invoice.UserIdentifier,
    SharedWith: invoice.SharedWith.ToList().AsReadOnly(),
    Name: invoice.Name,
    Description: invoice.Description,
    Category: invoice.Category,
    Scans: invoice.Scans.ToList().AsReadOnly(),
    PaymentInformation: invoice.PaymentInformation,
    MerchantReference: invoice.MerchantReference,
    Items: invoice.Items.Select(ProductDto.FromProduct).ToList().AsReadOnly(),
    PossibleRecipes: invoice.PossibleRecipes.ToList().AsReadOnly(),
    AdditionalMetadata: new Dictionary<string, object>(invoice.AdditionalMetadata),
    IsImportant: invoice.IsImportant,
    CreatedAt: invoice.CreatedAt,
    LastUpdatedAt: invoice.LastUpdatedAt,
    NumberOfUpdates: invoice.NumberOfUpdates);
}
