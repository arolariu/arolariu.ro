namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Request DTO for full merchant replacement operations (HTTP PUT semantics).
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Replaces the entire merchant resource with the provided values.
/// This follows HTTP PUT semantics where all mutable fields are replaced.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Identity Preservation:</b> The merchant's ID and creation metadata are preserved.
/// Only mutable business fields are replaced.
/// </para>
/// <para>
/// <b>Relationships:</b> The <see cref="ParentCompanyId"/> establishes hierarchical
/// grouping for franchise/chain organizations.
/// </para>
/// </remarks>
/// <param name="Name">
/// The merchant's new display name. Required. Replaces the existing name.
/// </param>
/// <param name="Description">
/// The new detailed description. Required. Replaces the existing description.
/// </param>
/// <param name="Category">
/// The new category classification. Replaces the existing category.
/// </param>
/// <param name="Address">
/// The new structured contact and address information.
/// Null creates an empty <see cref="ContactInformation"/> instance.
/// </param>
/// <param name="ParentCompanyId">
/// The new parent company reference for hierarchical organization.
/// Null or <see cref="Guid.Empty"/> indicates no parent company.
/// </param>
/// <param name="AdditionalMetadata">
/// The new extensible key-value metadata. Replaces all existing metadata.
/// Null or empty dictionary clears existing metadata.
/// </param>
/// <example>
/// <code>
/// var request = new UpdateMerchantRequestDto(
///     Name: "Kaufland Iasi Pacurari",
///     Description: "Updated description with new hours",
///     Category: MerchantCategory.GROCERY,
///     Address: new ContactInformation { City = "Iasi", Country = "Romania" },
///     ParentCompanyId: parentId,
///     AdditionalMetadata: new Dictionary&lt;string, string&gt; { ["storeCode"] = "IS001" });
///
/// var merchant = request.ToMerchant(existingMerchantId);
/// await merchantService.UpdateAsync(merchant);
/// </code>
/// </example>
/// <seealso cref="Merchant"/>
/// <seealso cref="CreateMerchantRequestDto"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct UpdateMerchantRequestDto(
  [Required] string Name,
  [Required] string Description,
  MerchantCategory Category,
  ContactInformation? Address,
  Guid? ParentCompanyId,
  IDictionary<string, string>? AdditionalMetadata)
{
  /// <summary>
  /// Converts this DTO to a <see cref="Merchant"/> domain entity.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>Identity Preservation:</b> The <paramref name="merchantId"/> is used to
  /// maintain the merchant's identity across the update operation.
  /// </para>
  /// <para>
  /// <b>Null Handling:</b>
  /// <list type="bullet">
  ///   <item><description><see cref="Address"/>: Null becomes empty <see cref="ContactInformation"/>.</description></item>
  ///   <item><description><see cref="ParentCompanyId"/>: Null becomes <see cref="Guid.Empty"/>.</description></item>
  ///   <item><description><see cref="AdditionalMetadata"/>: Null results in empty metadata.</description></item>
  /// </list>
  /// </para>
  /// <para>
  /// <b>Metadata Handling:</b> The metadata dictionary is copied entry-by-entry
  /// to the domain entity's metadata collection.
  /// </para>
  /// </remarks>
  /// <param name="merchantId">
  /// The existing merchant identifier to preserve. Must match an existing merchant.
  /// </param>
  /// <returns>
  /// A fully populated <see cref="Merchant"/> instance ready for persistence.
  /// </returns>
  public Merchant ToMerchant(Guid merchantId)
  {
    var merchant = new Merchant
    {
      id = merchantId,
      Name = Name,
      Description = Description,
      Category = Category,
      Address = Address ?? new ContactInformation(),
      ParentCompanyId = ParentCompanyId ?? Guid.Empty,
    };

    if (AdditionalMetadata is not null)
    {
      foreach (var (key, value) in AdditionalMetadata)
      {
        merchant.AdditionalMetadata[key] = value;
      }
    }

    return merchant;
  }
}
