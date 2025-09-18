namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

using System;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// Contract for core (foundation layer) invoice analysis operations (pure domain enrichment without orchestration side-effects).
/// </summary>
/// <remarks>
/// <para><b>Role in Architecture:</b> This foundation service applies deterministic / idempotent domain transformations to an <see cref="Invoice"/> based on
/// supplied <see cref="AnalysisOptions"/>. It MUST NOT:
/// <list type="bullet">
///   <item><description>Trigger external side-effects (persistence, messaging, notifications).</description></item>
///   <item><description>Perform cross-aggregate coordination or multi-entity transactions.</description></item>
///   <item><description>Contain retry / resilience logic for remote dependencies (handled in higher layers).</description></item>
/// </list></para>
/// <para><b>The Standard Alignment:</b> Foundation services encapsulate direct domain logic and validation. They throw domain or validation
/// exceptions that are wrapped by orchestration / processing layers into higher-order classification exceptions.</para>
/// <para><b>Thread-Safety:</b> Implementations SHOULD be stateless or treat internal state as immutable to allow concurrent usage.</para>
/// <para><b>Idempotency:</b> For identical input invoice + options, the output SHOULD be semantically identical (pure function expectation).</para>
/// </remarks>
public interface IInvoiceAnalysisFoundationService
{
  /// <summary>
  /// Performs domain-level analysis / enrichment on a single invoice instance.
  /// </summary>
  /// <remarks>
  /// <para><b>Behavior:</b> Applies classification, summarization, tagging or normalization steps indicated by <paramref name="options"/> and returns a
  /// new (or mutated, depending on implementation) enriched <see cref="Invoice"/> instance.</para>
  /// <para><b>Validation:</b> Implementations SHOULD validate option flags and invoice structural integrity (e.g., non-null collections, monetary value ranges).</para>
  /// <para><b>Side Effects:</b> None outside the returned object graph. No persistence, caching, or network calls (if external AI / OCR calls are required
  /// they belong in a broker invoked by an orchestration / processing layer).</para>
  /// </remarks>
  /// <param name="options">Analysis directives (which enrichment / inference steps to apply).</param>
  /// <param name="invoice">Target invoice aggregate to analyze (MUST NOT be null; MUST satisfy basic invariants).</param>
  /// <returns>Task producing the analyzed <see cref="Invoice"/> (never null if successful).</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="invoice"/> or <paramref name="options"/> is null.</exception>
  /// <exception cref="InvalidOperationException">Thrown when invoice state violates required preconditions for analysis.</exception>
  Task<Invoice> AnalyzeInvoiceAsync(AnalysisOptions options, Invoice invoice);
}
