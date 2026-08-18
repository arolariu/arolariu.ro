namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using System;

/// <summary>
/// Captures a single evidence item that justified an automated or manual taxonomy classification.
/// </summary>
/// <remarks>
/// <para>Evidence items are immutable and preserve provenance data for later audit, UI explanation, or debugging.</para>
/// <para><b>Examples:</b> Product names, OCR text fragments, merchant hints, or explicit user-entered values.</para>
/// </remarks>
public sealed record ClassificationEvidence
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ClassificationEvidence"/> record.
  /// </summary>
  /// <param name="source">The evidence source identifier (for example: <c>product.name</c> or <c>merchant.category</c>).</param>
  /// <param name="value">The raw evidence value captured from the source.</param>
  /// <exception cref="ArgumentException">Thrown when any supplied text value is null, empty, or whitespace.</exception>
  public ClassificationEvidence(string source, string value)
  {
    Source = ClassificationContracts.RequireText(source, nameof(source));
    Value = ClassificationContracts.RequireText(value, nameof(value));
  }

  /// <summary>Gets the logical origin of the evidence item.</summary>
  public string Source { get; }

  /// <summary>Gets the raw evidence value captured from the source.</summary>
  public string Value { get; }
}
