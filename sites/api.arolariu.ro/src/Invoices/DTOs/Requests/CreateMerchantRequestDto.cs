namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Data transfer object for creating a new merchant.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Captures the required data to create a new merchant in the system.</para>
/// <para><b>Conversion:</b> Use <see cref="ToMerchant"/> to convert to the domain <see cref="Merchant"/> entity.</para>
/// <para><b>Hierarchical:</b> Merchants can optionally belong to a parent company via <see cref="ParentCompanyIdentifier"/>.</para>
/// </remarks>
/// <param name="Name">The merchant's display name.</param>
/// <param name="Description">A detailed description of the merchant.</param>
/// <param name="Address">The merchant's address (as a string, will be parsed to ContactInformation).</param>
/// <param name="ParentCompanyIdentifier">Optional parent company identifier for hierarchical grouping.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct CreateMerchantRequestDto(
  [Required] string Name,
  [Required] string Description,
  [Required] string Address,
  Guid ParentCompanyIdentifier)
{
  /// <summary>
  /// Converts this DTO to a new <see cref="Merchant"/> domain entity.
  /// </summary>
  /// <returns>A new <see cref="Merchant"/> instance with a generated identifier.</returns>
  public Merchant ToMerchant()
  {
    var merchant = new Merchant
    {
      id = Guid.NewGuid(),
      Address = new ContactInformation(),
      Category = MerchantCategory.OTHER,
      CreatedAt = DateTime.UtcNow,
      Description = Description,
      Name = Name,
      ParentCompanyId = ParentCompanyIdentifier,
    };

    return merchant;
  }
}
