namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Response DTO representing a merchant returned from the API.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Provides a clean API contract for merchant data separate from the internal domain model.</para>
/// <para><b>Conversion:</b> Use <see cref="FromMerchant(Merchant)"/> to create from a domain <see cref="Merchant"/>.</para>
/// <para><b>Relationships:</b> Includes counts for referenced invoices for quick summary access.</para>
/// </remarks>
/// <param name="Id">The unique merchant identifier.</param>
/// <param name="Name">The merchant's display name.</param>
/// <param name="Description">A detailed description of the merchant.</param>
/// <param name="Category">The merchant category classification.</param>
/// <param name="Address">Structured contact and address information.</param>
/// <param name="ParentCompanyId">Reference to a parent company.</param>
/// <param name="ReferencedInvoiceCount">Number of invoices referencing this merchant.</param>
/// <param name="ReferencedInvoiceIds">Collection of invoice identifiers referencing this merchant.</param>
/// <param name="AdditionalMetadata">Extensible key-value metadata.</param>
/// <param name="IsImportant">Flag indicating if the merchant is marked as important.</param>
/// <param name="IsSoftDeleted">Flag indicating soft deletion status.</param>
/// <param name="CreatedAt">Creation timestamp.</param>
/// <param name="CreatedBy">The identifier of the user who created this merchant.</param>
/// <param name="LastUpdatedAt">Last update timestamp.</param>
/// <param name="LastUpdatedBy">The identifier of the user who last updated this merchant.</param>
/// <param name="NumberOfUpdates">Count of updates performed.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct MerchantResponseDto(
  Guid Id,
  string Name,
  string Description,
  MerchantCategory Category,
  ContactInformation Address,
  Guid ParentCompanyId,
  int ReferencedInvoiceCount,
  IReadOnlyCollection<Guid> ReferencedInvoiceIds,
  IReadOnlyDictionary<string, string> AdditionalMetadata,
  bool IsImportant,
  bool IsSoftDeleted,
  DateTimeOffset CreatedAt,
  Guid CreatedBy,
  DateTimeOffset LastUpdatedAt,
  Guid LastUpdatedBy,
  int NumberOfUpdates)
{
  /// <summary>
  /// Creates a <see cref="MerchantResponseDto"/> from a domain <see cref="Merchant"/>.
  /// </summary>
  /// <param name="merchant">The domain merchant to convert.</param>
  /// <returns>A DTO representing the merchant.</returns>
  public static MerchantResponseDto FromMerchant(Merchant merchant)
  {
    ArgumentNullException.ThrowIfNull(merchant);
    return new(
      Id: merchant.id,
      Name: merchant.Name,
      Description: merchant.Description,
      Category: merchant.Category,
      Address: merchant.Address,
      ParentCompanyId: merchant.ParentCompanyId,
      ReferencedInvoiceCount: merchant.ReferencedInvoices.Count,
      ReferencedInvoiceIds: merchant.ReferencedInvoices.ToList().AsReadOnly(),
      AdditionalMetadata: new Dictionary<string, string>(merchant.AdditionalMetadata),
      IsImportant: merchant.IsImportant,
      IsSoftDeleted: merchant.IsSoftDeleted,
      CreatedAt: merchant.CreatedAt,
      CreatedBy: merchant.CreatedBy,
      LastUpdatedAt: merchant.LastUpdatedAt,
      LastUpdatedBy: merchant.LastUpdatedBy,
      NumberOfUpdates: merchant.NumberOfUpdates);
  }
}
