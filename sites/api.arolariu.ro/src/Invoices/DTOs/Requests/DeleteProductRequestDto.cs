namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Identifies the first invoice product to delete by name.
/// </summary>
/// <remarks>
/// The route identifies the owning invoice. Processing performs a case-insensitive exact-name lookup and removes the
/// first matching line item before persisting the invoice once. Duplicate product names remain intentionally
/// ambiguous because products are identity-free.
/// </remarks>
/// <param name="ProductName">The required product name used to locate the first matching line item.</param>
/// <example>
/// <code>
/// var request = new DeleteProductRequestDto("LAPTE ZUZU 1L");
/// await invoiceService.DeleteProduct(invoiceId, userId, request.ProductName, cancellationToken);
/// </code>
/// </example>
/// <seealso cref="CreateProductRequestDto"/>
/// <seealso cref="UpdateProductRequestDto"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct DeleteProductRequestDto(
  [Required] string ProductName);
