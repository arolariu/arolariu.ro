namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

/// <summary>
/// Validates and normalizes client-owned invoice metadata patch entries.
/// </summary>
/// <remarks>
/// The policy is intentionally separate from outbound projection. Client patches may only target the explicitly
/// supported <c>user.</c>, <c>custom.</c>, and <c>import.</c> namespaces, and may only carry JSON scalar values.
/// Server-owned analysis and workflow metadata is immutable through this transport boundary.
/// </remarks>
internal static class InvoiceMetadataPatchPolicy
{
  private const int MaximumEntryCount = 32;
  private const int MaximumKeyLength = 96;
  private const int MaximumStringValueLength = 1024;

  internal static IReadOnlyDictionary<string, object?> ValidateAndNormalize(
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
