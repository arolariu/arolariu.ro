namespace arolariu.Backend.Domain.Invoices;

using System;
using System.Collections.Concurrent;
using System.Collections.Frozen;
using System.Collections.Generic;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Linq;

using arolariu.Backend.Common.Telemetry.Metering;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

/// <summary>
/// Defines custom OTel metric instruments for the Invoices bounded context using the RED method
/// (Rate, Errors, Duration) to enable SLA/QoS computation.
/// </summary>
/// <remarks>
/// <para>
/// All instruments use outcome-tagged dimensions so SLI can be computed as:
/// <c>success_rate = sum(counter{outcome=success}) / sum(counter{outcome=*})</c>
/// </para>
/// <para>
/// Instrument naming follows OTel semantic conventions:
/// </para>
/// <list type="bullet">
///   <item><c>invoices.operations</c> — Invoice/merchant CRUD rate with outcome + operation tags</item>
///   <item><c>invoices.operations.duration</c> — CRUD latency distribution</item>
///   <item><c>invoices.analysis.queue.depth</c> — Durable analysis queue depth by target type</item>
///   <item><c>invoices.analysis.queue.wait</c> — Time an analysis run waited in queue before being claimed</item>
///   <item><c>invoices.analysis.runs</c> — Analysis run completions with outcome</item>
///   <item><c>invoices.analysis.run.duration</c> — Analysis run latency distribution</item>
///   <item><c>invoices.analysis.lease.recovered</c> — Runs recovered from an expired worker lease</item>
///   <item><c>invoices.analysis.lease.lost</c> — Runs whose in-flight lease could not be renewed</item>
///   <item><c>invoices.analysis.capability.outcomes</c> — Analysis capability invocations with outcome</item>
///   <item><c>invoices.analysis.capability.duration</c> — Analysis capability latency distribution</item>
///   <item><c>invoices.analysis.capability.retries</c> — Transient-failure retry attempts per capability</item>
///   <item><c>invoices.analysis.capability.content_filter</c> — AI content filter/refusal events</item>
///   <item><c>invoices.analysis.capability.invalid_structured_output</c> — Structured output validation failures</item>
///   <item><c>invoices.analysis.taxonomy.validation_failures</c> — Taxonomy code validation failures</item>
///   <item><c>invoices.analysis.tokens.input</c> / <c>invoices.analysis.tokens.output</c> — Non-sensitive token usage</item>
///   <item><c>invoices.analysis.cost.estimated</c> — Estimated generative model cost in USD, never billing truth</item>
///   <item><c>invoices.cosmosdb.request_charge</c> — Cosmos DB RU cost distribution (includes the <c>analysisRuns</c> container)</item>
/// </list>
/// <para>
/// <b>Confidentiality:</b> every analysis instrument in this class accepts only bounded, non-sensitive dimension
/// values — <see cref="AnalysisTargetType"/>, <see cref="AnalysisCapability"/>, <see cref="AnalysisOutcome"/>,
/// <see cref="AnalysisFailureReason"/>, and <see cref="ClassificationSystem"/> enums converted internally to fixed
/// snake_case tag strings; catalog-owned schema, prompt, taxonomy, and pricing versions; allowlisted model
/// identifiers; and numeric counts. No instrument accepts product names, merchant names, OCR text, scan URLs,
/// prompts, provider-controlled model identifiers, or model responses. See
/// <c>AnalysisTelemetryTests.AnalysisMetricMethods_NeverAcceptSensitiveParameters</c> for the enforcing reflection guard.
/// </para>
/// </remarks>
public static class InvoiceMetrics
{
  private static readonly Meter Meter = MeterGenerators.InvoiceMeter;

  private const string TargetTypeTag = "target_type";
  private const string CapabilityTag = "capability";
  private const string OutcomeTag = "outcome";
  private const string FailureReasonTag = "failure.reason";
  private const string UnknownTag = "unknown";
  private const string ModelIdTag = "model.id";
  private const string SchemaVersionTag = "schema.version";
  private const string PromptVersionTag = "prompt.version";
  private const string TaxonomyVersionTag = "taxonomy.version";
  private const string PricingVersionTag = "pricing.version";
  private const decimal TokensPerMillion = 1_000_000m;

  /// <summary>
  /// The operator-selected Azure AI Foundry deployment that may appear in analysis telemetry.
  /// </summary>
  /// <remarks>
  /// Provider response identifiers are intentionally not accepted as telemetry dimensions: an unexpected value
  /// maps to <c>unknown</c> so a provider cannot create unbounded metric or log cardinality.
  /// </remarks>
  internal const string ConfiguredGenerativeModelIdentifier = "model-router";

  /// <summary>
  /// An explicitly priced underlying model identifier that may appear in generative provider responses.
  /// </summary>
  internal const string Gpt4oMiniModelIdentifier = "gpt-4o-mini";

  // Pricing source: OpenAI API Pricing, https://openai.com/api/pricing/ (accessed 2026-08-17).
  // Version: the explicit public standard-token rates captured on that date; USD estimates are not billing truth.
  private static readonly FrozenDictionary<string, GenerativeModelPricing> GenerativeModelPricingCatalog =
    new Dictionary<string, GenerativeModelPricing>(StringComparer.Ordinal)
    {
      [Gpt4oMiniModelIdentifier] = new(
        PricingVersion: "openai-api-pricing-2026-08-17",
        InputUsdPerMillionTokens: 0.15m,
        OutputUsdPerMillionTokens: 0.60m),
    }
    .ToFrozenDictionary(StringComparer.Ordinal);

  #region RED — Operations (Rate, Errors, Duration)

  /// <summary>
  /// Counts invoice and merchant operations with outcome and operation-type dimensions.
  /// Tags: <c>operation</c> (create, read, update, delete, soft_delete, analyze), <c>entity</c> (invoice, merchant), <c>outcome</c> (success, failure), optionally <c>failure.reason</c>.
  /// </summary>
  public static readonly Counter<long> Operations =
    Meter.CreateCounter<long>("invoices.operations", "operations", "Invoice/merchant operations with outcome.");

  /// <summary>
  /// Duration of invoice and merchant operations in milliseconds.
  /// Tags: <c>operation</c> (create, read, update, delete, soft_delete, analyze), <c>entity</c> (invoice, merchant), <c>outcome</c> (success, failure), optionally <c>failure.reason</c>.
  /// </summary>
  public static readonly Histogram<double> OperationDuration =
    Meter.CreateHistogram<double>("invoices.operations.duration", "ms", "Invoice/merchant operation duration.");

  /// <summary>
  /// Records a completed operation with outcome and optional duration.
  /// </summary>
  /// <param name="operation">The operation type (create, read, update, delete, soft_delete, analyze).</param>
  /// <param name="entity">The entity type (invoice, merchant).</param>
  /// <param name="outcome">The outcome (success, failure).</param>
  /// <param name="durationMs">Optional duration in milliseconds. When provided, also records a histogram observation.</param>
  /// <param name="failureReason">Optional failure reason tag (validation, dependency, service).</param>
  public static void RecordOperation(string operation, string entity, string outcome, double? durationMs = null, string? failureReason = null)
  {
    var tags = new TagList
    {
      { "operation", operation },
      { "entity", entity },
      { "outcome", outcome },
    };

    if (failureReason is not null)
    {
      tags.Add("failure.reason", failureReason);
    }

    Operations.Add(1, tags);

    if (durationMs.HasValue)
    {
      OperationDuration.Record(durationMs.Value, tags);
    }
  }

  /// <summary>Counts legacy synchronous analysis operations during the migration window.</summary>
  public static readonly Counter<long> Analyses =
    Meter.CreateCounter<long>(
      "invoices.analysis",
      "analyses",
      "Invoice analysis operations with outcome.");

  /// <summary>Records legacy synchronous analysis duration during the migration window.</summary>
  public static readonly Histogram<double> AnalysisDuration =
    Meter.CreateHistogram<double>(
      "invoices.analysis.duration",
      "ms",
      "Invoice analysis operation duration.");

  /// <summary>Counts legacy content-filter triggers until the old broker is retired.</summary>
  public static readonly Counter<long> ContentFilterTriggered =
    Meter.CreateCounter<long>(
      "invoices.analysis.content_filter.triggered",
      "events",
      "AI content filter trigger events.");

  /// <summary>Records a legacy synchronous analysis result during migration.</summary>
  public static void RecordAnalysis(
    string outcome,
    double durationMs,
    string? failureReason = null)
  {
    var tags = new TagList { { OutcomeTag, outcome } };
    if (failureReason is not null)
    {
      tags.Add(FailureReasonTag, failureReason);
    }

    Analyses.Add(1, tags);
    AnalysisDuration.Record(durationMs, tags);
  }

  #endregion

  #region Analysis Pipeline — Queue Telemetry

  /// <summary>
  /// The most recent durable pending-run count per target type, published by whichever worker last polled the
  /// durable store. Keyed by the bounded <c>target_type</c> tag value.
  /// </summary>
  private static readonly ConcurrentDictionary<string, QueueDepthSample> AnalysisQueueDepthSnapshot = new(StringComparer.Ordinal);
  private static readonly TimeSpan DefaultQueueDepthMaximumAge = TimeSpan.FromMinutes(1);

  /// <summary>
  /// Current depth of the durable analysis run queue (runs awaiting a worker: queued, or running with an expired
  /// lease). Tags: <c>target_type</c> (invoice, merchant, product).
  /// </summary>
  /// <remarks>
  /// <para>This is an <see cref="ObservableGauge{T}"/> fed by an actual count of the durable Cosmos store, not a
  /// process-local <c>UpDownCounter</c> of increments and decrements. That distinction is load-bearing: the API
  /// instance that accepts a run and the worker instance that claims it are different processes, so per-process
  /// deltas never reconcile — each exporter would publish its own partial sum, the aggregate would drift with
  /// every reclaim, and individual instances would report negative depth. A gauge sampling the shared durable
  /// state is the only representation that actually measures the documented quantity under multi-instance
  /// execution.</para>
  /// <para>Callbacks report only a fresh snapshot published through
  /// <see cref="PublishAnalysisQueueDepth(AnalysisTargetType, long)"/>; a target type is only reported once a
  /// real count has been observed for it, so the gauge never fabricates a zero for an unpolled queue. Expired
  /// samples are omitted rather than exported indefinitely as a misleading current depth.</para>
  /// </remarks>
  public static readonly ObservableGauge<long> AnalysisQueueDepth =
    Meter.CreateObservableGauge(
      "invoices.analysis.queue.depth",
      ObserveAnalysisQueueDepth,
      "messages",
      "Current depth of the analysis message queue.");

  /// <summary>
  /// Count of analysis messages accepted into the queue.
  /// Tags: <c>target_type</c> (invoice, merchant, product).
  /// </summary>
  public static readonly Counter<long> AnalysisMessagesQueued =
    Meter.CreateCounter<long>("invoices.analysis.queue.enqueued", "messages", "Analysis messages accepted into the queue.");

  /// <summary>
  /// Time an analysis message waited in queue before being received by a worker, in milliseconds.
  /// Tags: <c>target_type</c> (invoice, merchant, product).
  /// </summary>
  public static readonly Histogram<double> AnalysisQueueWaitDuration =
    Meter.CreateHistogram<double>("invoices.analysis.queue.wait", "ms", "Time an analysis message waited before being received.");

  /// <summary>
  /// Records an analysis message being accepted into the queue.
  /// </summary>
  /// <param name="targetType">The analysis target type.</param>
  public static void RecordAnalysisMessageQueued(AnalysisTargetType targetType) =>
    AnalysisMessagesQueued.Add(1, new KeyValuePair<string, object?>(TargetTypeTag, ToTag(targetType)));

  /// <summary>
  /// Records an analysis message leaving the queue because a worker received it, along with how
  /// long it waited.
  /// </summary>
  /// <param name="targetType">The analysis target type.</param>
  /// <param name="waitDurationMs">How long the message waited in queue before being received, in milliseconds.</param>
  public static void RecordAnalysisMessageReceived(AnalysisTargetType targetType, double waitDurationMs) =>
    AnalysisQueueWaitDuration.Record(waitDurationMs, new KeyValuePair<string, object?>(TargetTypeTag, ToTag(targetType)));

  /// <summary>
  /// Publishes an observed pending-message count so the queue-depth gauge reports real store state.
  /// </summary>
  /// <param name="targetType">The analysis target type the count belongs to.</param>
  /// <param name="pendingMessageCount">The number of messages awaiting a worker for that target type.</param>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="pendingMessageCount"/> is negative.</exception>
  public static void PublishAnalysisQueueDepth(AnalysisTargetType targetType, long pendingMessageCount)
    => PublishAnalysisQueueDepth(targetType, pendingMessageCount, DateTimeOffset.UtcNow, DefaultQueueDepthMaximumAge);

  /// <summary>
  /// Publishes an observed pending-message count with an explicit bounded-freshness window.
  /// </summary>
  /// <param name="targetType">The analysis target type the count belongs to.</param>
  /// <param name="pendingMessageCount">The number of messages awaiting a worker for that target type.</param>
  /// <param name="observedAt">The instant the durable count was observed.</param>
  /// <param name="maximumAge">How long the observable gauge may report this count.</param>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="pendingMessageCount"/> is negative or <paramref name="maximumAge"/> is not positive.</exception>
  internal static void PublishAnalysisQueueDepth(
    AnalysisTargetType targetType,
    long pendingMessageCount,
    DateTimeOffset observedAt,
    TimeSpan maximumAge)
  {
    ArgumentOutOfRangeException.ThrowIfNegative(pendingMessageCount);
    ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(maximumAge, TimeSpan.Zero);
    AnalysisQueueDepthSnapshot[ToTag(targetType)] = new QueueDepthSample(pendingMessageCount, observedAt.Add(maximumAge));
  }

  /// <summary>
  /// Clears every published queue-depth snapshot.
  /// </summary>
  /// <remarks>Exposed so tests can assert gauge behaviour from a known-empty state without leaking across cases.</remarks>
  public static void ResetAnalysisQueueDepth() => AnalysisQueueDepthSnapshot.Clear();

  private static IEnumerable<Measurement<long>> ObserveAnalysisQueueDepth() =>
    AnalysisQueueDepthSnapshot
      .Where(entry => entry.Value.ExpiresAt > DateTimeOffset.UtcNow)
      .Select(entry =>
        new Measurement<long>(entry.Value.PendingRunCount, new KeyValuePair<string, object?>(TargetTypeTag, entry.Key)));

  /// <summary>
  /// Captures one durable queue-depth observation and the deadline after which it must no longer be exported.
  /// </summary>
  /// <param name="PendingRunCount">The pending message count from the queue.</param>
  /// <param name="ExpiresAt">The instant after which the gauge omits this sample.</param>
  private sealed record QueueDepthSample(long PendingRunCount, DateTimeOffset ExpiresAt);

  #endregion

  #region Analysis Pipeline — Message Telemetry

  /// <summary>
  /// Counts terminal analysis message outcomes.
  /// Tags: <c>target_type</c> (invoice, merchant, product), <c>outcome</c> (success, partial, failure), optionally <c>failure.reason</c>.
  /// </summary>
  public static readonly Counter<long> AnalysisMessageOutcomes =
    Meter.CreateCounter<long>("invoices.analysis.messages", "messages", "Analysis message completions with outcome.");

  /// <summary>
  /// Duration of an analysis message attempt, in milliseconds.
  /// Tags: <c>target_type</c>, <c>outcome</c>, optionally <c>failure.reason</c>.
  /// </summary>
  public static readonly Histogram<double> AnalysisMessageDuration =
    Meter.CreateHistogram<double>("invoices.analysis.message.duration", "ms", "Analysis message attempt duration.");

  /// <summary>
  /// Total number of analysis runs recovered from an expired worker lease.
  /// Tags: <c>target_type</c>, <c>attempt</c> (recovery attempt count).
  /// </summary>
  public static readonly Counter<long> AnalysisLeaseRecovered =
    Meter.CreateCounter<long>("invoices.analysis.lease.recovered", "events", "Analysis messages recovered after visibility expiration.");

  /// <summary>
  /// Total number of analysis runs whose in-flight worker lease could no longer be renewed.
  /// Tags: <c>target_type</c>.
  /// </summary>
  public static readonly Counter<long> AnalysisLeaseLost =
    Meter.CreateCounter<long>("invoices.analysis.lease.lost", "events", "Analysis messages whose visibility could not be renewed.");

  /// <summary>
  /// Records the terminal outcome and duration of an analysis message attempt.
  /// </summary>
  /// <param name="targetType">The analysis target type.</param>
  /// <param name="outcome">The terminal outcome.</param>
  /// <param name="durationMs">Duration in milliseconds from claim to completion.</param>
  /// <param name="failureReason">Optional bounded failure reason.</param>
  public static void RecordAnalysisMessageOutcome(
    AnalysisTargetType targetType,
    AnalysisOutcome outcome,
    double durationMs,
    AnalysisFailureReason? failureReason = null)
  {
    var tags = new TagList { { TargetTypeTag, ToTag(targetType) }, { OutcomeTag, ToTag(outcome) } };
    if (failureReason.HasValue)
    {
      tags.Add(FailureReasonTag, ToTag(failureReason.Value));
    }

    AnalysisMessageOutcomes.Add(1, tags);
    AnalysisMessageDuration.Record(durationMs, tags);
  }

  /// <summary>
  /// Records the recovery of an analysis message whose previous visibility timeout expired.
  /// </summary>
  /// <param name="targetType">The analysis target type.</param>
  /// <param name="attemptCount">The message dequeue count after recovery.</param>
  public static void RecordAnalysisLeaseRecovered(AnalysisTargetType targetType, int attemptCount) =>
    AnalysisLeaseRecovered.Add(1, new TagList { { TargetTypeTag, ToTag(targetType) }, { "attempt", attemptCount } });

  /// <summary>
  /// Records an in-flight analysis run losing its worker lease because renewal failed.
  /// </summary>
  /// <param name="targetType">The analysis target type.</param>
  public static void RecordAnalysisLeaseLost(AnalysisTargetType targetType) =>
    AnalysisLeaseLost.Add(1, new KeyValuePair<string, object?>(TargetTypeTag, ToTag(targetType)));

  #endregion

  #region Analysis Pipeline — Capability Telemetry

  /// <summary>
  /// Counts terminal outcomes of individual analysis capability invocations.
  /// Tags: <c>capability</c> (analysis capability enum), <c>outcome</c> (success, failure), optionally <c>failure.reason</c>.
  /// </summary>
  public static readonly Counter<long> CapabilityOutcomes =
    Meter.CreateCounter<long>("invoices.analysis.capability.outcomes", "invocations", "Analysis capability invocations with outcome.");

  /// <summary>
  /// Duration of an analysis capability invocation, in milliseconds.
  /// Tags: <c>capability</c>, <c>outcome</c>, optionally <c>failure.reason</c>.
  /// </summary>
  public static readonly Histogram<double> CapabilityDuration =
    Meter.CreateHistogram<double>("invoices.analysis.capability.duration", "ms", "Analysis capability invocation duration.");

  /// <summary>
  /// Total number of transient-failure retry attempts for an analysis capability call.
  /// Tags: <c>capability</c>, <c>attempt</c> (1-based retry attempt number).
  /// </summary>
  public static readonly Counter<long> CapabilityRetries =
    Meter.CreateCounter<long>("invoices.analysis.capability.retries", "attempts", "Transient-failure retry attempts for an analysis capability call.");

  /// <summary>
  /// Total number of AI content filter or refusal events for an analysis capability call.
  /// Tags: <c>capability</c>.
  /// </summary>
  public static readonly Counter<long> CapabilityContentFilterOrRefusal =
    Meter.CreateCounter<long>("invoices.analysis.capability.content_filter", "events", "AI content filter or refusal events for an analysis capability.");

  /// <summary>
  /// Total number of structured output validation failures for an analysis capability call.
  /// Tags: <c>capability</c>.
  /// </summary>
  public static readonly Counter<long> CapabilityInvalidStructuredOutput =
    Meter.CreateCounter<long>("invoices.analysis.capability.invalid_structured_output", "events", "Structured output validation failures for an analysis capability.");

  /// <summary>
  /// Records the terminal outcome and duration of a single analysis capability invocation.
  /// </summary>
  /// <param name="capability">The analysis capability.</param>
  /// <param name="outcome">The outcome.</param>
  /// <param name="durationMs">Duration in milliseconds.</param>
  /// <param name="failureReason">Optional bounded failure reason.</param>
  public static void RecordCapabilityOutcome(
    AnalysisCapability capability,
    AnalysisOutcome outcome,
    double durationMs,
    AnalysisFailureReason? failureReason = null)
  {
    var tags = new TagList { { CapabilityTag, ToTag(capability) }, { OutcomeTag, ToTag(outcome) } };
    if (failureReason.HasValue)
    {
      tags.Add(FailureReasonTag, ToTag(failureReason.Value));
    }

    CapabilityOutcomes.Add(1, tags);
    CapabilityDuration.Record(durationMs, tags);
  }

  /// <summary>
  /// Records a transient-failure retry attempt for an analysis capability call.
  /// </summary>
  /// <param name="capability">The analysis capability.</param>
  /// <param name="attempt">The 1-based retry attempt number.</param>
  public static void RecordCapabilityRetry(AnalysisCapability capability, int attempt) =>
    CapabilityRetries.Add(1, new TagList { { CapabilityTag, ToTag(capability) }, { "attempt", attempt } });

  /// <summary>
  /// Records an AI content filter or refusal event for an analysis capability call.
  /// </summary>
  /// <param name="capability">The analysis capability.</param>
  public static void RecordCapabilityContentFilterOrRefusal(AnalysisCapability capability) =>
    CapabilityContentFilterOrRefusal.Add(1, new KeyValuePair<string, object?>(CapabilityTag, ToTag(capability)));

  /// <summary>
  /// Records a structured output validation failure for an analysis capability call.
  /// </summary>
  /// <param name="capability">The analysis capability.</param>
  public static void RecordCapabilityInvalidStructuredOutput(AnalysisCapability capability) =>
    CapabilityInvalidStructuredOutput.Add(1, new KeyValuePair<string, object?>(CapabilityTag, ToTag(capability)));

  #endregion

  #region Analysis Pipeline — Taxonomy Telemetry

  /// <summary>
  /// Total number of taxonomy code validation failures encountered during analysis or manual classification.
  /// Tags: <c>system</c> (classification system identifier).
  /// </summary>
  public static readonly Counter<long> TaxonomyValidationFailures =
    Meter.CreateCounter<long>("invoices.analysis.taxonomy.validation_failures", "events", "Taxonomy code validation failures during analysis or manual selection.");

  /// <summary>
  /// Records a taxonomy code validation failure.
  /// </summary>
  /// <param name="classificationSystem">The classification system whose code failed validation.</param>
  public static void RecordTaxonomyValidationFailure(ClassificationSystem classificationSystem) =>
    TaxonomyValidationFailures.Add(1, new KeyValuePair<string, object?>("system", ToTag(classificationSystem)));

  #endregion

  #region Analysis Pipeline — Token Telemetry

  /// <summary>
  /// Distribution of input token counts consumed by generative analysis capability calls.
  /// Tags: <c>capability</c>, <c>model.id</c>, <c>schema.version</c>, <c>prompt.version</c>,
  /// <c>taxonomy.version</c>, <c>outcome</c>.
  /// </summary>
  public static readonly Histogram<long> InputTokens =
    Meter.CreateHistogram<long>("invoices.analysis.tokens.input", "tokens", "Input token count consumed by a generative analysis capability call.");

  /// <summary>
  /// Distribution of output token counts produced by generative analysis capability calls.
  /// Tags: <c>capability</c>, <c>model.id</c>, <c>schema.version</c>, <c>prompt.version</c>,
  /// <c>taxonomy.version</c>, <c>outcome</c>.
  /// </summary>
  public static readonly Histogram<long> OutputTokens =
    Meter.CreateHistogram<long>("invoices.analysis.tokens.output", "tokens", "Output token count produced by a generative analysis capability call.");

  /// <summary>
  /// Estimated USD cost for a completed generative analysis capability call with a fully reported token pair and an
  /// explicitly priced underlying model. Tags: <c>capability</c>, <c>model.id</c>, <c>schema.version</c>,
  /// <c>prompt.version</c>, <c>taxonomy.version</c>, <c>pricing.version</c>, <c>outcome</c>.
  /// </summary>
  /// <remarks>
  /// <para>The value is a deterministic pre-tax USD estimate, calculated from the versioned finite pricing catalog
  /// in this class. It is deliberately omitted for <c>model-router</c>, unknown provider models, missing or partial
  /// usage, and negative counts; it must never be interpreted as an invoice or provider billing record.</para>
  /// <para>The calculation uses decimal token rates and no culture-sensitive parsing. The maximum possible
  /// <see cref="long"/> token count remains safely within <see cref="decimal"/> range at the catalog's rates.</para>
  /// </remarks>
  public static readonly Histogram<double> EstimatedGenerativeCostUsd =
    Meter.CreateHistogram<double>(
      "invoices.analysis.cost.estimated",
      "USD",
      "Estimated generative model cost in USD; not provider billing truth.");

  /// <summary>
  /// Records non-sensitive input/output token usage for a completed generative analysis capability call, and an
  /// estimated cost only when a complete usage pair and a priced underlying model are available.
  /// </summary>
  /// <param name="telemetryMetadata">The trusted bounded capability, schema, prompt, and taxonomy metadata.</param>
  /// <param name="modelId">The normalized bounded generative model identifier.</param>
  /// <param name="inputTokens">The input token count, when available.</param>
  /// <param name="outputTokens">The output token count, when available.</param>
  internal static void RecordTokenUsage(
    GenerativeTelemetryMetadata telemetryMetadata,
    string modelId,
    long? inputTokens,
    long? outputTokens)
  {
    string boundedModelId = ToTelemetryModelIdentifier(modelId);
    TagList tokenTags = CreateGenerativeUsageTags(telemetryMetadata, boundedModelId);

    if (inputTokens.HasValue)
    {
      InputTokens.Record(inputTokens.Value, tokenTags);
    }

    if (outputTokens.HasValue)
    {
      OutputTokens.Record(outputTokens.Value, tokenTags);
    }

    if (TryCalculateEstimatedCostUsd(
      boundedModelId,
      inputTokens,
      outputTokens,
      out double estimatedCostUsd,
      out string? pricingVersion))
    {
      TagList costTags = CreateGenerativeUsageTags(telemetryMetadata, boundedModelId);
      costTags.Add(PricingVersionTag, pricingVersion);
      EstimatedGenerativeCostUsd.Record(estimatedCostUsd, costTags);
    }
  }

  #endregion

  #region Analysis Pipeline — Bounded Tag Conversion

  /// <summary>
  /// Maps an analysis target type onto its bounded, low-cardinality metric tag value.
  /// </summary>
  /// <param name="targetType">The analysis target type.</param>
  /// <returns>The bounded tag value.</returns>
  internal static string ToTag(AnalysisTargetType targetType) => targetType switch
  {
    AnalysisTargetType.Invoice => "invoice",
    AnalysisTargetType.Merchant => "merchant",
    AnalysisTargetType.Product => "product",
    _ => UnknownTag,
  };

  /// <summary>
  /// Maps a provider-reported model identifier onto the finite analysis telemetry dimension.
  /// </summary>
  /// <param name="modelId">The provider-reported model identifier, when supplied.</param>
  /// <returns>The configured deployment identifier or <c>unknown</c>.</returns>
  internal static string ToTelemetryModelIdentifier(string? modelId) =>
    modelId switch
    {
      ConfiguredGenerativeModelIdentifier => ConfiguredGenerativeModelIdentifier,
      Gpt4oMiniModelIdentifier => Gpt4oMiniModelIdentifier,
      _ => UnknownTag,
    };

  /// <summary>
  /// Maps an analysis capability onto its bounded, low-cardinality metric tag value.
  /// </summary>
  /// <param name="capability">The analysis capability.</param>
  /// <returns>The bounded tag value.</returns>
  internal static string ToTag(AnalysisCapability capability) => capability switch
  {
    AnalysisCapability.DocumentExtraction => "document_extraction",
    AnalysisCapability.MerchantResolution => "merchant_resolution",
    AnalysisCapability.InvoiceSummary => "invoice_summary",
    AnalysisCapability.ProductClassification => "product_classification",
    AnalysisCapability.AllergenAssessment => "allergen_assessment",
    AnalysisCapability.InvoiceClassification => "invoice_classification",
    AnalysisCapability.RecipeGeneration => "recipe_generation",
    AnalysisCapability.MerchantClassification => "merchant_classification",
    AnalysisCapability.DescriptionGeneration => "description_generation",
    _ => UnknownTag,
  };

  /// <summary>
  /// Maps an analysis outcome onto its bounded, low-cardinality metric tag value.
  /// </summary>
  /// <param name="outcome">The analysis outcome.</param>
  /// <returns>The bounded tag value.</returns>
  internal static string ToTag(AnalysisOutcome outcome) => outcome switch
  {
    AnalysisOutcome.Success => "success",
    AnalysisOutcome.Partial => "partial",
    AnalysisOutcome.Failure => "failure",
    _ => UnknownTag,
  };

  /// <summary>
  /// Maps an analysis failure reason onto its bounded, low-cardinality metric tag value.
  /// </summary>
  /// <param name="failureReason">The analysis failure reason.</param>
  /// <returns>The bounded tag value.</returns>
  internal static string ToTag(AnalysisFailureReason failureReason) => failureReason switch
  {
    AnalysisFailureReason.Validation => "validation",
    AnalysisFailureReason.Dependency => "dependency",
    AnalysisFailureReason.DependencyValidation => "dependency_validation",
    AnalysisFailureReason.Service => "service",
    AnalysisFailureReason.ContentFilter => "content_filter",
    AnalysisFailureReason.InvalidStructuredOutput => "invalid_structured_output",
    AnalysisFailureReason.Taxonomy => "taxonomy",
    AnalysisFailureReason.LeaseLost => "lease_lost",
    AnalysisFailureReason.TargetPersistence => "target_persistence",
    AnalysisFailureReason.UnsupportedTarget => "unsupported_target",
    _ => UnknownTag,
  };

  /// <summary>
  /// Maps a classification system onto its bounded, low-cardinality metric tag value.
  /// </summary>
  /// <param name="classificationSystem">The classification system.</param>
  /// <returns>The bounded tag value.</returns>
  internal static string ToTag(ClassificationSystem classificationSystem) => classificationSystem switch
  {
    ClassificationSystem.Gs1Gpc => "gs1_gpc",
    ClassificationSystem.EcoicopV2 => "ecoicop_v2",
    ClassificationSystem.Nace21 => "nace_2_1",
    _ => UnknownTag,
  };

  #endregion

  private static TagList CreateGenerativeUsageTags(
    GenerativeTelemetryMetadata telemetryMetadata,
    string boundedModelId) =>
    new()
    {
      { CapabilityTag, ToTag(telemetryMetadata.Capability) },
      { ModelIdTag, boundedModelId },
      { SchemaVersionTag, telemetryMetadata.SchemaVersion },
      { PromptVersionTag, telemetryMetadata.PromptVersion },
      { TaxonomyVersionTag, telemetryMetadata.TaxonomyVersion },
      { OutcomeTag, "success" },
    };

  private static bool TryCalculateEstimatedCostUsd(
    string boundedModelId,
    long? inputTokens,
    long? outputTokens,
    out double estimatedCostUsd,
    out string? pricingVersion)
  {
    estimatedCostUsd = 0d;
    pricingVersion = null;

    if (inputTokens is not long inputTokenCount
      || outputTokens is not long outputTokenCount
      || inputTokenCount < 0
      || outputTokenCount < 0
      || !GenerativeModelPricingCatalog.TryGetValue(boundedModelId, out GenerativeModelPricing pricing))
    {
      return false;
    }

    decimal estimatedUsd =
      ((decimal)inputTokenCount / TokensPerMillion * pricing.InputUsdPerMillionTokens)
      + ((decimal)outputTokenCount / TokensPerMillion * pricing.OutputUsdPerMillionTokens);

    if (estimatedUsd < 0m)
    {
      return false;
    }

    estimatedCostUsd = (double)estimatedUsd;
    pricingVersion = pricing.PricingVersion;
    return true;
  }

  /// <summary>
  /// Holds one provider model's finite, versioned, per-million-token USD rates.
  /// </summary>
  /// <param name="PricingVersion">The source-date version of the rate card.</param>
  /// <param name="InputUsdPerMillionTokens">The input-token USD rate per one million tokens.</param>
  /// <param name="OutputUsdPerMillionTokens">The output-token USD rate per one million tokens.</param>
  private readonly record struct GenerativeModelPricing(
    string PricingVersion,
    decimal InputUsdPerMillionTokens,
    decimal OutputUsdPerMillionTokens);

  #region Cosmos DB Cost Metrics

  /// <summary>
  /// Distribution of Cosmos DB request unit (RU) consumption per operation.
  /// Tags: <c>db.operation</c>, <c>db.cosmosdb.container</c>.
  /// </summary>
  public static readonly Histogram<double> CosmosDbRequestCharge =
    Meter.CreateHistogram<double>("invoices.cosmosdb.request_charge", "RU", "Cosmos DB request unit consumption per operation.");

  /// <summary>
  /// Records a Cosmos DB request charge with standard dimensional tags.
  /// </summary>
  public static void RecordCosmosDbCharge(double requestCharge, string operation, string container)
  {
    CosmosDbRequestCharge.Record(requestCharge, new KeyValuePair<string, object?>("db.operation", operation), new KeyValuePair<string, object?>("db.cosmosdb.container", container));
  }

  #endregion
}
