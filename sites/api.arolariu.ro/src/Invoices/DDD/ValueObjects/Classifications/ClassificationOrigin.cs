namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Describes how a canonical standard classification value entered the invoice analysis workflow.
/// </summary>
/// <remarks>
/// <para>Origin controls confidence rules on <see cref="StandardClassification"/>.</para>
/// <para>Manual selections are authoritative human choices, while analysis selections come from automated inference and therefore require confidence.</para>
/// </remarks>
public enum ClassificationOrigin
{
  /// <summary>Classification produced by automated analysis.</summary>
  Analysis,

  /// <summary>Classification selected or corrected manually by a user or operator.</summary>
  Manual,
}
