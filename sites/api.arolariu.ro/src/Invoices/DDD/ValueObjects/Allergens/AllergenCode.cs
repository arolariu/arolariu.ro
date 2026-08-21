namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>
/// Enumerates the EU-14 allergens supported by the invoices analysis pipeline.
/// </summary>
/// <remarks>
/// <para>This taxonomy intentionally mirrors the regulated EU-14 list only.</para>
/// <para>Do not add convenience aliases such as <c>Lactose</c>, <c>Dairy</c>, or <c>Shellfish</c>; those concepts must map to canonical EU-14 members instead.</para>
/// </remarks>
[JsonConverter(typeof(StrictStringEnumConverter<AllergenCode>))]
public enum AllergenCode
{
  /// <summary>Cereals containing gluten.</summary>
  [JsonStringEnumMemberName("cerealsContainingGluten")]
  CerealsContainingGluten,

  /// <summary>Crustaceans.</summary>
  [JsonStringEnumMemberName("crustaceans")]
  Crustaceans,

  /// <summary>Eggs.</summary>
  [JsonStringEnumMemberName("eggs")]
  Eggs,

  /// <summary>Fish.</summary>
  [JsonStringEnumMemberName("fish")]
  Fish,

  /// <summary>Peanuts.</summary>
  [JsonStringEnumMemberName("peanuts")]
  Peanuts,

  /// <summary>Soybeans.</summary>
  [JsonStringEnumMemberName("soybeans")]
  Soybeans,

  /// <summary>Milk.</summary>
  [JsonStringEnumMemberName("milk")]
  Milk,

  /// <summary>Tree nuts.</summary>
  [JsonStringEnumMemberName("nuts")]
  Nuts,

  /// <summary>Celery.</summary>
  [JsonStringEnumMemberName("celery")]
  Celery,

  /// <summary>Mustard.</summary>
  [JsonStringEnumMemberName("mustard")]
  Mustard,

  /// <summary>Sesame seeds.</summary>
  [JsonStringEnumMemberName("sesame")]
  Sesame,

  /// <summary>Sulphur dioxide and sulphites.</summary>
  [JsonStringEnumMemberName("sulphurDioxideAndSulphites")]
  SulphurDioxideAndSulphites,

  /// <summary>Lupin.</summary>
  [JsonStringEnumMemberName("lupin")]
  Lupin,

  /// <summary>Molluscs.</summary>
  [JsonStringEnumMemberName("molluscs")]
  Molluscs,
}
