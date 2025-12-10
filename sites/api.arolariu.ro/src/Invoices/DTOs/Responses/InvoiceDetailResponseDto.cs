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
/// <param name="IsSoftDeleted">Flag indicating soft deletion status.</param>
/// <param name="CreatedAt">Creation timestamp.</param>
/// <param name="CreatedBy">The identifier of the user who created this invoice.</param>
/// <param name="LastUpdatedAt">Last update timestamp.</param>
/// <param name="LastUpdatedBy">The identifier of the user who last updated this invoice.</param>
/// <param name="NumberOfUpdates">Count of updates performed.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct InvoiceDetailResponseDto(
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
  /// Creates an <see cref="InvoiceDetailResponseDto"/> from a domain <see cref="Invoice"/>.
  /// </summary>
  /// <param name="invoice">The domain invoice to convert.</param>
  /// <returns>A detailed DTO representing the full invoice.</returns>
  public static InvoiceDetailResponseDto FromInvoice(Invoice invoice)
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
