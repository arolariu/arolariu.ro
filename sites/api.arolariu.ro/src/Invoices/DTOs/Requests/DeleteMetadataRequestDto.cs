namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Data transfer object for deleting metadata entries from an invoice.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Removes specified metadata keys from an invoice's additional metadata collection.</para>
/// <para><b>Behavior:</b> Non-existent keys are silently ignored (idempotent operation).</para>
/// </remarks>
/// <param name="Keys">Collection of metadata keys to remove.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct DeleteMetadataRequestDto(
  [Required] IEnumerable<string> Keys);
