namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using System.Globalization;

/// <summary>
/// Produces the stable per-line-item correlation tokens that bind transient analysis inputs to their results.
/// </summary>
/// <remarks>
/// <para>Line items are deliberately identity-free value objects, so the only durable link between an analysed product
/// and its classification or allergen assessment is its ordinal within the owning invoice. Both the orchestration layer
/// (which builds the analysis inputs) and the processing layer (which applies the results) MUST derive that token from
/// this single helper, otherwise results would silently fail to match.</para>
/// </remarks>
internal static class AnalysisCorrelationTokens
{
  /// <summary>
  /// Builds the correlation token for the line item at <paramref name="index"/>.
  /// </summary>
  /// <param name="index">The zero-based ordinal of the line item within its invoice.</param>
  /// <returns>The stable correlation token for the line item.</returns>
  internal static string ForProduct(int index) =>
    string.Create(CultureInfo.InvariantCulture, $"product-{index:D4}");
}
