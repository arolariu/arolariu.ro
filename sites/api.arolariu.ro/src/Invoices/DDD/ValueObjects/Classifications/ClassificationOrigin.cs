namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System.Text.Json.Serialization;
using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>Describes how a canonical classification entered the domain.</summary>
[JsonConverter(typeof(StrictStringEnumConverter<ClassificationOrigin>))]
public enum ClassificationOrigin
{
  /// <summary>Produced by automated analysis.</summary>
  [JsonStringEnumMemberName("Analysis")]
  Analysis,

  /// <summary>Selected or corrected manually.</summary>
  [JsonStringEnumMemberName("Manual")]
  Manual,
}
