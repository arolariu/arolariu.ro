namespace arolariu.Backend.Domain.Invoices;

using System.Collections.Generic;
using System.Diagnostics;
using System.Diagnostics.Metrics;

using arolariu.Backend.Common.Telemetry.Metering;

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
///   <item><c>invoices.analysis</c> — AI analysis rate with outcome tag</item>
///   <item><c>invoices.analysis.duration</c> — Analysis latency distribution</item>
///   <item><c>invoices.analysis.content_filter.triggered</c> — AI content filter events</item>
///   <item><c>invoices.cosmosdb.request_charge</c> — Cosmos DB RU cost distribution</item>
/// </list>
/// </remarks>
public static class InvoiceMetrics
{
  private static readonly Meter Meter = MeterGenerators.InvoiceMeter;

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

  #endregion

  #region RED — Analysis Pipeline

  /// <summary>
  /// Counts invoice analysis operations with outcome dimension.
  /// Tags: <c>outcome</c> (success, failure), optionally <c>failure.reason</c>.
  /// </summary>
  public static readonly Counter<long> Analyses =
    Meter.CreateCounter<long>("invoices.analysis", "analyses", "Invoice analysis operations with outcome.");

  /// <summary>
  /// Duration of invoice analysis operations in milliseconds.
  /// Tags: <c>outcome</c>.
  /// </summary>
  public static readonly Histogram<double> AnalysisDuration =
    Meter.CreateHistogram<double>("invoices.analysis.duration", "ms", "Invoice analysis operation duration.");

  /// <summary>
  /// Total number of AI content filter triggers during analysis.
  /// </summary>
  public static readonly Counter<long> ContentFilterTriggered =
    Meter.CreateCounter<long>("invoices.analysis.content_filter.triggered", "events", "AI content filter trigger events.");

  /// <summary>
  /// Records a completed analysis with outcome and duration.
  /// </summary>
  /// <param name="outcome">The outcome (success, failure).</param>
  /// <param name="durationMs">Duration in milliseconds.</param>
  /// <param name="failureReason">Optional failure reason (validation, dependency, service).</param>
  public static void RecordAnalysis(string outcome, double durationMs, string? failureReason = null)
  {
    var tags = new TagList { { "outcome", outcome } };
    if (failureReason is not null)
    {
      tags.Add("failure.reason", failureReason);
    }

    Analyses.Add(1, tags);
    AnalysisDuration.Record(durationMs, tags);
  }

  #endregion

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
