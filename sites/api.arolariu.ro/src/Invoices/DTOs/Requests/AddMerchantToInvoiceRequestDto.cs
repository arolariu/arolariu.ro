namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;

/// <summary>
/// Request DTO for creating and associating a new merchant with an invoice.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Creates a new merchant entity and immediately associates it with
/// an invoice in a single atomic operation. Useful when processing invoices from
/// previously unknown merchants.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Precondition:</b> The target invoice must not already have a merchant reference.
/// Attempting to add a merchant to an invoice that already has one will result in
/// a conflict error.
/// </para>
/// <para>
/// <b>Hierarchical Structure:</b> Merchants can optionally belong to a parent company
/// (e.g., individual store locations under a franchise brand).
/// </para>
/// </remarks>
/// <param name="Name">
/// The merchant's display name. Required. Typically the store or business name
/// (e.g., "Kaufland Iasi Pacurari").
/// </param>
/// <param name="Description">
/// A detailed description of the merchant. Required.
/// May include operating hours, specialties, or other relevant information.
/// </param>
/// <param name="ClassificationSystem">Optional taxonomy system for the manual merchant classification.</param>
/// <param name="ClassificationCode">Optional taxonomy code for the manual merchant classification.</param>
/// <param name="Address">
/// Optional structured contact and address information including street,
/// city, postal code, country, phone, and email.
/// </param>
/// <param name="ParentCompanyId">
/// Optional reference to a parent company merchant ID for franchise/chain stores.
/// Null if the merchant is independent or the parent is unknown.
/// </param>
/// <example>
/// <code>
/// var request = new AddMerchantToInvoiceRequestDto(
///     Name: "Kaufland Iasi Pacurari",
///     Description: "Hypermarket in Iasi, open 07:00-22:00",
///     ClassificationSystem: ClassificationSystem.Nace21,
///     ClassificationCode: "47.11",
///     Address: new ContactInformation { City = "Iasi", Country = "Romania" },
///     ParentCompanyId: parentCompanyGuid);
///
/// var merchant = request.ToMerchant();
/// await invoiceService.AddMerchantToInvoiceAsync(invoiceId, merchant);
/// </code>
/// </example>
/// <seealso cref="Merchant"/>
/// <seealso cref="ContactInformation"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct AddMerchantToInvoiceRequestDto(
  [Required] string Name,
  [Required] string Description,
  ClassificationSystem? ClassificationSystem,
  string? ClassificationCode,
  ContactInformation? Address,
  Guid? ParentCompanyId)
{
  /// <summary>
  /// Converts this DTO to a new <see cref="Merchant"/> domain entity.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>ID Generation:</b> A new <see cref="Guid"/> is generated for the merchant.
  /// Consider using <c>Guid.CreateVersion7()</c> for time-ordered IDs in production.
  /// </para>
  /// <para>
  /// <b>Defaults:</b> Optional fields default to empty/sentinel values:
  /// <list type="bullet">
  ///   <item><description><see cref="Address"/>: Empty <see cref="ContactInformation"/>.</description></item>
  ///   <item><description><see cref="ParentCompanyId"/>: <see cref="Guid.Empty"/>.</description></item>
  /// </list>
  /// </para>
  /// <para>
  /// <b>Timestamp:</b> <c>CreatedAt</c> is set to the current UTC time.
  /// </para>
  /// </remarks>
  /// <returns>
  /// A new <see cref="Merchant"/> instance ready for persistence.
  /// </returns>
  public Merchant ToMerchant() => new()
  {
    id = Guid.NewGuid(),
    Name = Name,
    Description = Description,
    Classification = RequestClassificationMapper.ToManualSelection(
      ClassificationSystem,
      ClassificationCode,
      DDD.ValueObjects.Classifications.ClassificationSystem.Nace21),
    Address = Address ?? new ContactInformation(),
    ParentCompanyId = ParentCompanyId ?? Guid.Empty,
    CreatedAt = DateTime.UtcNow,
  };
}
