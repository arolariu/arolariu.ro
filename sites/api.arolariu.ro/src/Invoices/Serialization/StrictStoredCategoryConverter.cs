namespace arolariu.Backend.Domain.Invoices.Serialization;

using System;
using System.Globalization;

using Newtonsoft.Json;

/// <summary>Enforces numeric-or-null categories in the Cosmos SDK's Newtonsoft JSON documents.</summary>
internal sealed class StrictStoredCategoryConverter<TCategory> : JsonConverter<TCategory?>
  where TCategory : struct, Enum
{
  public override TCategory? ReadJson(
    JsonReader reader, Type objectType, TCategory? existingValue, bool hasExistingValue, JsonSerializer serializer)
  {
    if (reader.TokenType == JsonToken.Null) return null;

    if (reader.TokenType == JsonToken.Integer)
    {
      int? id = reader.Value switch
      {
        int value => value,
        long value when value is >= int.MinValue and <= int.MaxValue => (int)value,
        _ => null,
      };

      if (id is int number && Enum.IsDefined(typeof(TCategory), number))
      {
        return (TCategory)Enum.ToObject(typeof(TCategory), number);
      }
    }

    throw new JsonSerializationException($"Expected a numeric {typeof(TCategory).Name} ID or null.");
  }

  public override void WriteJson(JsonWriter writer, TCategory? value, JsonSerializer serializer)
  {
    if (value is not TCategory category)
    {
      writer.WriteNull();
      return;
    }

    if (!Enum.IsDefined(category))
    {
      throw new JsonSerializationException($"Undefined {typeof(TCategory).Name} ID.");
    }

    writer.WriteValue(Convert.ToInt32(category, CultureInfo.InvariantCulture));
  }
}
