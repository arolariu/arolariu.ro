namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Data transfer object for full merchant update operations (PUT semantics).
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Replaces the entire merchant resource with the provided values.</para>
/// <para><b>Conversion:</b> Use <see cref="ToMerchant(Guid)"/> to convert to the domain <see cref="Merchant"/> entity.</para>
/// <para><b>Relationships:</b> <see cref="ParentCompanyId"/> establishes hierarchical grouping.</para>
/// </remarks>
/// <param name="Name">The merchant's display name.</param>
/// <param name="Description">A detailed description of the merchant.</param>
/// <param name="Category">The merchant category classification.</param>
/// <param name="Address">Structured contact and address information.</param>
/// <param name="ParentCompanyId">Optional reference to a parent company for hierarchical organization.</param>
/// <param name="AdditionalMetadata">Extensible key-value metadata for the merchant.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct UpdateMerchantDto(
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
  /// <param name="merchantId">The existing merchant identifier to preserve.</param>
  /// <returns>A fully populated <see cref="Merchant"/> instance ready for persistence.</returns>
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
