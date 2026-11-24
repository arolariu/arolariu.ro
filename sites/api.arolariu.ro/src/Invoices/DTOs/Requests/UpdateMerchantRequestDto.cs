namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;

/// <summary>
/// Request DTO for updating client-editable merchant fields.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Updates contact, description, metadata, and an optional manual
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
/// <param name="Category">A valid merchant category ID to assign, or -1 to clear. Omitted or null preserves it.</param>
/// <example>
/// <code>
/// var request = new UpdateMerchantRequestDto(
///     Name: "Kaufland Iasi Pacurari",
///     Description: "Updated description with new hours",
///     Address: new ContactInformation { City = "Iasi", Country = "Romania" },
///     ParentCompanyId: parentId,
///     AdditionalMetadata: new Dictionary&lt;string, string&gt; { ["storeCode"] = "IS001" });
///
/// request.ApplyTo(merchant);
/// await merchantService.UpdateAsync(merchant);
/// </code>
/// </example>
/// <seealso cref="Merchant"/>
/// <seealso cref="CreateMerchantRequestDto"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct UpdateMerchantRequestDto(
  string? Name,
  string? Description,
  ContactInformation? Address,
  Guid? ParentCompanyId,
  IDictionary<string, string>? AdditionalMetadata,
  [property: JsonNumberHandling(JsonNumberHandling.Strict)] int? Category = null)
{
  private bool IsCategoryOnly => Category.HasValue && Name is null && Description is null
    && Address is null && ParentCompanyId is null && AdditionalMetadata is null;

  internal bool IsValid => CategorySelection.IsValid<MerchantCategory>(Category)
    && (IsCategoryOnly || (!string.IsNullOrWhiteSpace(Name) && !string.IsNullOrWhiteSpace(Description)));

  /// <summary>Applies only editable values, retaining the merchant's identity, revision and references.</summary>
  internal void ApplyTo(Merchant merchant)
  {
    if (!IsCategoryOnly)
    {
      merchant.Name = Name ?? string.Empty;
      merchant.Description = Description ?? string.Empty;
      merchant.Address = Address ?? new ContactInformation();

      if (AdditionalMetadata is { Count: > 0 })
      {
        merchant.AdditionalMetadata.Clear();
        foreach (var (key, value) in AdditionalMetadata) merchant.AdditionalMetadata[key] = value;
      }
    }

    merchant.Category = CategorySelection.Apply(Category, merchant.Category);
  }
}
