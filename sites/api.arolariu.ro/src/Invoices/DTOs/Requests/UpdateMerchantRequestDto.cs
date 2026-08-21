namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Request DTO for updating client-editable merchant fields.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Updates contact, description, metadata, and an optional manual NACE
/// selection without replacing relationships, audit state, or the Cosmos partition identity.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Identity Preservation:</b> The merchant's ID and creation metadata are preserved.
/// Only client-editable business fields are applied to the persisted merchant.
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
/// <param name="ClassificationCode">Optional taxonomy code for the manual merchant classification.</param>
/// <param name="Address">
/// The new structured contact and address information.
/// Null creates an empty <see cref="ContactInformation"/> instance.
/// </param>
/// <param name="ParentCompanyId">
/// Retained for wire compatibility but not client-editable. The persisted parent company controls
/// the Cosmos partition and is always retained by an update.
/// </param>
/// <param name="AdditionalMetadata">
/// Optional extensible key-value metadata. A non-empty dictionary replaces existing client-editable metadata;
/// null or an empty dictionary retains persisted metadata and server enrichment.
/// </param>
/// <example>
/// <code>
/// var request = new UpdateMerchantRequestDto(
///     Name: "Kaufland Iasi Pacurari",
///     Description: "Updated description with new hours",
///     ClassificationCode: "47.11",
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
  string? ClassificationCode,
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
  ///   <item><description><see cref="ParentCompanyId"/>: Deliberately ignored; the persisted partition identity is retained.</description></item>
  ///   <item><description><see cref="AdditionalMetadata"/>: Null results in an empty update candidate and preserves persisted metadata.</description></item>
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
  /// A transient <see cref="Merchant"/> carrying only client-editable values for application to a persisted merchant.
  /// </returns>
  public Merchant ToMerchant(Guid merchantId)
  {
    var merchant = new Merchant
    {
      id = merchantId,
      Name = Name,
      Description = Description,
      Address = Address ?? new ContactInformation(),
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
