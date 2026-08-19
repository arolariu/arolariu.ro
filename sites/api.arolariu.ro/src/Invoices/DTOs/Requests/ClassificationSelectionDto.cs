namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Accepts a manual taxonomy selection without caller-controlled canonical metadata.
/// </summary>
/// <param name="System">The selected taxonomy system.</param>
/// <param name="Code">The selected taxonomy code.</param>
[Serializable]
public readonly record struct ClassificationSelectionDto(
  ClassificationSystem System,
  string Code)
{
  /// <summary>
  /// Converts the request contract to validated domain mutation input.
  /// </summary>
  /// <returns>A normalized classification selection.</returns>
  public ClassificationSelection ToSelection() => new(System, Code);
}
