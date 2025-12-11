namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Request DTO for removing metadata entries from an invoice.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Enables batch removal of metadata keys from an invoice's
/// <c>AdditionalMetadata</c> collection.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Idempotent Operation:</b> Non-existent keys are silently ignored.
/// The operation succeeds even if some or all specified keys don't exist.
/// </para>
/// <para>
/// <b>Use Cases:</b>
/// <list type="bullet">
///   <item><description>Cleaning up AI-generated metadata that is no longer relevant.</description></item>
///   <item><description>Removing user annotations or temporary processing flags.</description></item>
///   <item><description>Clearing sensitive data from metadata before sharing.</description></item>
/// </list>
/// </para>
/// </remarks>
/// <param name="Keys">
/// Collection of metadata keys to remove. Required.
/// Must contain at least one key. Keys should match the exact key strings
/// stored in the invoice's metadata (case-sensitive).
/// </param>
/// <example>
/// <code>
/// // Remove specific metadata keys
/// var request = new DeleteMetadataRequestDto(
///     Keys: new[] { "ai.rawExtraction", "temp.processingFlag" });
///
/// // Service layer handles the removal
/// foreach (var key in request.Keys)
/// {
///     invoice.AdditionalMetadata.Remove(key);
/// }
/// </code>
/// </example>
/// <seealso cref="PatchMetadataRequestDto"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct DeleteMetadataRequestDto(
  [Required] IEnumerable<string> Keys);
