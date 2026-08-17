namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using NewtonsoftJson = Newtonsoft.Json;

/// <summary>
/// Represents a durable, queueable unit of work for the analysis pipeline: a single invocation of either
/// <see cref="InvoiceAnalysisOptions"/> or <see cref="MerchantAnalysisOptions"/> against one target aggregate,
/// tracked from acceptance through claim, lease renewal, and completion or failure.
/// </summary>
/// <remarks>
/// <para><b>Persistence:</b> Stored directly (no EF Core) in the dedicated <c>analysisRuns</c> Cosmos DB container,
/// partitioned by <see cref="Bucket"/> (single bucket, <c>"default"</c>, for the lifetime of this design). Every
/// property is decorated with both System.Text.Json and Newtonsoft.Json attributes because the shared
/// <c>CosmosClient</c> used by <c>CosmosAnalysisRunBroker</c> defaults to the Cosmos SDK's built-in Newtonsoft-based
/// serializer; the dual attributes keep the wire shape (camelCase, with Cosmos system properties <c>id</c>,
/// <c>_etag</c>, <c>ttl</c>) stable regardless of which serializer ultimately backs the client.</para>
/// <para><b>Concurrency:</b> <see cref="ETag"/> carries the Cosmos optimistic-concurrency token used by the broker's
/// conditional replace (<c>IfMatchEtag</c>) during lease claiming; last-write-wins semantics do NOT apply here —
/// a stale <see cref="ETag"/> must cause the caller to skip the candidate, not overwrite it.</para>
/// <para><b>Time to live:</b> <see cref="TimeToLiveSeconds"/> is left <c>null</c> for queued and running runs (never
/// expire mid-flight) and is set to <see cref="CompletionTimeToLiveSeconds"/> only once the run reaches a terminal
/// state (<see cref="AnalysisRunStatus.Completed"/> or <see cref="AnalysisRunStatus.Failed"/>).</para>
/// <para><b>Immutability:</b> All transitions (<see cref="Claim"/>, <see cref="RenewLease"/>, <see cref="Complete"/>,
/// <see cref="Fail"/>) return a new instance; the original is left unmodified.</para>
/// <para><b>Target partition context:</b> <see cref="TargetPartitionIdentifier"/> is set once, by
/// <see cref="CreateMerchant"/>, and carried unchanged through every transition (<see cref="Claim"/>,
/// <see cref="RenewLease"/>, <see cref="Complete"/>, <see cref="Fail"/>) because record <c>with</c>-expressions only
/// touch the properties they explicitly assign. It is always <c>null</c> for invoice runs.</para>
/// </remarks>
public sealed record AnalysisRun
{
  /// <summary>The single partition bucket used for this container while a single logical worker pool exists.</summary>
  public const string DefaultBucket = "default";

  /// <summary>Item time-to-live, in seconds, applied once a run reaches a terminal state (30 days).</summary>
  public const int CompletionTimeToLiveSeconds = 2_592_000;

  /// <summary>Gets the run's unique identifier (Cosmos document <c>id</c>).</summary>
  [JsonPropertyName("id")]
  [NewtonsoftJson.JsonProperty("id")]
  public required Guid Id { get; init; }

  /// <summary>Gets the partition bucket this run is stored under.</summary>
  [JsonPropertyName("bucket")]
  [NewtonsoftJson.JsonProperty("bucket")]
  public string Bucket { get; init; } = DefaultBucket;

  /// <summary>Gets the domain target type this run analyzes (invoice or merchant).</summary>
  [JsonPropertyName("targetType")]
  [NewtonsoftJson.JsonProperty("targetType")]
  [JsonConverter(typeof(JsonStringEnumConverter))]
  [NewtonsoftJson.JsonConverter(typeof(NewtonsoftJson.Converters.StringEnumConverter))]
  public required AnalysisTargetType TargetType { get; init; }

  /// <summary>Gets the identifier of the invoice or merchant aggregate this run analyzes.</summary>
  [JsonPropertyName("targetId")]
  [NewtonsoftJson.JsonProperty("targetId")]
  public required Guid TargetId { get; init; }

  /// <summary>
  /// Gets the partition/company scope of the target aggregate — the merchant's parent company identifier when
  /// <see cref="TargetType"/> is <see cref="AnalysisTargetType.Merchant"/>, or <see langword="null"/> for invoice
  /// runs (invoices are not partitioned by parent company).
  /// </summary>
  /// <remarks>
  /// Persisted verbatim so a worker-time point update against the merchant's partition (attaching analysis outcomes
  /// back onto the durable <c>Merchant</c> aggregate) does not need to re-resolve or re-validate the partition scope;
  /// the effective partition context is fixed at queue time, exactly like the resolved effective analysis options.
  /// <see cref="Guid.Empty"/> is a legitimate persisted value - it is the partition of every independent merchant,
  /// including every merchant auto-created during invoice analysis - and is distinct from <see langword="null"/>,
  /// which means "this run has no partition scope at all" (invoice runs).
  /// </remarks>
  [JsonPropertyName("targetPartitionIdentifier")]
  [NewtonsoftJson.JsonProperty("targetPartitionIdentifier", NullValueHandling = NewtonsoftJson.NullValueHandling.Ignore)]
  public Guid? TargetPartitionIdentifier { get; init; }

  /// <summary>Gets the identifier of the user who requested this analysis run.</summary>
  [JsonPropertyName("requestedBy")]
  [NewtonsoftJson.JsonProperty("requestedBy")]
  public required Guid RequestedBy { get; init; }

  /// <summary>Gets the correlation identifier linking this run to its originating request across retries and services.</summary>
  [JsonPropertyName("correlationId")]
  [NewtonsoftJson.JsonProperty("correlationId")]
  public Guid CorrelationId { get; init; }

  /// <summary>Gets the W3C <c>traceparent</c> value used to continue the distributed trace across the pipeline boundary, when supplied.</summary>
  [JsonPropertyName("traceParent")]
  [NewtonsoftJson.JsonProperty("traceParent", NullValueHandling = NewtonsoftJson.NullValueHandling.Ignore)]
  public string? TraceParent { get; init; }

  /// <summary>Gets the invoice analysis capability selection for this run, when <see cref="TargetType"/> is <see cref="AnalysisTargetType.Invoice"/>.</summary>
  [JsonPropertyName("invoiceOptions")]
  [NewtonsoftJson.JsonProperty("invoiceOptions", NullValueHandling = NewtonsoftJson.NullValueHandling.Ignore)]
  public InvoiceAnalysisOptions? InvoiceOptions { get; init; }

  /// <summary>Gets the merchant analysis capability selection for this run, when <see cref="TargetType"/> is <see cref="AnalysisTargetType.Merchant"/>.</summary>
  [JsonPropertyName("merchantOptions")]
  [NewtonsoftJson.JsonProperty("merchantOptions", NullValueHandling = NewtonsoftJson.NullValueHandling.Ignore)]
  public MerchantAnalysisOptions? MerchantOptions { get; init; }

  /// <summary>Gets the run's current lifecycle status.</summary>
  [JsonPropertyName("status")]
  [NewtonsoftJson.JsonProperty("status")]
  [JsonConverter(typeof(JsonStringEnumConverter))]
  [NewtonsoftJson.JsonConverter(typeof(NewtonsoftJson.Converters.StringEnumConverter))]
  public required AnalysisRunStatus Status { get; init; }

  /// <summary>Gets the number of times this run has been claimed (starts at zero for a freshly queued run).</summary>
  [JsonPropertyName("attemptCount")]
  [NewtonsoftJson.JsonProperty("attemptCount")]
  public int AttemptCount { get; init; }

  /// <summary>Gets the identifier of the worker currently holding the run's lease, when running.</summary>
  [JsonPropertyName("leaseOwner")]
  [NewtonsoftJson.JsonProperty("leaseOwner", NullValueHandling = NewtonsoftJson.NullValueHandling.Ignore)]
  public string? LeaseOwner { get; init; }

  /// <summary>Gets the instant the run's current lease expires, when running.</summary>
  [JsonPropertyName("leaseExpiresAt")]
  [NewtonsoftJson.JsonProperty("leaseExpiresAt", NullValueHandling = NewtonsoftJson.NullValueHandling.Ignore)]
  public DateTimeOffset? LeaseExpiresAt { get; init; }

  /// <summary>Gets the instant this run was accepted into the queue. Used to order claim candidates fairly (oldest first).</summary>
  [JsonPropertyName("acceptedAt")]
  [NewtonsoftJson.JsonProperty("acceptedAt")]
  public required DateTimeOffset AcceptedAt { get; init; }

  /// <summary>Gets the instant this run was first claimed by a worker, when it has been claimed at least once.</summary>
  [JsonPropertyName("startedAt")]
  [NewtonsoftJson.JsonProperty("startedAt", NullValueHandling = NewtonsoftJson.NullValueHandling.Ignore)]
  public DateTimeOffset? StartedAt { get; init; }

  /// <summary>Gets the instant this run completed successfully, when in a terminal completed state.</summary>
  [JsonPropertyName("completedAt")]
  [NewtonsoftJson.JsonProperty("completedAt", NullValueHandling = NewtonsoftJson.NullValueHandling.Ignore)]
  public DateTimeOffset? CompletedAt { get; init; }

  /// <summary>Gets the instant this run failed, when in a terminal failed state.</summary>
  [JsonPropertyName("failedAt")]
  [NewtonsoftJson.JsonProperty("failedAt", NullValueHandling = NewtonsoftJson.NullValueHandling.Ignore)]
  public DateTimeOffset? FailedAt { get; init; }

  /// <summary>Gets the capabilities that produced a usable result, populated once the run completes.</summary>
  [JsonPropertyName("completedCapabilities")]
  [NewtonsoftJson.JsonProperty("completedCapabilities")]
  public IReadOnlyCollection<AnalysisCapability> CompletedCapabilities { get; init; } = Array.Empty<AnalysisCapability>();

  /// <summary>Gets the stable failure code describing why this run failed, when in a terminal failed state.</summary>
  [JsonPropertyName("failureCode")]
  [NewtonsoftJson.JsonProperty("failureCode", NullValueHandling = NewtonsoftJson.NullValueHandling.Ignore)]
  public string? FailureCode { get; init; }

  /// <summary>Gets the Cosmos DB optimistic-concurrency token for this document revision.</summary>
  [JsonPropertyName("_etag")]
  [NewtonsoftJson.JsonProperty("_etag", NullValueHandling = NewtonsoftJson.NullValueHandling.Ignore)]
  public string ETag { get; init; } = string.Empty;

  /// <summary>Gets the Cosmos DB per-item time-to-live, in seconds, or <c>null</c> while the run has not reached a terminal state.</summary>
  [JsonPropertyName("ttl")]
  [NewtonsoftJson.JsonProperty("ttl", NullValueHandling = NewtonsoftJson.NullValueHandling.Ignore)]
  public int? TimeToLiveSeconds { get; init; }

  /// <summary>
  /// Creates a newly queued analysis run targeting an invoice.
  /// </summary>
  /// <param name="targetId">The identifier of the invoice to analyze.</param>
  /// <param name="requestedBy">The identifier of the user requesting the analysis.</param>
  /// <param name="correlationId">The correlation identifier linking this run to its originating request.</param>
  /// <param name="options">The invoice analysis capability selection.</param>
  /// <param name="traceParent">The W3C <c>traceparent</c> value to continue the distributed trace, or <c>null</c>.</param>
  /// <returns>A newly queued <see cref="AnalysisRun"/>.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="options"/> is null.</exception>
  /// <exception cref="ArgumentException">Thrown when <paramref name="targetId"/> or <paramref name="requestedBy"/> is empty.</exception>
  public static AnalysisRun CreateInvoice(
    Guid targetId,
    Guid requestedBy,
    Guid correlationId,
    InvoiceAnalysisOptions options,
    string? traceParent)
  {
    ArgumentNullException.ThrowIfNull(options);
    RequireNonEmpty(targetId, nameof(targetId));
    RequireNonEmpty(requestedBy, nameof(requestedBy));

    return new AnalysisRun
    {
      Id = Guid.CreateVersion7(),
      Bucket = DefaultBucket,
      TargetType = AnalysisTargetType.Invoice,
      TargetId = targetId,
      RequestedBy = requestedBy,
      CorrelationId = correlationId,
      TraceParent = traceParent,
      InvoiceOptions = options,
      MerchantOptions = null,
      Status = AnalysisRunStatus.Queued,
      AttemptCount = 0,
      AcceptedAt = DateTimeOffset.UtcNow,
    };
  }

  /// <summary>
  /// Creates a newly queued analysis run targeting a merchant.
  /// </summary>
  /// <param name="targetId">The identifier of the merchant to analyze.</param>
  /// <param name="requestedBy">The identifier of the user requesting the analysis.</param>
  /// <param name="correlationId">The correlation identifier linking this run to its originating request.</param>
  /// <param name="targetPartitionIdentifier">
  /// The merchant's parent company identifier (partition/company scope), persisted verbatim on the run for a
  /// worker-time point update against the same partition. <see cref="Guid.Empty"/> is a legitimate partition for an
  /// independent merchant and is persisted as-is; <see langword="null"/> means no partition scope was captured.
  /// </param>
  /// <param name="options">The merchant analysis capability selection.</param>
  /// <param name="traceParent">The W3C <c>traceparent</c> value to continue the distributed trace, or <c>null</c>.</param>
  /// <returns>A newly queued <see cref="AnalysisRun"/>.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="options"/> is null.</exception>
  /// <exception cref="ArgumentException">Thrown when <paramref name="targetId"/> or <paramref name="requestedBy"/> is empty.</exception>
  public static AnalysisRun CreateMerchant(
    Guid targetId,
    Guid requestedBy,
    Guid correlationId,
    Guid? targetPartitionIdentifier,
    MerchantAnalysisOptions options,
    string? traceParent)
  {
    ArgumentNullException.ThrowIfNull(options);
    RequireNonEmpty(targetId, nameof(targetId));
    RequireNonEmpty(requestedBy, nameof(requestedBy));

    return new AnalysisRun
    {
      Id = Guid.CreateVersion7(),
      Bucket = DefaultBucket,
      TargetType = AnalysisTargetType.Merchant,
      TargetId = targetId,
      TargetPartitionIdentifier = targetPartitionIdentifier,
      RequestedBy = requestedBy,
      CorrelationId = correlationId,
      TraceParent = traceParent,
      InvoiceOptions = null,
      MerchantOptions = options,
      Status = AnalysisRunStatus.Queued,
      AttemptCount = 0,
      AcceptedAt = DateTimeOffset.UtcNow,
    };
  }

  /// <summary>
  /// Claims this run for the given worker, assigning a new lease.
  /// </summary>
  /// <remarks>
  /// <para>Permitted from <see cref="AnalysisRunStatus.Queued"/> (first claim) or from <see cref="AnalysisRunStatus.Running"/>
  /// when the current lease has already expired at <paramref name="now"/> (reclaim of an abandoned run). Any other starting
  /// state — including a still-active <see cref="AnalysisRunStatus.Running"/> lease, or a terminal state — is rejected.</para>
  /// </remarks>
  /// <param name="leaseOwner">The identifier of the worker claiming this run.</param>
  /// <param name="now">The current instant, used to compute the new lease expiry and to evaluate lease expiry.</param>
  /// <param name="leaseDuration">How long the new lease remains valid.</param>
  /// <returns>A new <see cref="AnalysisRun"/> instance in the <see cref="AnalysisRunStatus.Running"/> state.</returns>
  /// <exception cref="ArgumentException">Thrown when <paramref name="leaseOwner"/> is null, empty, or whitespace.</exception>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="leaseDuration"/> is not positive.</exception>
  /// <exception cref="InvalidAnalysisRunTransitionException">Thrown when this run cannot currently be claimed.</exception>
  public AnalysisRun Claim(string leaseOwner, DateTimeOffset now, TimeSpan leaseDuration)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(leaseOwner);
    if (leaseDuration <= TimeSpan.Zero)
    {
      throw new ArgumentOutOfRangeException(nameof(leaseDuration), leaseDuration, "Lease duration must be positive.");
    }

    var canClaim = Status switch
    {
      AnalysisRunStatus.Queued => true,
      AnalysisRunStatus.Running => LeaseExpiresAt is not null && now >= LeaseExpiresAt.Value,
      _ => false,
    };

    if (!canClaim)
    {
      throw new InvalidAnalysisRunTransitionException(Status, AnalysisRunStatus.Running);
    }

    return this with
    {
      Status = AnalysisRunStatus.Running,
      LeaseOwner = leaseOwner,
      LeaseExpiresAt = now + leaseDuration,
      AttemptCount = AttemptCount + 1,
      StartedAt = StartedAt ?? now,
    };
  }

  /// <summary>
  /// Extends this run's current lease.
  /// </summary>
  /// <param name="now">The current instant, used to compute the new lease expiry.</param>
  /// <param name="leaseDuration">How long the renewed lease remains valid.</param>
  /// <returns>A new <see cref="AnalysisRun"/> instance with an extended lease.</returns>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="leaseDuration"/> is not positive.</exception>
  /// <exception cref="InvalidAnalysisRunTransitionException">Thrown when this run is not currently running.</exception>
  public AnalysisRun RenewLease(DateTimeOffset now, TimeSpan leaseDuration)
  {
    if (leaseDuration <= TimeSpan.Zero)
    {
      throw new ArgumentOutOfRangeException(nameof(leaseDuration), leaseDuration, "Lease duration must be positive.");
    }

    if (Status != AnalysisRunStatus.Running)
    {
      throw new InvalidAnalysisRunTransitionException(Status, AnalysisRunStatus.Running);
    }

    return this with { LeaseExpiresAt = now + leaseDuration };
  }

  /// <summary>
  /// Marks this run as completed.
  /// </summary>
  /// <param name="completedAt">The instant the run completed.</param>
  /// <param name="completedCapabilities">The capabilities that produced a usable result.</param>
  /// <returns>A new <see cref="AnalysisRun"/> instance in the <see cref="AnalysisRunStatus.Completed"/> state.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="completedCapabilities"/> is null.</exception>
  /// <exception cref="InvalidAnalysisRunTransitionException">Thrown when this run is not currently running.</exception>
  public AnalysisRun Complete(DateTimeOffset completedAt, IReadOnlyCollection<AnalysisCapability> completedCapabilities)
  {
    ArgumentNullException.ThrowIfNull(completedCapabilities);

    if (Status != AnalysisRunStatus.Running)
    {
      throw new InvalidAnalysisRunTransitionException(Status, AnalysisRunStatus.Completed);
    }

    return this with
    {
      Status = AnalysisRunStatus.Completed,
      CompletedAt = completedAt,
      CompletedCapabilities = [.. completedCapabilities],
      LeaseOwner = null,
      LeaseExpiresAt = null,
      TimeToLiveSeconds = CompletionTimeToLiveSeconds,
    };
  }

  /// <summary>
  /// Marks this run as failed.
  /// </summary>
  /// <param name="failureCode">The stable failure code describing why the run failed.</param>
  /// <param name="failedAt">The instant the run failed.</param>
  /// <returns>A new <see cref="AnalysisRun"/> instance in the <see cref="AnalysisRunStatus.Failed"/> state.</returns>
  /// <exception cref="ArgumentException">Thrown when <paramref name="failureCode"/> is null, empty, or whitespace.</exception>
  /// <exception cref="InvalidAnalysisRunTransitionException">Thrown when this run is not currently running.</exception>
  public AnalysisRun Fail(string failureCode, DateTimeOffset failedAt)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(failureCode);

    if (Status != AnalysisRunStatus.Running)
    {
      throw new InvalidAnalysisRunTransitionException(Status, AnalysisRunStatus.Failed);
    }

    return this with
    {
      Status = AnalysisRunStatus.Failed,
      FailedAt = failedAt,
      FailureCode = failureCode,
      LeaseOwner = null,
      LeaseExpiresAt = null,
      TimeToLiveSeconds = CompletionTimeToLiveSeconds,
    };
  }

  /// <summary>
  /// Returns a copy of this run stamped with the given Cosmos DB optimistic-concurrency token.
  /// </summary>
  /// <param name="etag">The Cosmos DB <c>_etag</c> value returned by the broker after a write.</param>
  /// <returns>A new <see cref="AnalysisRun"/> instance carrying <paramref name="etag"/>.</returns>
  public AnalysisRun WithETag(string etag) => this with { ETag = etag };

  private static void RequireNonEmpty(Guid value, string paramName)
  {
    if (value == Guid.Empty)
    {
      throw new ArgumentException("Identifier must be set.", paramName);
    }
  }
}
