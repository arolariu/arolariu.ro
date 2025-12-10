namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Request DTO for removing a product line item from an invoice.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Identifies a product for removal from an invoice's item collection.
/// Typically used to remove incorrectly added items or duplicate entries.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Soft Delete:</b> By default, deletion marks the product's <c>Metadata.IsSoftDeleted</c>
/// flag as <c>true</c> rather than physically removing it. This preserves audit history
/// and allows for potential recovery.
/// </para>
/// <para>
/// <b>Recalculation:</b> After deletion, the invoice's <c>PaymentInformation.TotalAmount</c>
/// should be recalculated to exclude the deleted product.
/// </para>
/// </remarks>
/// <param name="ProductName">
/// The raw name of the product to delete. Required.
/// Must exactly match the <c>RawName</c> of an existing product in the invoice.
/// </param>
/// <example>
/// <code>
/// // Remove a product by its raw name
/// var request = new DeleteProductRequestDto(ProductName: "LAPTE ZUZU 1L");
///
/// // Service layer handles the actual deletion
/// await invoiceService.DeleteProductAsync(invoiceId, request);
/// </code>
/// </example>
/// <seealso cref="CreateProductRequestDto"/>
/// <seealso cref="UpdateProductRequestDto"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct DeleteProductRequestDto(
  [Required] string ProductName);
