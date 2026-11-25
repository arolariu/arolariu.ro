namespace arolariu.Backend.Domain.Invoices.Serialization;

using System;
using System.Text.Json;
using System.Text.Json.Serialization;

/// <summary>Reads and writes only numeric IDs defined by the category enum.</summary>
/// <typeparam name="TCategory">The category domain.</typeparam>
public sealed class StrictNumericCategoryConverter<TCategory> : JsonConverter<TCategory>
  where TCategory : struct, Enum
{
  /// <inheritdoc/>
  public override TCategory Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
  {
    if (reader.TokenType == JsonTokenType.Number && reader.TryGetInt32(out int id)
      && Enum.IsDefined(typeof(TCategory), id))
    {
      return (TCategory)Enum.ToObject(typeof(TCategory), id);
    }

    throw new JsonException($"Expected a numeric {typeof(TCategory).Name} ID.");
  }

  /// <inheritdoc/>
  public override void Write(Utf8JsonWriter writer, TCategory value, JsonSerializerOptions options)
  {
    ArgumentNullException.ThrowIfNull(writer);
    if (!Enum.IsDefined(value))
    {
      throw new JsonException($"Undefined {typeof(TCategory).Name} ID.");
    }

    writer.WriteNumberValue(Convert.ToInt32(value, System.Globalization.CultureInfo.InvariantCulture));
  }
}
