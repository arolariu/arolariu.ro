namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System;

/// <summary>
/// Represents a single canonical node within a taxonomy hierarchy path.
/// </summary>
/// <remarks>
/// <para>Instances are immutable snapshots created from canonical taxonomy artifacts.</para>
/// <para><b>Hierarchy Role:</b> A node captures the level, code, and official label for one step in the resolved taxonomy path.</para>
/// </remarks>
public sealed record ClassificationNode
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ClassificationNode"/> record.
  /// </summary>
  /// <param name="level">Canonical taxonomy level (for example: <c>division</c>, <c>group</c>, or <c>class</c>).</param>
  /// <param name="code">Canonical taxonomy code for the hierarchy node.</param>
  /// <param name="officialLabel">Official taxonomy label for the hierarchy node.</param>
  /// <exception cref="ArgumentException">Thrown when any supplied text value is null, empty, or whitespace.</exception>
  public ClassificationNode(string level, string code, string officialLabel)
  {
    Level = ClassificationContracts.RequireText(level, nameof(level));
    Code = ClassificationContracts.RequireText(code, nameof(code));
    OfficialLabel = ClassificationContracts.RequireText(officialLabel, nameof(officialLabel));
  }

  /// <summary>Gets the canonical taxonomy level for this node.</summary>
  public string Level { get; }

  /// <summary>Gets the canonical taxonomy code for this node.</summary>
  public string Code { get; }

  /// <summary>Gets the canonical official label for this node.</summary>
  public string OfficialLabel { get; }
}
