namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

/// <summary>
/// Enumerates the EU-14 allergens supported by the invoices analysis pipeline.
/// </summary>
/// <remarks>
/// <para>This taxonomy intentionally mirrors the regulated EU-14 list only.</para>
/// <para>Do not add convenience aliases such as <c>Lactose</c>, <c>Dairy</c>, or <c>Shellfish</c>; those concepts must map to canonical EU-14 members instead.</para>
/// </remarks>
public enum AllergenCode
{
  /// <summary>Cereals containing gluten.</summary>
  CerealsContainingGluten,

  /// <summary>Crustaceans.</summary>
  Crustaceans,

  /// <summary>Eggs.</summary>
  Eggs,

  /// <summary>Fish.</summary>
  Fish,

  /// <summary>Peanuts.</summary>
  Peanuts,

  /// <summary>Soybeans.</summary>
  Soybeans,

  /// <summary>Milk.</summary>
  Milk,

  /// <summary>Tree nuts.</summary>
  Nuts,

  /// <summary>Celery.</summary>
  Celery,

  /// <summary>Mustard.</summary>
  Mustard,

  /// <summary>Sesame seeds.</summary>
  Sesame,

  /// <summary>Sulphur dioxide and sulphites.</summary>
  SulphurDioxideAndSulphites,

  /// <summary>Lupin.</summary>
  Lupin,

  /// <summary>Molluscs.</summary>
  Molluscs,
}
