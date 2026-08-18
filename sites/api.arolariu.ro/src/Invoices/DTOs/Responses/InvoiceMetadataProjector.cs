namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;

/// <summary>
/// Projects invoice metadata into its safe public transport representation.
/// </summary>
/// <remarks>
/// <para>
/// This is the single outbound metadata boundary for the Invoices bounded context. It copies only scalar values and
/// rejects operational, analysis, credential, and transport-secret keys before an API response is serialized.
/// </para>
/// <para>
/// <b>Confidentiality:</b> The projector deliberately excludes raw OCR, prompts, model responses, run identifiers,
/// leases, SAS values, credentials, tokens, and internal keys. It does not mutate the source aggregate.
/// </para>
/// <para>
/// <b>Thread-safety:</b> This stateless class is thread-safe. Each projection returns an immutable snapshot.
/// </para>
/// </remarks>
public static class InvoiceMetadataProjector
{
  /// <summary>
  /// Creates an immutable, safe-scalar snapshot of invoice metadata for API consumers.
  /// </summary>
  /// <param name="additionalMetadata">
  /// The persisted metadata dictionary to project. Must not be null.
  /// </param>
  /// <returns>
  /// A read-only dictionary containing only public scalar metadata. Entries that are internal or non-scalar are
  /// omitted. The returned dictionary never aliases <paramref name="additionalMetadata"/>.
  /// </returns>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="additionalMetadata"/> is null.
  /// </exception>
  public static IReadOnlyDictionary<string, string?> CreatePublicSnapshot(
    IDictionary<string, object> additionalMetadata)
  {
    ArgumentNullException.ThrowIfNull(additionalMetadata);

    var snapshot = new Dictionary<string, string?>(additionalMetadata.Count, StringComparer.Ordinal);

    foreach ((string key, object value) in additionalMetadata)
    {
      if (IsPublicMetadataKey(key) && TryCreatePublicMetadataValue(value, out string? publicValue))
      {
        snapshot.TryAdd(key, publicValue);
      }
    }

    return new ReadOnlyDictionary<string, string?>(snapshot);
  }

  private static bool IsPublicMetadataKey(string? key)
  {
    if (string.IsNullOrWhiteSpace(key))
    {
      return false;
    }

    string normalizedKey = key
      .Replace("_", string.Empty, StringComparison.Ordinal)
      .Replace("-", string.Empty, StringComparison.Ordinal)
      .Replace(".", string.Empty, StringComparison.Ordinal)
      .ToUpperInvariant();

    return !normalizedKey.Contains("RAW", StringComparison.Ordinal)
      && !normalizedKey.Contains("OCR", StringComparison.Ordinal)
      && !normalizedKey.Contains("PROMPT", StringComparison.Ordinal)
      && !normalizedKey.Contains("RESPONSE", StringComparison.Ordinal)
      && !normalizedKey.Contains("LEASE", StringComparison.Ordinal)
      && !normalizedKey.Contains("ANALYSISRUN", StringComparison.Ordinal)
      && !normalizedKey.Contains("SOURCERUNID", StringComparison.Ordinal)
      && !normalizedKey.Contains("RUNID", StringComparison.Ordinal)
      && !normalizedKey.Contains("SECRET", StringComparison.Ordinal)
      && !normalizedKey.Contains("TOKEN", StringComparison.Ordinal)
      && !normalizedKey.Contains("CREDENTIAL", StringComparison.Ordinal)
      && !normalizedKey.Contains("CONNECTIONSTRING", StringComparison.Ordinal)
      && !normalizedKey.Contains("SAS", StringComparison.Ordinal)
      && !normalizedKey.Contains("INTERNAL", StringComparison.Ordinal);
  }

  private static bool TryCreatePublicMetadataValue(object? value, out string? publicValue)
  {
    switch (value)
    {
      case null:
        publicValue = null;
        return true;
      case string text when !LooksLikeSensitiveTransportValue(text):
        publicValue = text;
        return true;
      case bool boolean:
        publicValue = boolean.ToString(CultureInfo.InvariantCulture);
        return true;
      case byte number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case sbyte number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case short number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case ushort number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case int number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case uint number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case long number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case ulong number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case float number when float.IsFinite(number):
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case double number when double.IsFinite(number):
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case decimal number:
        publicValue = number.ToString(CultureInfo.InvariantCulture);
        return true;
      case DateTime dateTime:
        publicValue = dateTime.ToString("O", CultureInfo.InvariantCulture);
        return true;
      case DateTimeOffset dateTimeOffset:
        publicValue = dateTimeOffset.ToString("O", CultureInfo.InvariantCulture);
        return true;
      case Guid identifier:
        publicValue = identifier.ToString("D");
        return true;
      default:
        publicValue = null;
        return false;
    }
  }

  private static bool LooksLikeSensitiveTransportValue(string value) =>
    value.Contains("sig=", StringComparison.OrdinalIgnoreCase)
    || value.Contains("token=", StringComparison.OrdinalIgnoreCase)
    || value.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
    || value.StartsWith("eyJ", StringComparison.Ordinal);
}
