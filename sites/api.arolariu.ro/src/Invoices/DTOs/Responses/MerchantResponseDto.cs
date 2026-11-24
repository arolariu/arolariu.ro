namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;

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
/// <param name="Category">The selected merchant category, or null if uncategorized.</param>
/// <param name="Address">
/// Structured contact and address information including street, city, postal code,
/// country, phone, and email.
/// </param>
/// <param name="ParentCompanyId">
/// Reference to a parent company merchant (for franchise/chain stores).
/// <see cref="Guid.Empty"/> if no parent company exists.
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
/// MerchantResponseDto dto = MerchantResponseDto.FromMerchantForCaller(domainMerchant, callerId);
///
/// // Displaying merchant summary
/// Console.WriteLine($"Merchant: {dto.Name} ({dto.Category})");
/// Console.WriteLine($"Last updated: {dto.LastUpdatedAt:u}");
/// </code>
/// </example>
/// <seealso cref="Merchant"/>
/// <seealso cref="ContactInformation"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct MerchantResponseDto(
  [property: JsonPropertyName("id")] Guid Id,
  [property: JsonPropertyName("name")] string Name,
  [property: JsonPropertyName("description")] string Description,
  [property: JsonPropertyName("category")] MerchantCategory? Category,
  [property: JsonPropertyName("address")] ContactInformationResponseDto Address,
  [property: JsonPropertyName("parentCompanyId")] Guid ParentCompanyId,
  [property: JsonPropertyName("additionalMetadata")] IReadOnlyDictionary<string, string> AdditionalMetadata,
  [property: JsonPropertyName("isImportant")] bool IsImportant,
  [property: JsonPropertyName("isSoftDeleted")] bool IsSoftDeleted,
  [property: JsonPropertyName("createdAt")] DateTimeOffset CreatedAt,
  [property: JsonPropertyName("createdBy")] Guid CreatedBy,
  [property: JsonPropertyName("lastUpdatedAt")] DateTimeOffset LastUpdatedAt,
  [property: JsonPropertyName("lastUpdatedBy")] Guid LastUpdatedBy,
  [property: JsonPropertyName("numberOfUpdates")] int NumberOfUpdates)
{
  /// <summary>
  /// Creates a caller-scoped merchant response without disclosing cross-tenant audit principals.
  /// </summary>
  /// <remarks>
  /// Audit principals are retained only when
  /// they identify that caller; unrelated identities are represented by <see cref="Guid.Empty"/>.
  /// Additional metadata is omitted because the shared merchant document does not retain per-key
  /// ownership provenance and therefore cannot safely distinguish caller-visible values.
  /// </remarks>
  /// <param name="merchant">The shared merchant document to project.</param>
  /// <param name="callerIdentifier">The authenticated caller identifier.</param>
  /// <returns>A merchant response containing only caller-visible audit identity data.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="merchant"/> is null.</exception>
  public static MerchantResponseDto FromMerchantForCaller(Merchant merchant, Guid callerIdentifier)
  {
    ArgumentNullException.ThrowIfNull(merchant);
    return new(
      Id: merchant.id,
      Name: merchant.Name,
      Description: merchant.Description,
      Category: merchant.Category,
      Address: ContactInformationResponseDto.FromContactInformation(merchant.Address),
      ParentCompanyId: merchant.ParentCompanyId,
      AdditionalMetadata: new Dictionary<string, string>(),
      IsImportant: merchant.IsImportant,
      IsSoftDeleted: merchant.IsSoftDeleted,
      CreatedAt: merchant.CreatedAt,
      CreatedBy: merchant.CreatedBy == callerIdentifier ? callerIdentifier : Guid.Empty,
      LastUpdatedAt: merchant.LastUpdatedAt,
      LastUpdatedBy: merchant.LastUpdatedBy == callerIdentifier ? callerIdentifier : Guid.Empty,
      NumberOfUpdates: merchant.NumberOfUpdates);
  }
}
