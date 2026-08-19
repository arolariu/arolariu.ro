namespace arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

/// <summary>
/// Defines deterministic foundation-layer receipt extraction over one or more invoice scans.
/// </summary>
/// <remarks>
/// <para>
/// This service coordinates only the broker-neighboring document-extraction phase. It does not
/// persist aggregates, call AI classifiers, or rewire existing endpoint flows.
/// </para>
/// <para>
/// Implementations MUST analyze all scans concurrently, merge deterministically by input order,
/// preserve transient confidence, and classify exceptions according to the analysis foundation
/// exception taxonomy.
/// </para>
/// </remarks>
public interface IDocumentAnalysisFoundationService
{
  /// <summary>
  /// Extracts a merged typed receipt result from the supplied scan collection.
  /// </summary>
  /// <param name="scans">The ordered invoice scans to analyze.</param>
  /// <param name="cancellationToken">The cancellation token that aborts extraction.</param>
  /// <returns>The merged typed extraction result.</returns>
  Task<ReceiptExtractionResult> ExtractInvoiceAsync(
    IReadOnlyList<InvoiceScan> scans,
    CancellationToken cancellationToken);
}
