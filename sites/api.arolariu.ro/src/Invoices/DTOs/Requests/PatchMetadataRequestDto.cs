namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

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
  private const int MaximumEntryCount = 32;
  private const int MaximumKeyLength = 96;
  private const int MaximumStringValueLength = 1024;

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
  public void Validate() => _ = ValidateAndNormalize(Entries);

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

    Dictionary<string, object?> normalizedEntries =
      ValidateAndNormalize(Entries);

    foreach ((string key, object? value) in normalizedEntries)
    {
      existingMetadata[key] = value!;
    }
  }

  private static Dictionary<string, object?> ValidateAndNormalize(
    IDictionary<string, object>? entries)
  {
    if (entries is null || entries.Count == 0)
    {
      throw new InvoiceMetadataValidationException("At least one metadata entry is required.");
    }

    if (entries.Count > MaximumEntryCount)
    {
      throw new InvoiceMetadataValidationException("A metadata patch can contain at most 32 entries.");
    }

    var normalizedEntries = new Dictionary<string, object?>(entries.Count, StringComparer.Ordinal);

    foreach ((string key, object value) in entries)
    {
      ValidateKey(key);
      normalizedEntries.Add(key, NormalizeScalarValue(value));
    }

    return normalizedEntries;
  }

  private static void ValidateKey(string? key)
  {
    if (string.IsNullOrWhiteSpace(key)
      || key.Length > MaximumKeyLength
      || key != key.Trim()
      || !HasSupportedNamespace(key)
      || !HasSupportedKeyCharacters(key))
    {
      throw new InvoiceMetadataValidationException(
        "Metadata keys must use a supported client namespace and contain only safe identifier characters.");
    }
  }

  private static bool HasSupportedNamespace(string key) =>
    key.StartsWith("user.", StringComparison.Ordinal)
    || key.StartsWith("custom.", StringComparison.Ordinal)
    || key.StartsWith("import.", StringComparison.Ordinal);

  private static bool HasSupportedKeyCharacters(string key)
  {
    foreach (char character in key)
    {
      if (!char.IsAsciiLetterOrDigit(character)
        && character is not '.' and not '_' and not '-')
      {
        return false;
      }
    }

    return true;
  }

  private static object? NormalizeScalarValue(object? value)
  {
    if (value is JsonElement jsonElement)
    {
      return NormalizeJsonScalar(jsonElement);
    }

    return value switch
    {
      null => null,
      string text when text.Length <= MaximumStringValueLength && !LooksLikeSensitiveTransportValue(text) => text,
      bool boolean => boolean,
      byte or sbyte or short or ushort or int or uint or long or ulong or decimal => value,
      float number when float.IsFinite(number) => number,
      double number when double.IsFinite(number) => number,
      _ => throw new InvoiceMetadataValidationException(
        "Metadata values must be null, strings, booleans, or finite numeric scalars."),
    };
  }

  private static object? NormalizeJsonScalar(JsonElement jsonElement) =>
    jsonElement.ValueKind switch
    {
      JsonValueKind.Null => null,
      JsonValueKind.String => NormalizeString(jsonElement),
      JsonValueKind.True => true,
      JsonValueKind.False => false,
      JsonValueKind.Number => NormalizeNumber(jsonElement),
      _ => throw new InvoiceMetadataValidationException(
        "Metadata values must be null, strings, booleans, or finite numeric scalars."),
    };

  private static string NormalizeString(JsonElement jsonElement)
  {
    string value = jsonElement.GetString() ?? string.Empty;

    if (value.Length > MaximumStringValueLength)
    {
      throw new InvoiceMetadataValidationException("Metadata string values must not exceed 1024 characters.");
    }

    if (LooksLikeSensitiveTransportValue(value))
    {
      throw new InvoiceMetadataValidationException("Metadata values must not contain transport credentials.");
    }

    return value;
  }

  private static object NormalizeNumber(JsonElement jsonElement)
  {
    if (jsonElement.TryGetInt64(out long integralValue))
    {
      return integralValue;
    }

    double floatingValue = jsonElement.GetDouble();

    if (!double.IsFinite(floatingValue))
    {
      throw new InvoiceMetadataValidationException("Metadata numeric values must be finite.");
    }

    return floatingValue;
  }

  private static bool LooksLikeSensitiveTransportValue(string value) =>
    value.Contains("sig=", StringComparison.OrdinalIgnoreCase)
    || value.Contains("token=", StringComparison.OrdinalIgnoreCase)
    || value.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
    || value.StartsWith("eyJ", StringComparison.Ordinal);
}
