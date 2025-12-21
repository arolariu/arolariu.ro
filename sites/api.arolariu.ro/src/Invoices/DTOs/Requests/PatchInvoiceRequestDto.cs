namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>
/// Request DTO for partial invoice update operations (HTTP PATCH semantics).
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Allows selective updates to specific invoice fields without
/// replacing the entire resource. Follows HTTP PATCH semantics where null values
/// indicate "no change".
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Merge Strategy:</b> Uses <see cref="ApplyTo(Invoice)"/> which performs a
/// non-destructive merge with the following rules:
/// <list type="bullet">
///   <item><description>Null values preserve the original field value.</description></item>
///   <item><description><see cref="Guid.Empty"/> for <c>MerchantReference</c> means "no change".</description></item>
///   <item><description><see cref="InvoiceCategory.NOT_DEFINED"/> means "no change".</description></item>
///   <item><description>Empty or whitespace strings for Name/Description mean "no change".</description></item>
/// </list>
/// </para>
/// <para>
/// <b>Collections:</b> Scans, Items, Recipes, and SharedWith are copied from the
/// existing invoice (not modifiable via PATCH). Metadata entries are merged
/// with key-wise overwrite semantics.
/// </para>
/// <para>
/// <b>Full Replacement:</b> For complete invoice replacement, use
/// <see cref="UpdateInvoiceRequestDto"/> which follows HTTP PUT semantics.
/// </para>
/// </remarks>
/// <param name="Name">
/// Optional new name for the invoice. Null or whitespace preserves the existing name.
/// </param>
/// <param name="Description">
/// Optional new description. Null or whitespace preserves the existing description.
/// </param>
/// <param name="Category">
/// Optional new category classification. Null or <see cref="InvoiceCategory.NOT_DEFINED"/>
/// preserves the existing category.
/// </param>
/// <param name="PaymentInformation">
/// Optional new payment information. Null preserves the existing payment details.
/// </param>
/// <param name="MerchantReference">
/// Optional new merchant reference. Null or <see cref="Guid.Empty"/> preserves
/// the existing merchant association.
/// </param>
/// <param name="IsImportant">
/// Optional importance flag update. Null preserves the existing flag value.
/// </param>
/// <param name="SharedWith">
/// Optional list of user identifiers to share the invoice with. When provided,
/// this completely replaces the existing SharedWith list. Use an empty list to
/// remove all shares. Null preserves the existing sharing settings.
/// </param>
/// <param name="AdditionalMetadata">
/// Optional metadata entries to merge with existing metadata. Existing keys are
/// overwritten; new keys are added. Null or empty dictionary means no metadata changes.
/// </param>
/// <example>
/// <code>
/// // Update only the name and importance flag
/// var request = new PatchInvoiceRequestDto(
///     Name: "Updated Name",
///     Description: null,  // Keep existing
///     Category: null,     // Keep existing
///     PaymentInformation: null,
///     MerchantReference: null,
///     IsImportant: true,
///     AdditionalMetadata: null);
///
/// var patched = request.ApplyTo(existingInvoice);
/// await invoiceService.UpdateAsync(patched);
/// </code>
/// </example>
/// <seealso cref="Invoice"/>
/// <seealso cref="UpdateInvoiceRequestDto"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct PatchInvoiceRequestDto(
  string? Name,
  string? Description,
  InvoiceCategory? Category,
  PaymentInformation? PaymentInformation,
  Guid? MerchantReference,
  bool? IsImportant,
  ICollection<Guid>? SharedWith,
  IDictionary<string, object>? AdditionalMetadata)
{
  /// <summary>
  /// Applies this partial update to an existing <see cref="Invoice"/> instance.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>Immutable Operation:</b> Creates a new invoice instance with merged values.
  /// The original <paramref name="existing"/> invoice is not mutated.
  /// </para>
  /// <para>
  /// <b>Field Update Rules:</b>
  /// <list type="bullet">
  ///   <item><description><see cref="Name"/>: Applied only if non-null and non-whitespace.</description></item>
  ///   <item><description><see cref="Description"/>: Applied only if non-null and non-whitespace.</description></item>
  ///   <item><description><see cref="Category"/>: Applied only if has value and not <c>NOT_DEFINED</c>.</description></item>
  ///   <item><description><see cref="PaymentInformation"/>: Applied only if non-null.</description></item>
  ///   <item><description><see cref="MerchantReference"/>: Applied only if has value and not <c>Empty</c>.</description></item>
  ///   <item><description><see cref="IsImportant"/>: Applied only if has value.</description></item>
  /// </list>
  /// </para>
  /// <para>
  /// <b>Collection Handling:</b> All collections (Scans, Items, PossibleRecipes, SharedWith)
  /// are copied from the existing invoice to preserve referential integrity.
  /// </para>
  /// <para>
  /// <b>Metadata Merge:</b> Existing metadata is copied first, then DTO metadata
  /// is overlaid, allowing selective key updates without losing other entries.
  /// </para>
  /// </remarks>
  /// <param name="existing">
  /// The existing invoice to apply patches to. Must not be null.
  /// </param>
  /// <returns>
  /// A new <see cref="Invoice"/> instance with merged values from this DTO and
  /// the existing invoice.
  /// </returns>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="existing"/> is null.
  /// </exception>
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

    // SharedWith: Replace entirely if provided, otherwise copy from existing
    if (SharedWith is not null)
    {
      foreach (var sharedUser in SharedWith)
      {
        patched.SharedWith.Add(sharedUser);
      }
    }
    else
    {
      foreach (var sharedUser in existing.SharedWith)
      {
        patched.SharedWith.Add(sharedUser);
      }
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
