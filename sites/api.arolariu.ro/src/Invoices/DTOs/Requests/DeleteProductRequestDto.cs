namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Data transfer object for deleting a product from an invoice.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Identifies a product for removal by its raw name.</para>
/// <para><b>Identification:</b> Products are uniquely identified within an invoice by their <see cref="ProductName"/>.</para>
/// </remarks>
/// <param name="ProductName">The raw name of the product to delete.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct DeleteProductRequestDto(
  [Required] string ProductName);
