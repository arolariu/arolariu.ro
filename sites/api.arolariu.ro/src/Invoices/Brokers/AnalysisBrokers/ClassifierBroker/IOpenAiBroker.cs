namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;

using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// Broker contract for delegating invoice analysis / enrichment to Azure OpenAI (LLM) services.
/// </summary>
/// <remarks>
/// <para><b>Layer Role (The Standard):</b> A broker is a thin, test-isolated abstraction over an external dependency (here: Azure OpenAI).
/// It provides minimal translation (domain → API request / API response → domain) and surfaces provider-specific failures
/// as dependency / dependency validation exceptions (wrapping raw SDK exceptions in the concrete implementation).</para>
/// <para><b>Responsibilities:</b>
/// <list type="bullet">
///   <item><description>Accept a domain <see cref="Invoice"/> plus <see cref="AnalysisOptions"/> directives.</description></item>
///   <item><description>Invoke one or more model completions / chat interactions to enrich invoice fields (naming, categorization, tagging).</description></item>
///   <item><description>Return the mutated (or enriched) invoice aggregate to upstream foundation / processing services.</description></item>
/// </list></para>
/// <para><b>Exclusions:</b> No persistence, no multi-aggregate orchestration, no retry / circuit-breaker policy (handled by higher resilience layer or pipeline),
/// no business validation beyond basic null / shape checks.</para>
/// <para><b>Determinism and Idempotency:</b> LLM calls are non-deterministic; repeated invocations may yield different enrichment values. Upstream layers MUST decide
/// caching / freeze policies if consistency is required.</para>
/// <para><b>Performance and Cost:</b> Each enrichment call may consume tokens (billable). Implementations SHOULD batch prompts where feasible (backlog).</para>
/// </remarks>
public interface IOpenAiBroker
{
  /// <summary>
  /// Performs GPT-backed enrichment of a single <see cref="Invoice"/> aggregate according to supplied analysis options.
  /// </summary>
  /// <remarks>
  /// <para><b>Behavior:</b> Applies sequential LLM prompts (name, description, product category + allergens, invoice recipes, invoice category).
  /// Each failure (e.g. content filter) degrades gracefully by supplying an empty / default value so downstream processing can continue.</para>
  /// <para><b>Partial Failure Handling:</b> Individual prompt failures DO NOT abort the pipeline; missing enrichment fields are left empty / default.</para>
  /// <para><b>Thread Safety:</b> Implementations SHOULD treat the underlying client as thread-safe (AzureOpenAIClient is internally safe for concurrent usage).</para>
  /// </remarks>
  /// <param name="invoice">Invoice aggregate to enrich (MUST NOT be null; MUST have initialized product collection).</param>
  /// <param name="options">Directive flags controlling which enrichment operations execute (MUST NOT be null; may be extended in future).</param>
  /// <returns>Mutated (enriched) invoice instance (same reference or updated clone per implementation strategy).</returns>
  /// <exception cref="System.ArgumentNullException">Thrown when <paramref name="invoice"/> or <paramref name="options"/> is null.</exception>
  ValueTask<Invoice> PerformGptAnalysisOnSingleInvoice(Invoice invoice, AnalysisOptions options);
}
