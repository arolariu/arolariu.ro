namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

/// <summary>
/// Describes the overall preparation difficulty of a recipe suggestion.
/// </summary>
public enum RecipeDifficulty
{
  /// <summary>Suitable for quick or low-complexity preparation.</summary>
  Easy,

  /// <summary>Requires moderate time, planning, or technique.</summary>
  Medium,

  /// <summary>Requires advanced preparation effort or technique.</summary>
  Hard,
}
