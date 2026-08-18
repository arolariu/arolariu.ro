namespace arolariu.Backend.Domain.Invoices.Serialization;

using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

/// <summary>Serializes an enum exclusively through explicit JSON member names.</summary>
/// <typeparam name="TEnum">Enum whose declared JSON member names are enforced.</typeparam>
public sealed class StrictStringEnumConverter<TEnum> : JsonConverter<TEnum>
  where TEnum : struct, Enum
{
  private static readonly Dictionary<TEnum, string> WireNamesByValue = CreateWireNamesByValue();
  private static readonly Dictionary<string, TEnum> ValuesByWireName = CreateValuesByWireName();

  /// <inheritdoc />
  public override TEnum Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
  {
    if (reader.TokenType != JsonTokenType.String)
      throw new JsonException($"{typeof(TEnum).Name} must be represented by an explicit JSON string.");

    string wireName = reader.GetString()
      ?? throw new JsonException($"{typeof(TEnum).Name} must not be represented by a null JSON string.");

    return ValuesByWireName.TryGetValue(wireName, out TEnum value)
      ? value
      : throw new JsonException($"'{wireName}' is not a valid {typeof(TEnum).Name} JSON value.");
  }

  /// <inheritdoc />
  public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options)
  {
    ArgumentNullException.ThrowIfNull(writer);
    if (!WireNamesByValue.TryGetValue(value, out string? wireName))
      throw new JsonException($"'{value}' is not a defined {typeof(TEnum).Name} value.");

    writer.WriteStringValue(wireName);
  }

  private static Dictionary<TEnum, string> CreateWireNamesByValue()
  {
    var result = new Dictionary<TEnum, string>();
    foreach (TEnum value in Enum.GetValues<TEnum>())
    {
      string memberName = value.ToString();
      FieldInfo field = typeof(TEnum).GetField(memberName, BindingFlags.Public | BindingFlags.Static)
        ?? throw new InvalidOperationException($"{typeof(TEnum).Name}.{memberName} must be public.");
      JsonStringEnumMemberNameAttribute attribute = field.GetCustomAttribute<JsonStringEnumMemberNameAttribute>()
        ?? throw new InvalidOperationException($"{typeof(TEnum).Name}.{memberName} must declare a JSON wire name.");
      if (string.IsNullOrWhiteSpace(attribute.Name))
        throw new InvalidOperationException($"{typeof(TEnum).Name}.{memberName} must declare a non-empty JSON wire name.");
      result.Add(value, attribute.Name);
    }
    return result;
  }

  private static Dictionary<string, TEnum> CreateValuesByWireName()
  {
    var result = new Dictionary<string, TEnum>(StringComparer.Ordinal);
    foreach ((TEnum value, string wireName) in WireNamesByValue)
      if (!result.TryAdd(wireName, value))
        throw new InvalidOperationException($"'{wireName}' is declared more than once for {typeof(TEnum).Name}.");
    return result;
  }
}
