namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

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
/// <b>Key Naming Convention:</b> Keys should follow a dotted namespace pattern
/// for organization and to avoid collisions:
/// <list type="bullet">
///   <item><description><c>ai.confidence</c>: AI-generated confidence scores.</description></item>
///   <item><description><c>ai.extractionDate</c>: When AI analysis was performed.</description></item>
///   <item><description><c>user.note</c>: User-provided annotations.</description></item>
///   <item><description><c>import.source</c>: Data source for imported invoices.</description></item>
/// </list>
/// </para>
/// <para>
/// <b>Value Types:</b> Supports strings, numbers (int/double), booleans, and null.
/// Complex objects should be serialized to JSON strings.
/// </para>
/// </remarks>
/// <param name="Entries">
/// Dictionary of metadata entries to add or update. Required.
/// Keys must be non-empty strings. Values are converted from <see cref="JsonElement"/>
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
  /// Applies the metadata entries to an existing metadata dictionary.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>In-Place Modification:</b> This method modifies the provided dictionary
  /// directly. The original <see cref="Entries"/> from this DTO are not modified.
  /// </para>
  /// <para>
  /// <b>JsonElement Conversion:</b> When receiving data from HTTP requests, values
  /// may arrive as <see cref="JsonElement"/>. This method automatically converts
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
    foreach (var (key, value) in Entries)
    {
      // Convert JsonElement to native types for proper serialization
      existingMetadata[key] = ConvertJsonElement(value);
    }
  }

  /// <summary>
  /// Converts a <see cref="JsonElement"/> to its native .NET type.
  /// </summary>
  /// <remarks>
  /// <para>
  /// Handles conversion of JSON deserialized values to their appropriate .NET
  /// representations for storage and subsequent serialization.
  /// </para>
  /// <para>
  /// <b>Number Handling:</b> Attempts integer conversion first (as <see cref="Int64"/>),
  /// falling back to <see cref="Double"/> for decimal values.
  /// </para>
  /// </remarks>
  /// <param name="value">
  /// The value to convert. If not a <see cref="JsonElement"/>, returned as-is.
  /// </param>
  /// <returns>
  /// The converted native type (string, long, double, bool, or raw JSON text).
  /// </returns>
  private static object ConvertJsonElement(object value)
  {
    if (value is not JsonElement jsonElement)
    {
      return value;
    }

    return jsonElement.ValueKind switch
    {
      JsonValueKind.String => jsonElement.GetString() ?? string.Empty,
      JsonValueKind.Number => jsonElement.TryGetInt64(out var longValue) ? longValue : jsonElement.GetDouble(),
      JsonValueKind.True => true,
      JsonValueKind.False => false,
      JsonValueKind.Null => null!,
      _ => jsonElement.GetRawText()
    };
  }
}
