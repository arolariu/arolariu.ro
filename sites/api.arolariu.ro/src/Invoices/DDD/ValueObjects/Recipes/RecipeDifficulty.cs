namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>
/// Describes the overall preparation difficulty of a recipe suggestion.
/// </summary>
[JsonConverter(typeof(StrictStringEnumConverter<RecipeDifficulty>))]
public enum RecipeDifficulty
{
  /// <summary>Suitable for quick or low-complexity preparation.</summary>
  [JsonStringEnumMemberName("easy")]
  Easy,

  /// <summary>Requires moderate time, planning, or technique.</summary>
  [JsonStringEnumMemberName("medium")]
  Medium,

  /// <summary>Requires advanced preparation effort or technique.</summary>
  [JsonStringEnumMemberName("hard")]
  Hard,
}
