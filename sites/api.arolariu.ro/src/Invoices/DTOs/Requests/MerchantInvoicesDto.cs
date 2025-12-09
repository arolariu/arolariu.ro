namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Data transfer object for managing invoice associations with a merchant.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Used for both adding and removing invoice references from a merchant.</para>
/// <para><b>Operations:</b>
/// <list type="bullet">
///   <item><description>PATCH: Adds the specified invoices to the merchant's reference list.</description></item>
///   <item><description>DELETE: Removes the specified invoices from the merchant's reference list.</description></item>
/// </list></para>
/// <para><b>Validation:</b> Invoice identifiers are validated for existence in the handler layer.</para>
/// </remarks>
/// <param name="InvoiceIdentifiers">Collection of invoice GUIDs to add or remove.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct MerchantInvoicesDto(
  [Required] IEnumerable<Guid> InvoiceIdentifiers);
