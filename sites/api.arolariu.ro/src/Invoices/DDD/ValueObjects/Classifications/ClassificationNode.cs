namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System;

/// <summary>Represents one immutable node in a taxonomy hierarchy.</summary>
public sealed record ClassificationNode
{
  /// <summary>Initializes a canonical hierarchy node.</summary>
  public ClassificationNode(string level, string code, string officialLabel)
  {
    Level = ClassificationContracts.RequireText(level, nameof(level));
    Code = ClassificationContracts.RequireText(code, nameof(code));
    OfficialLabel = ClassificationContracts.RequireText(officialLabel, nameof(officialLabel));
  }

  /// <summary>Gets the taxonomy level.</summary>
  public string Level { get; }

  /// <summary>Gets the canonical code.</summary>
  public string Code { get; }

  /// <summary>Gets the official label.</summary>
  public string OfficialLabel { get; }
}
