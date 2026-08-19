namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Request DTO for adding or updating metadata entries on an invoice.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Enables partial updates to an invoice's metadata collection
/// using HTTP PATCH semantics. Existing keys are overwritten; new keys are added.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Merge Strategy:</b> Uses "last writer wins" semantics. When a key already
/// exists, its value is replaced with the new value from this DTO.
/// </para>
/// <para>
/// <b>Confidentiality:</b> Only client-owned <c>user.</c>, <c>custom.</c>, and <c>import.</c> namespaces are
/// mutable. Server-owned OCR, prompt, response, workflow, run, lease, credential, token, and SAS metadata is
/// immutable through this endpoint.
/// </para>
/// <para>
/// <b>Value Types:</b> Supports null, strings, booleans, and finite numeric scalars only. Arrays and objects are
/// rejected rather than stored as raw JSON.
/// </para>
/// </remarks>
/// <param name="Entries">
/// Dictionary of metadata entries to add or update. Required.
/// Keys must be non-empty strings. Values are converted from <c>JsonElement</c>
/// to native types during processing.
/// </param>
/// <example>
/// <code>
/// var request = new PatchMetadataRequestDto(
///     Entries: new Dictionary&lt;string, object&gt;
///     {
///         ["user.note"] = "Important receipt for tax purposes",
///         ["ai.confidence"] = 0.95,
///         ["custom.projectId"] = "PROJ-2025-001"
///     });
///
/// request.ApplyTo(invoice.AdditionalMetadata);
/// </code>
/// </example>
/// <seealso cref="DeleteMetadataRequestDto"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct PatchMetadataRequestDto(
  [Required] IDictionary<string, object> Entries)
{
  /// <summary>
  /// Validates the complete metadata patch before any aggregate state is changed.
  /// </summary>
  /// <remarks>
  /// Validation applies the client namespace and scalar-value contract to every entry before a caller can mutate an
  /// existing metadata dictionary. It is safe to invoke repeatedly.
  /// </remarks>
  /// <exception cref="arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner.InvoiceMetadataValidationException">
  /// Thrown when any key or value lies outside the public metadata patch contract.
  /// </exception>
  public void Validate() => _ = InvoiceMetadataPatchPolicy.ValidateAndNormalize(Entries);

  /// <summary>
  /// Applies the metadata entries to an existing metadata dictionary.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>In-Place Modification:</b> This method modifies the provided dictionary
  /// directly. The original <see cref="Entries"/> from this DTO are not modified.
  /// </para>
  /// <para>
  /// <b>JsonElement Conversion:</b> When receiving data from HTTP requests, values
  /// may arrive as <c>JsonElement</c>. This method automatically converts
  /// them to native .NET types (string, long, double, bool) for proper storage.
  /// </para>
  /// </remarks>
  /// <param name="existingMetadata">
  /// The existing metadata dictionary to update. Must not be null.
  /// Will be modified in place with merged values.
  /// </param>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="existingMetadata"/> is null.
  /// </exception>
  public void ApplyTo(IDictionary<string, object> existingMetadata)
  {
    ArgumentNullException.ThrowIfNull(existingMetadata);

    IReadOnlyDictionary<string, object?> normalizedEntries =
      InvoiceMetadataPatchPolicy.ValidateAndNormalize(Entries);

    foreach ((string key, object? value) in normalizedEntries)
    {
      existingMetadata[key] = value!;
    }
  }
}
