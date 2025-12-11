namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Request DTO for creating a new standalone merchant entity.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Creates a new merchant in the system without immediately associating
/// it with an invoice. Useful for pre-populating the merchant database or managing
/// merchants independently.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Hierarchical Structure:</b> Use <see cref="ParentCompanyIdentifier"/> to establish
/// franchise/chain relationships. Set to <see cref="Guid.Empty"/> for independent merchants.
/// </para>
/// <para>
/// <b>Address Handling:</b> The <see cref="Address"/> string is currently stored as-is.
/// Structured parsing into <see cref="ContactInformation"/> may be performed by the
/// service layer or AI enrichment.
/// </para>
/// </remarks>
/// <param name="Name">
/// The merchant's display name. Required. Should be unique within a reasonable scope
/// (e.g., within a city or region).
/// </param>
/// <param name="Description">
/// A detailed description of the merchant. Required.
/// May include business type, operating hours, or other relevant details.
/// </param>
/// <param name="Address">
/// The merchant's address as a free-form string. Required.
/// Will be wrapped in <see cref="ContactInformation"/> during conversion.
/// </param>
/// <param name="ParentCompanyIdentifier">
/// Identifier of the parent company for hierarchical grouping.
/// Use <see cref="Guid.Empty"/> for independent merchants.
/// </param>
/// <example>
/// <code>
/// var request = new CreateMerchantRequestDto(
///     Name: "Kaufland Romania",
///     Description: "German hypermarket chain operating in Romania",
///     Address: "Str. Pacurari 123, Iasi 700000, Romania",
///     ParentCompanyIdentifier: Guid.Empty);  // No parent
///
/// var merchant = request.ToMerchant();
/// await merchantService.CreateAsync(merchant);
/// </code>
/// </example>
/// <seealso cref="Merchant"/>
/// <seealso cref="AddMerchantToInvoiceRequestDto"/>
/// <seealso cref="UpdateMerchantRequestDto"/>
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
  /// <remarks>
  /// <para>
  /// <b>ID Generation:</b> A new <see cref="Guid"/> is generated for the merchant.
  /// </para>
  /// <para>
  /// <b>Category Default:</b> The category is set to <see cref="MerchantCategory.OTHER"/>
  /// and should be refined through subsequent updates or AI classification.
  /// </para>
  /// <para>
  /// <b>Address Note:</b> The <see cref="Address"/> string parameter is not currently
  /// parsed into the <see cref="ContactInformation"/> structure. The resulting
  /// entity receives an empty <see cref="ContactInformation"/> instance.
  /// </para>
  /// </remarks>
  /// <returns>
  /// A new <see cref="Merchant"/> instance with generated ID and current timestamp.
  /// </returns>
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
