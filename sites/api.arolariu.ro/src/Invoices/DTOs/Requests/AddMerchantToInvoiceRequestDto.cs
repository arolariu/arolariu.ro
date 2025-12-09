namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Data transfer object for adding a new merchant to an invoice.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Creates a new merchant and associates it with an invoice in a single operation.</para>
/// <para><b>Conversion:</b> Use <see cref="ToMerchant"/> to convert to the domain <see cref="Merchant"/> entity.</para>
/// <para><b>Constraints:</b> The target invoice must not already have a merchant reference.</para>
/// </remarks>
/// <param name="Name">The merchant's display name.</param>
/// <param name="Description">A detailed description of the merchant.</param>
/// <param name="Category">The merchant category classification.</param>
/// <param name="Address">Optional structured contact and address information.</param>
/// <param name="ParentCompanyId">Optional reference to a parent company.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct AddMerchantToInvoiceRequestDto(
  [Required] string Name,
  [Required] string Description,
  MerchantCategory Category,
  ContactInformation? Address,
  Guid? ParentCompanyId)
{
  /// <summary>
  /// Converts this DTO to a new <see cref="Merchant"/> domain entity.
  /// </summary>
  /// <returns>A new <see cref="Merchant"/> instance with a generated identifier.</returns>
  public Merchant ToMerchant() => new()
  {
    id = Guid.NewGuid(),
    Name = Name,
    Description = Description,
    Category = Category,
    Address = Address ?? new ContactInformation(),
    ParentCompanyId = ParentCompanyId ?? Guid.Empty,
    CreatedAt = DateTime.UtcNow,
  };
}
