namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Request DTO for managing invoice associations with a merchant.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Provides a batch operation interface for adding or removing
/// the merchant reference on the caller's own invoices.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>HTTP Method Semantics:</b>
/// <list type="bullet">
///   <item><description><b>PATCH:</b> Sets the merchant reference on the selected invoices. Duplicates are ignored.</description></item>
///   <item><description><b>DELETE:</b> Clears the reference on selected invoices currently linked to this merchant.</description></item>
/// </list>
/// </para>
/// <para>
/// <b>Validation:</b> Only active invoices in the caller's partition are eligible. Unknown identifiers do not
/// grant access to other invoices. Each selected invoice commits independently.
/// </para>
/// <para>
/// <b>Use Cases:</b>
/// <list type="bullet">
///   <item><description>Bulk-associating historical invoices with a newly created merchant.</description></item>
///   <item><description>Correcting merchant associations when invoices were misclassified.</description></item>
///   <item><description>Cleaning up references when invoices are deleted or reassigned.</description></item>
/// </list>
/// </para>
/// </remarks>
/// <param name="InvoiceIdentifiers">
/// Collection of invoice GUIDs to add or remove. Required.
/// Must contain at least one identifier. Empty collections result in validation errors.
/// </param>
/// <example>
/// <code>
/// // Add invoices to a merchant
/// var addRequest = new MerchantInvoicesRequestDto(
///     InvoiceIdentifiers: new[] { invoice1Id, invoice2Id, invoice3Id });
/// await merchantService.AddInvoicesAsync(merchantId, addRequest);
///
/// // Remove invoices from a merchant
/// var removeRequest = new MerchantInvoicesRequestDto(
///     InvoiceIdentifiers: new[] { oldInvoiceId });
/// await merchantService.RemoveInvoicesAsync(merchantId, removeRequest);
/// </code>
/// </example>
/// <seealso cref="Invoices.DDD.Entities.Merchants.Merchant"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct MerchantInvoicesRequestDto(
  [Required] IEnumerable<Guid> InvoiceIdentifiers);
