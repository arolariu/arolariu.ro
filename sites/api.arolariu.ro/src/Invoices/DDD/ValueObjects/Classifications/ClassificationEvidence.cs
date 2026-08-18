namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System;

/// <summary>Captures one immutable classification evidence item.</summary>
public sealed record ClassificationEvidence
{
  /// <summary>Initializes an evidence item.</summary>
  public ClassificationEvidence(string source, string value)
  {
    Source = ClassificationContracts.RequireText(source, nameof(source));
    Value = ClassificationContracts.RequireText(value, nameof(value));
  }

  /// <summary>Gets the logical evidence source.</summary>
  public string Source { get; }

  /// <summary>Gets the evidence value.</summary>
  public string Value { get; }
}
