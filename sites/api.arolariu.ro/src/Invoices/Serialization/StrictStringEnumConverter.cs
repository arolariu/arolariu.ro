namespace arolariu.Backend.Domain.Invoices.Serialization;

using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

/// <summary>
/// Converts enum values using only their explicitly declared JSON wire names.
/// </summary>
/// <remarks>
/// <para>
/// Every member of <typeparamref name="TEnum"/> must declare a non-empty
/// <see cref="JsonStringEnumMemberNameAttribute"/>, and wire names must be unique.
/// Reads use ordinal, case-sensitive matching; null, numeric, enum member-name, and
/// unknown string representations are rejected.
/// </para>
/// <para>
/// Writes reject undefined numeric enum values rather than emitting unstable names.
/// The converter is stateless; lookup dictionaries are populated once and never mutated
/// for each closed generic enum type.
/// </para>
/// </remarks>
/// <typeparam name="TEnum">
/// The enum whose explicit <see cref="JsonStringEnumMemberNameAttribute"/> values define
/// the complete wire contract.
/// </typeparam>
/// <example>
/// <code>
/// [JsonConverter(typeof(StrictStringEnumConverter&lt;Status&gt;))]
/// public enum Status
/// {
///   [JsonStringEnumMemberName("ready")]
///   Ready
/// }
///
/// string json = JsonSerializer.Serialize(Status.Ready); // "ready"
/// </code>
/// </example>
public sealed class StrictStringEnumConverter<TEnum> : JsonConverter<TEnum>
  where TEnum : struct, Enum
{
  private static readonly Dictionary<TEnum, string> WireNamesByValue = CreateWireNamesByValue();
  private static readonly Dictionary<string, TEnum> ValuesByWireName = CreateValuesByWireName();

  /// <summary>
  /// Reads an enum from an exact, explicitly declared JSON string.
  /// </summary>
  /// <param name="reader">The reader positioned at the enum JSON token.</param>
  /// <param name="typeToConvert">The enum type requested by the serializer.</param>
  /// <param name="options">The serializer options for the current operation.</param>
  /// <returns>The enum value mapped to the exact wire name.</returns>
  /// <exception cref="JsonException">
  /// Thrown when the token is not a non-null string or the string is not a declared
  /// wire name.
  /// </exception>
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

  /// <summary>
  /// Writes the explicit JSON wire name for a defined enum value.
  /// </summary>
  /// <param name="writer">The writer that receives the string token.</param>
  /// <param name="value">The defined enum value to serialize.</param>
  /// <param name="options">The serializer options for the current operation.</param>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="writer"/> is <see langword="null"/>.
  /// </exception>
  /// <exception cref="JsonException">
  /// Thrown when <paramref name="value"/> is not a defined enum member.
  /// </exception>
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
