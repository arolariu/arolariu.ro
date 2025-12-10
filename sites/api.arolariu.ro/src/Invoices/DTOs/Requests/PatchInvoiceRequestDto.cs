namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>
/// Data transfer object for partial invoice update operations (PATCH semantics).
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Allows partial updates to an invoice. Only non-null fields are applied to the existing invoice.</para>
/// <para><b>Merge Strategy:</b> Uses <see cref="ApplyTo(Invoice)"/> which performs a non-destructive merge where:
/// <list type="bullet">
///   <item><description>Null values are ignored (original values preserved).</description></item>
///   <item><description><c>Guid.Empty</c> is treated as "no change" for <c>MerchantReference</c>.</description></item>
///   <item><description><c>InvoiceCategory.NOT_DEFINED</c> is treated as "no change".</description></item>
///   <item><description>Empty strings are treated as "no change" for Name/Description.</description></item>
/// </list></para>
/// <para><b>Collections:</b> Metadata entries are merged (key-wise overwrite); empty dictionary means "no changes".</para>
/// </remarks>
/// <param name="Name">Optional new name for the invoice.</param>
/// <param name="Description">Optional new description for the invoice.</param>
/// <param name="Category">Optional new category classification.</param>
/// <param name="PaymentInformation">Optional new payment information.</param>
/// <param name="MerchantReference">Optional new merchant reference.</param>
/// <param name="IsImportant">Optional importance flag update.</param>
/// <param name="AdditionalMetadata">Optional metadata entries to merge.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct PatchInvoiceRequestDto(
  string? Name,
  string? Description,
  InvoiceCategory? Category,
  PaymentInformation? PaymentInformation,
  Guid? MerchantReference,
  bool? IsImportant,
  IDictionary<string, object>? AdditionalMetadata)
{
  /// <summary>
  /// Applies this partial update to an existing <see cref="Invoice"/> instance.
  /// </summary>
  /// <remarks>
  /// <para>Creates a new invoice instance with merged values. The original invoice is not mutated.</para>
  /// <para>Fields are updated only when the DTO value is considered "set" (non-null, non-empty, non-sentinel).</para>
  /// </remarks>
  /// <param name="existing">The existing invoice to apply patches to.</param>
  /// <returns>A new <see cref="Invoice"/> instance with merged values.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="existing"/> is null.</exception>
  public Invoice ApplyTo(Invoice existing)
  {
    ArgumentNullException.ThrowIfNull(existing);
    var patched = new Invoice
    {
      id = existing.id,
      UserIdentifier = existing.UserIdentifier,
      Name = !string.IsNullOrWhiteSpace(Name) ? Name : existing.Name,
      Description = !string.IsNullOrWhiteSpace(Description) ? Description : existing.Description,
      Category = Category.HasValue && Category.Value != InvoiceCategory.NOT_DEFINED ? Category.Value : existing.Category,
      PaymentInformation = PaymentInformation ?? existing.PaymentInformation,
      MerchantReference = MerchantReference.HasValue && MerchantReference.Value != Guid.Empty
        ? MerchantReference.Value
        : existing.MerchantReference,
      IsImportant = IsImportant ?? existing.IsImportant,
    };

    // Copy existing collections
    foreach (var scan in existing.Scans)
    {
      patched.Scans.Add(scan);
    }

    foreach (var item in existing.Items)
    {
      patched.Items.Add(item);
    }

    foreach (var recipe in existing.PossibleRecipes)
    {
      patched.PossibleRecipes.Add(recipe);
    }

    foreach (var sharedUser in existing.SharedWith)
    {
      patched.SharedWith.Add(sharedUser);
    }

    // Merge metadata (existing first, then overlay with new)
    foreach (var (key, value) in existing.AdditionalMetadata)
    {
      patched.AdditionalMetadata[key] = value;
    }

    if (AdditionalMetadata is not null)
    {
      foreach (var (key, value) in AdditionalMetadata)
      {
        patched.AdditionalMetadata[key] = value;
      }
    }

    return patched;
  }
}
