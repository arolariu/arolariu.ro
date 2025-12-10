namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Response DTO representing a merchant entity returned from the API.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Provides a clean API contract for merchant data, fully decoupled
/// from the internal <see cref="Merchant"/> domain entity.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Relationships:</b> Includes <see cref="ReferencedInvoiceCount"/> and
/// <see cref="ReferencedInvoiceIds"/> for quick relationship access without additional queries.
/// </para>
/// <para>
/// <b>Auditing:</b> Tracks creation and update metadata via <see cref="CreatedAt"/>,
/// <see cref="CreatedBy"/>, <see cref="LastUpdatedAt"/>, <see cref="LastUpdatedBy"/>,
/// and <see cref="NumberOfUpdates"/>.
/// </para>
/// </remarks>
/// <param name="Id">
/// Unique merchant identifier (Version 7 GUID, time-ordered). Used for all merchant
/// operations and cross-referencing.
/// </param>
/// <param name="Name">
/// The merchant's display name (e.g., "Kaufland Iasi Pacurari"). Required, non-empty.
/// </param>
/// <param name="Description">
/// A detailed description of the merchant. May be empty if not provided.
/// </param>
/// <param name="Category">
/// Business category classification (e.g., Grocery, Restaurant, Pharmacy).
/// Defaults to <see cref="MerchantCategory.NOT_DEFINED"/> if unclassified.
/// </param>
/// <param name="Address">
/// Structured contact and address information including street, city, postal code,
/// country, phone, and email.
/// </param>
/// <param name="ParentCompanyId">
/// Reference to a parent company merchant (for franchise/chain stores).
/// <see cref="Guid.Empty"/> if no parent company exists.
/// </param>
/// <param name="ReferencedInvoiceCount">
/// Count of invoices associated with this merchant. Useful for UI display
/// without needing to load the full invoice list.
/// </param>
/// <param name="ReferencedInvoiceIds">
/// Collection of invoice identifiers referencing this merchant.
/// Returns an empty collection if no invoices are associated.
/// </param>
/// <param name="AdditionalMetadata">
/// Extensible key-value metadata for custom merchant attributes (e.g., loyalty program IDs,
/// tax identifiers, operating hours).
/// </param>
/// <param name="IsImportant">
/// Flag indicating if the merchant is marked as important/favorite by the user.
/// </param>
/// <param name="IsSoftDeleted">
/// Flag indicating soft deletion status. Soft-deleted merchants are excluded from
/// normal queries but retained for historical data.
/// </param>
/// <param name="CreatedAt">
/// UTC timestamp when the merchant was first created.
/// </param>
/// <param name="CreatedBy">
/// Identifier of the user who created this merchant record.
/// </param>
/// <param name="LastUpdatedAt">
/// UTC timestamp of the most recent update. Equals <see cref="CreatedAt"/> if never updated.
/// </param>
/// <param name="LastUpdatedBy">
/// Identifier of the user who last modified this merchant. Equals <see cref="CreatedBy"/>
/// if never updated by a different user.
/// </param>
/// <param name="NumberOfUpdates">
/// Total count of update operations performed on this merchant. Zero for newly created merchants.
/// </param>
/// <example>
/// <code>
/// // Converting from domain entity
/// Merchant domainMerchant = await merchantService.GetMerchantAsync(merchantId);
/// MerchantResponseDto dto = MerchantResponseDto.FromMerchant(domainMerchant);
///
/// // Displaying merchant summary
/// Console.WriteLine($"Merchant: {dto.Name} ({dto.Category})");
/// Console.WriteLine($"Invoices: {dto.ReferencedInvoiceCount}");
/// Console.WriteLine($"Last updated: {dto.LastUpdatedAt:u}");
/// </code>
/// </example>
/// <seealso cref="Merchant"/>
/// <seealso cref="MerchantCategory"/>
/// <seealso cref="ContactInformation"/>
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
  /// Creates a <see cref="MerchantResponseDto"/> from a domain <see cref="Merchant"/> entity.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>Factory Pattern:</b> Preferred method for creating DTOs from domain entities.
  /// Ensures consistent mapping and defensive copying of collections.
  /// </para>
  /// <para>
  /// <b>Defensive Copying:</b> The <see cref="ReferencedInvoiceIds"/> and
  /// <see cref="AdditionalMetadata"/> are copied to prevent external mutation.
  /// </para>
  /// </remarks>
  /// <param name="merchant">
  /// The domain merchant entity to convert. Must not be null.
  /// </param>
  /// <returns>
  /// A new <see cref="MerchantResponseDto"/> instance with all fields mapped from the domain entity.
  /// </returns>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="merchant"/> is null.
  /// </exception>
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
