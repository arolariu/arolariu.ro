namespace arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

/// <summary>
/// Converts a nullable immutable value object to and from its JSON representation.
/// </summary>
/// <typeparam name="T">The immutable reference type.</typeparam>
[ExcludeFromCodeCoverage]
public sealed class ValueConverterForValueObjectOf<T> : ValueConverter<T?, string>
  where T : class
{
  /// <summary>Initializes the JSON value converter.</summary>
  public ValueConverterForValueObjectOf() : base(
    value => ConvertToString(value),
    json => ConvertFromString(json))
  {
  }

  private static string ConvertToString(T? value) =>
    value is null ? string.Empty : JsonSerializer.Serialize(value);

  private static T? ConvertFromString(string json) =>
    string.IsNullOrWhiteSpace(json) ? null : JsonSerializer.Deserialize<T>(json);
}
