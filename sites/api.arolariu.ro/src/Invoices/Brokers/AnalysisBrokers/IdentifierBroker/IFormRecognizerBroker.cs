namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;

using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// Thin OCR (document intelligence) broker abstraction for extracting structured invoice signals (merchant identity, line items, payment data)
/// from a raw scanned image / PDF using Azure Form Recognizer (Document Intelligence) prebuilt models.
/// </summary>
/// <remarks>
/// <para><b>Role (Broker Standard):</b> Wraps a single external SDK (<c>DocumentAnalysisClient</c>) and exposes a minimal, task-oriented
/// operation. No business validation, persistence, enrichment orchestration, retry policy, telemetry, or authorization logic is performed here.</para>
/// <para><b>Scope:</b> Currently targets the Azure prebuilt receipt model (<c>prebuilt-receipt</c>). Future enhancement may introduce:
/// custom-trained models, adaptive model routing, multi-page aggregation, locale normalization, or confidence-based filtering.</para>
/// <para><b>Output Semantics:</b> The supplied <see cref="Invoice"/> instance is returned (same reference or mutated clone in implementations)
/// with merchant reference, line item collection, and payment information populated when recognizable. Unrecognized fields remain at sentinel defaults.
/// Implementations MUST avoid throwing for partial extraction failure — only catastrophic / argument errors should escape.</para>
/// <para><b>Thread Safety:</b> Implementations are expected to be registered as scoped services; underlying Azure SDK clients are thread-safe.</para>
/// <para><b>Performance Considerations:</b> OCR latency dominates; callers SHOULD parallelize across invoices externally when bulk importing.
/// Consider upstream caching / deduplication for identical source images.</para>
/// <para><b>Backlog:</b> Cancellation token support, confidence threshold filtering, partial page segmentation, raw field provenance exposure,
/// and metrics hooks (latency, pages, confidence distribution).</para>
/// </remarks>
public interface IFormRecognizerBroker
{
	/// <summary>
	/// Performs optical character recognition + structural field extraction on a single invoice scan and projects results into the provided aggregate.
	/// </summary>
	/// <remarks>
	/// <para><b>Mutation:</b> The passed <paramref name="invoice"/> instance is enriched in-place (merchant, items, payment, metadata hooks)
	/// and then returned. Callers requiring immutability SHOULD clone prior to invocation.</para>
	/// <para><b>Model:</b> Uses the Azure prebuilt receipt model (identifier: <c>prebuilt-receipt</c>). This may evolve; callers SHOULD NOT hard‑code assumptions
	/// about recognition fidelity or field naming beyond domain mapping provided here.</para>
	/// <para><b>Failure Handling:</b> Argument null results in <see cref="System.ArgumentNullException"/>. Provider / transport exceptions bubble for higher-layer
	/// classification (retry / circuit breaker). Partial extraction never throws.</para>
	/// <para><b>Options:</b> The <paramref name="options"/> parameter allows higher orchestration to toggle OCR participation within a larger enrichment pipeline.</para>
	/// </remarks>
	/// <param name="invoice">Target invoice aggregate to enrich (MUST NOT be null; MUST have initialized collections).</param>
	/// <param name="options">Analysis directives controlling which enrichment phases are active (broker may short-circuit when disabled).</param>
	/// <returns>The enriched invoice aggregate (same instance reference).</returns>
	/// <exception cref="System.ArgumentNullException">Thrown when <paramref name="invoice"/> is null.</exception>
	ValueTask<Invoice> PerformOcrAnalysisOnSingleInvoice(Invoice invoice, AnalysisOptions options);
}
