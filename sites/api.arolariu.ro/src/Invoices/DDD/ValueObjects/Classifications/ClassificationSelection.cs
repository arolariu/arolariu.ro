namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System;

/// <summary>
/// Represents a minimal caller selection awaiting canonical taxonomy resolution.
/// </summary>
[Serializable]
public sealed record ClassificationSelection
{
  /// <summary>
  /// Initializes a validated taxonomy selection.
  /// </summary>
  /// <param name="system">The selected taxonomy system.</param>
  /// <param name="code">The selected non-empty taxonomy code.</param>
  public ClassificationSelection(ClassificationSystem system, string code)
  {
    System = system;
    Code = ClassificationContracts.RequireText(code, nameof(code));
  }

  /// <summary>Gets the selected taxonomy system.</summary>
  public ClassificationSystem System { get; }

  /// <summary>Gets the normalized selected taxonomy code.</summary>
  public string Code { get; }
}
