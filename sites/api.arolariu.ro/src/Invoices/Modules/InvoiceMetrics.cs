namespace arolariu.Backend.Domain.Invoices;

using System.Collections.Generic;
using System.Diagnostics.Metrics;

using arolariu.Backend.Common.Telemetry.Metering;

/// <summary>
/// Defines custom OTel metric instruments for the Invoices bounded context.
/// All instruments are created from <see cref="MeterGenerators.InvoiceMeter"/>.
/// </summary>
/// <remarks>
/// Metric naming follows OTel semantic conventions with dot-separated, lowercase namespaces:
/// <list type="bullet">
///   <item><c>invoices.*</c> — Invoice entity lifecycle metrics</item>
///   <item><c>merchants.*</c> — Merchant entity lifecycle metrics</item>
///   <item><c>invoices.analysis.*</c> — AI analysis pipeline metrics</item>
///   <item><c>invoices.cosmosdb.*</c> — Cosmos DB cost and performance metrics</item>
/// </list>
/// </remarks>
public static class InvoiceMetrics
{
  private static readonly Meter Meter = MeterGenerators.InvoiceMeter;

  #region Invoice Lifecycle Counters

  /// <summary>
  /// Total number of invoices created.
  /// </summary>
  public static readonly Counter<long> InvoicesCreated =
    Meter.CreateCounter<long>("invoices.created", "invoices", "Total invoices created.");

  /// <summary>
  /// Total number of invoices deleted (soft or hard).
  /// </summary>
  public static readonly Counter<long> InvoicesDeleted =
    Meter.CreateCounter<long>("invoices.deleted", "invoices", "Total invoices deleted.");

  /// <summary>
  /// Total number of invoices updated.
  /// </summary>
  public static readonly Counter<long> InvoicesUpdated =
    Meter.CreateCounter<long>("invoices.updated", "invoices", "Total invoices updated.");

  /// <summary>
  /// Total number of invoice read operations (single or batch).
  /// </summary>
  public static readonly Counter<long> InvoicesRead =
    Meter.CreateCounter<long>("invoices.read", "operations", "Total invoice read operations.");

  #endregion

  #region Merchant Lifecycle Counters

  /// <summary>
  /// Total number of merchants created.
  /// </summary>
  public static readonly Counter<long> MerchantsCreated =
    Meter.CreateCounter<long>("merchants.created", "merchants", "Total merchants created.");

  /// <summary>
  /// Total number of merchants deleted.
  /// </summary>
  public static readonly Counter<long> MerchantsDeleted =
    Meter.CreateCounter<long>("merchants.deleted", "merchants", "Total merchants deleted.");

  /// <summary>
  /// Total number of merchants updated.
  /// </summary>
  public static readonly Counter<long> MerchantsUpdated =
    Meter.CreateCounter<long>("merchants.updated", "merchants", "Total merchants updated.");

  #endregion

  #region Analysis Pipeline Metrics

  /// <summary>
  /// Total number of invoice analysis operations started.
  /// </summary>
  public static readonly Counter<long> AnalysesStarted =
    Meter.CreateCounter<long>("invoices.analysis.started", "analyses", "Total invoice analysis operations started.");

  /// <summary>
  /// Total number of invoice analysis operations completed successfully.
  /// </summary>
  public static readonly Counter<long> AnalysesCompleted =
    Meter.CreateCounter<long>("invoices.analysis.completed", "analyses", "Total invoice analysis operations completed successfully.");

  /// <summary>
  /// Total number of invoice analysis failures.
  /// Tag with <c>reason</c> to distinguish failure types (validation, dependency, service).
  /// </summary>
  public static readonly Counter<long> AnalysesFailed =
    Meter.CreateCounter<long>("invoices.analysis.failed", "analyses", "Total invoice analysis failures.");

  /// <summary>
  /// Duration of invoice analysis operations in milliseconds.
  /// </summary>
  public static readonly Histogram<double> AnalysisDuration =
    Meter.CreateHistogram<double>("invoices.analysis.duration", "ms", "Duration of invoice analysis operations.");

  /// <summary>
  /// Total number of AI content filter triggers during analysis.
  /// </summary>
  public static readonly Counter<long> ContentFilterTriggered =
    Meter.CreateCounter<long>("invoices.analysis.content_filter.triggered", "events", "AI content filter trigger events.");

  #endregion

  #region Cosmos DB Cost Metrics

  /// <summary>
  /// Distribution of Cosmos DB request unit (RU) consumption per operation.
  /// Tag with <c>db.operation</c> (create, read, query, upsert, delete) and <c>db.cosmosdb.container</c>.
  /// </summary>
  public static readonly Histogram<double> CosmosDbRequestCharge =
    Meter.CreateHistogram<double>("invoices.cosmosdb.request_charge", "RU", "Cosmos DB request unit consumption per operation.");

  #endregion

  /// <summary>
  /// Records a Cosmos DB request charge with standard dimensional tags.
  /// </summary>
  /// <param name="requestCharge">The RU cost of the operation.</param>
  /// <param name="operation">The Cosmos DB operation type (create, read, query, upsert, delete).</param>
  /// <param name="container">The Cosmos DB container name.</param>
  public static void RecordCosmosDbCharge(double requestCharge, string operation, string container)
  {
    CosmosDbRequestCharge.Record(requestCharge, new KeyValuePair<string, object?>("db.operation", operation), new KeyValuePair<string, object?>("db.cosmosdb.container", container));
  }
}
