namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Text.Json;
using System.Text.Json.Serialization;

/// <summary>Represents an optional category update: preserve, clear, or assign.</summary>
/// <typeparam name="TCategory">The category enum for the resource being updated.</typeparam>
/// <remarks>The default value preserves the existing category. JSON null and numeric -1 clear it.</remarks>
[Serializable]
public readonly record struct CategoryUpdate<TCategory>
  where TCategory : struct, Enum
{
  /// <summary>The numeric clear alias accepted by category update requests only.</summary>
  public const int ClearValue = -1;

  private readonly TCategory? category;

  /// <summary>Creates an explicit category update.</summary>
  /// <param name="category">A category to assign, or null to clear the existing one.</param>
  /// <exception cref="ArgumentOutOfRangeException">The category is not a member of its enum.</exception>
  public CategoryUpdate(TCategory? category)
  {
    if (category is { } value && !Enum.IsDefined(value))
    {
      throw new ArgumentOutOfRangeException(nameof(category));
    }

    this.category = category;
    IsSpecified = true;
  }

  internal bool IsSpecified { get; }

  internal TCategory? ApplyTo(TCategory? current) => IsSpecified ? category : current;

  internal sealed class JsonConverter : JsonConverter<CategoryUpdate<TCategory>>
  {
    /// <inheritdoc/>
    public override CategoryUpdate<TCategory> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
      if (reader.TokenType == JsonTokenType.Null
        || (reader.TokenType == JsonTokenType.Number && reader.TryGetInt32(out int id) && id == ClearValue))
      {
        return new CategoryUpdate<TCategory>(null);
      }

      return new CategoryUpdate<TCategory>(JsonSerializer.Deserialize<TCategory>(ref reader, options));
    }

    /// <inheritdoc/>
    public override void Write(Utf8JsonWriter writer, CategoryUpdate<TCategory> value, JsonSerializerOptions options)
    {
      if (!value.IsSpecified)
      {
        throw new JsonException("An omitted category must not be written to JSON.");
      }

      JsonSerializer.Serialize(writer, value.category, options);
    }
  }
}
