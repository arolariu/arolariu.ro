namespace arolariu.Backend.Common.Telemetry.Tracing;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Provides extension methods for enriching <see cref="Activity"/> instances with semantic attributes
/// following OpenTelemetry conventions for improved distributed tracing visibility in Azure Application Insights.
/// </summary>
/// <remarks>
/// <para>
/// These extensions enable structured, consistent span enrichment across all application layers:
/// - Endpoints (Server spans with HTTP context)
/// - Services (Internal spans with business context)
/// - Brokers (Client spans with database semantic conventions)
/// </para>
/// <para>
/// Following OpenTelemetry semantic conventions ensures proper correlation and
/// visualization in Azure Application Insights Transaction Search and End-to-End Transaction views.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// using var activity = InvoicePackageTracing.StartActivity("ReadInvoice", ActivityKind.Internal);
/// activity?
///     .SetInvoiceContext(invoiceId, userId)
///     .SetLayerContext("Foundation", "InvoiceStorageFoundationService")
///     .RecordSuccess();
/// </code>
/// </example>
[ExcludeFromCodeCoverage] // Infrastructure utilities; excluded to allow 100% business logic coverage
public static class ActivityExtensions
{
  #region OpenTelemetry Semantic Convention Attribute Keys
  // General semantic conventions
  private const string ServiceLayerKey = "service.layer";
  private const string ServiceComponentKey = "service.component";
  private const string OperationTypeKey = "operation.type";

  // Database semantic conventions (https://opentelemetry.io/docs/specs/semconv/database/)
  private const string DbSystemKey = "db.system";
  private const string DbNameKey = "db.name";
  private const string DbOperationKey = "db.operation";
  private const string DbCollectionKey = "db.collection.name";
  private const string DbStatementKey = "db.statement";
  private const string DbCosmosDbContainerKey = "db.cosmosdb.container";
  private const string DbCosmosDbDatabaseKey = "db.cosmosdb.database_id";
  private const string DbCosmosDbPartitionKeyKey = "db.cosmosdb.partition_key";
  private const string DbCosmosDbRequestChargeKey = "db.cosmosdb.request_charge";

  // Business domain semantic conventions (custom)
  private const string InvoiceIdKey = "invoice.id";
  private const string InvoiceUserIdKey = "invoice.user_id";
  private const string InvoiceMerchantIdKey = "invoice.merchant_id";
  private const string InvoiceItemCountKey = "invoice.item_count";
  private const string InvoiceTotalAmountKey = "invoice.total_amount";
  private const string InvoiceCurrencyKey = "invoice.currency";
  private const string MerchantIdKey = "merchant.id";
  private const string MerchantNameKey = "merchant.name";
  private const string UserIdKey = "user.id";

  // Error semantic conventions
  private const string ExceptionTypeKey = "exception.type";
  private const string ExceptionMessageKey = "exception.message";
  private const string ExceptionStacktraceKey = "exception.stacktrace";
  private const string ErrorKey = "error";
  #endregion

  #region Layer Context Methods
  /// <summary>
  /// Sets the architectural layer context for the activity, enabling hierarchical trace visualization.
  /// </summary>
  /// <param name="activity">The activity to enrich. If null, no operation is performed.</param>
  /// <param name="layer">The architectural layer name (e.g., "Endpoint", "Processing", "Orchestration", "Foundation", "Broker").</param>
  /// <param name="component">The component or service name within the layer.</param>
  /// <returns>The enriched activity for method chaining, or null if input was null.</returns>
  /// <remarks>
  /// Layer information enables filtering and grouping spans by architectural tier in Application Insights.
  /// This is particularly useful for identifying bottlenecks at specific layers of the application.
  /// </remarks>
  public static Activity? SetLayerContext(this Activity? activity, string layer, string component)
  {
    activity?.SetTag(ServiceLayerKey, layer);
    activity?.SetTag(ServiceComponentKey, component);
    return activity;
  }

  /// <summary>
  /// Sets the operation type for the activity, categorizing the kind of work being performed.
  /// </summary>
  /// <param name="activity">The activity to enrich.</param>
  /// <param name="operationType">The operation type (e.g., "CRUD.Create", "CRUD.Read", "Analysis", "Validation").</param>
  /// <returns>The enriched activity for method chaining.</returns>
  public static Activity? SetOperationType(this Activity? activity, string operationType)
  {
    activity?.SetTag(OperationTypeKey, operationType);
    return activity;
  }
  #endregion

  #region Invoice Domain Context Methods
  /// <summary>
  /// Sets invoice-specific context for the activity, enabling invoice-based filtering and correlation.
  /// </summary>
  /// <param name="activity">The activity to enrich.</param>
  /// <param name="invoiceId">The unique identifier of the invoice being processed.</param>
  /// <param name="userId">Optional user identifier associated with the invoice.</param>
  /// <returns>The enriched activity for method chaining.</returns>
  /// <remarks>
  /// Invoice context enables searching for all operations related to a specific invoice
  /// in Application Insights using custom dimension filters.
  /// </remarks>
  public static Activity? SetInvoiceContext(this Activity? activity, Guid invoiceId, Guid? userId = null)
  {
    activity?.SetTag(InvoiceIdKey, invoiceId.ToString());
    if (userId.HasValue && userId.Value != Guid.Empty)
    {
      activity?.SetTag(InvoiceUserIdKey, userId.Value.ToString());
    }
    return activity;
  }

  /// <summary>
  /// Sets detailed invoice information for comprehensive trace enrichment.
  /// </summary>
  /// <param name="activity">The activity to enrich.</param>
  /// <param name="invoiceId">The invoice identifier.</param>
  /// <param name="userId">The user identifier.</param>
  /// <param name="merchantId">The merchant identifier.</param>
  /// <param name="itemCount">The number of items in the invoice.</param>
  /// <param name="totalAmount">The total amount of the invoice.</param>
  /// <param name="currency">The currency code (e.g., "USD", "EUR", "RON").</param>
  /// <returns>The enriched activity for method chaining.</returns>
  public static Activity? SetInvoiceDetails(
      this Activity? activity,
      Guid invoiceId,
      Guid userId,
      Guid? merchantId = null,
      int? itemCount = null,
      decimal? totalAmount = null,
      string? currency = null)
  {
    activity?.SetTag(InvoiceIdKey, invoiceId.ToString());
    activity?.SetTag(InvoiceUserIdKey, userId.ToString());

    if (merchantId.HasValue && merchantId.Value != Guid.Empty)
    {
      activity?.SetTag(InvoiceMerchantIdKey, merchantId.Value.ToString());
    }
    if (itemCount.HasValue)
    {
      activity?.SetTag(InvoiceItemCountKey, itemCount.Value);
    }
    if (totalAmount.HasValue)
    {
      activity?.SetTag(InvoiceTotalAmountKey, totalAmount.Value);
    }
    if (!string.IsNullOrWhiteSpace(currency))
    {
      activity?.SetTag(InvoiceCurrencyKey, currency);
    }
    return activity;
  }

  /// <summary>
  /// Sets merchant-specific context for the activity.
  /// </summary>
  /// <param name="activity">The activity to enrich.</param>
  /// <param name="merchantId">The merchant identifier.</param>
  /// <param name="merchantName">Optional merchant name for display purposes.</param>
  /// <returns>The enriched activity for method chaining.</returns>
  public static Activity? SetMerchantContext(this Activity? activity, Guid merchantId, string? merchantName = null)
  {
    activity?.SetTag(MerchantIdKey, merchantId.ToString());
    if (!string.IsNullOrWhiteSpace(merchantName))
    {
      activity?.SetTag(MerchantNameKey, merchantName);
    }
    return activity;
  }

  /// <summary>
  /// Sets user context for the activity, enabling user-based trace filtering.
  /// </summary>
  /// <param name="activity">The activity to enrich.</param>
  /// <param name="userId">The user identifier.</param>
  /// <returns>The enriched activity for method chaining.</returns>
  public static Activity? SetUserContext(this Activity? activity, Guid userId)
  {
    if (userId != Guid.Empty)
    {
      activity?.SetTag(UserIdKey, userId.ToString());
    }
    return activity;
  }
  #endregion

  #region Database Semantic Conventions Methods
  /// <summary>
  /// Sets Azure Cosmos DB specific context following OpenTelemetry database semantic conventions.
  /// </summary>
  /// <param name="activity">The activity to enrich.</param>
  /// <param name="database">The Cosmos DB database name.</param>
  /// <param name="container">The Cosmos DB container name.</param>
  /// <param name="operation">The database operation type (e.g., "create", "read", "upsert", "delete", "query").</param>
  /// <param name="partitionKey">Optional partition key value used for the operation.</param>
  /// <returns>The enriched activity for method chaining.</returns>
  /// <remarks>
  /// Following OpenTelemetry semantic conventions ensures proper dependency tracking
  /// and enables Application Insights to correctly categorize and display database operations.
  /// See: https://opentelemetry.io/docs/specs/semconv/database/cosmosdb/
  /// </remarks>
  public static Activity? SetCosmosDbContext(
      this Activity? activity,
      string database,
      string container,
      string operation,
      string? partitionKey = null)
  {
    activity?.SetTag(DbSystemKey, "cosmosdb");
    activity?.SetTag(DbNameKey, database);
    activity?.SetTag(DbCosmosDbDatabaseKey, database);
    activity?.SetTag(DbCosmosDbContainerKey, container);
    activity?.SetTag(DbCollectionKey, container);
    activity?.SetTag(DbOperationKey, operation);

    if (!string.IsNullOrWhiteSpace(partitionKey))
    {
      activity?.SetTag(DbCosmosDbPartitionKeyKey, partitionKey);
    }
    return activity;
  }

  /// <summary>
  /// Records the Cosmos DB request charge (RUs consumed) for cost analysis.
  /// </summary>
  /// <param name="activity">The activity to enrich.</param>
  /// <param name="requestCharge">The request charge in Request Units (RU).</param>
  /// <returns>The enriched activity for method chaining.</returns>
  /// <remarks>
  /// Tracking RU consumption per operation enables cost optimization analysis
  /// and identification of expensive database operations.
  /// </remarks>
  public static Activity? SetCosmosDbRequestCharge(this Activity? activity, double requestCharge)
  {
    activity?.SetTag(DbCosmosDbRequestChargeKey, requestCharge);
    return activity;
  }

  /// <summary>
  /// Sets a sanitized database query statement for debugging purposes.
  /// </summary>
  /// <param name="activity">The activity to enrich.</param>
  /// <param name="statement">The query statement (should be parameterized, no sensitive data).</param>
  /// <returns>The enriched activity for method chaining.</returns>
  /// <remarks>
  /// Only include parameterized queries without sensitive data values.
  /// This aids in debugging slow or problematic queries.
  /// </remarks>
  public static Activity? SetDbStatement(this Activity? activity, string statement)
  {
    if (!string.IsNullOrWhiteSpace(statement))
    {
      activity?.SetTag(DbStatementKey, statement);
    }
    return activity;
  }
  #endregion

  #region Status and Error Recording Methods
  /// <summary>
  /// Records that the operation completed successfully with an OK status.
  /// </summary>
  /// <param name="activity">The activity to mark as successful.</param>
  /// <param name="description">Optional description of the successful completion.</param>
  /// <returns>The enriched activity for method chaining.</returns>
  public static Activity? RecordSuccess(this Activity? activity, string? description = null)
  {
    activity?.SetStatus(ActivityStatusCode.Ok, description);
    return activity;
  }

  /// <summary>
  /// Records that the operation failed with an error status and exception details.
  /// </summary>
  /// <param name="activity">The activity to mark as failed.</param>
  /// <param name="exception">The exception that caused the failure.</param>
  /// <param name="escaped">Whether the exception escaped the span (default: true).</param>
  /// <returns>The enriched activity for method chaining.</returns>
  /// <remarks>
  /// This method:
  /// 1. Sets the activity status to Error
  /// 2. Records the exception as an activity event (per OpenTelemetry spec)
  /// 3. Sets semantic exception attributes for filtering
  /// 4. Marks the span with the error flag for Application Insights
  /// </remarks>
  public static Activity? RecordException(this Activity? activity, Exception exception, bool escaped = true)
  {
    if (activity is null || exception is null) return activity;

    // Set error status
    activity.SetStatus(ActivityStatusCode.Error, exception.Message);

    // Record exception event per OpenTelemetry specification
    var exceptionEvent = new ActivityEvent(
        "exception",
        tags: new ActivityTagsCollection(new Dictionary<string, object?>
        {
          [ExceptionTypeKey] = exception.GetType().FullName,
          [ExceptionMessageKey] = exception.Message,
          [ExceptionStacktraceKey] = exception.StackTrace,
          ["exception.escaped"] = escaped
        }));

    activity.AddEvent(exceptionEvent);

    // Also set as tags for easier filtering in Application Insights
    activity.SetTag(ErrorKey, true);
    activity.SetTag(ExceptionTypeKey, exception.GetType().FullName);
    activity.SetTag(ExceptionMessageKey, exception.Message);

    return activity;
  }

  /// <summary>
  /// Records a custom event on the activity timeline.
  /// </summary>
  /// <param name="activity">The activity to add the event to.</param>
  /// <param name="eventName">The name of the event.</param>
  /// <param name="attributes">Optional attributes to attach to the event.</param>
  /// <returns>The enriched activity for method chaining.</returns>
  /// <remarks>
  /// Events are useful for marking significant points in an operation's lifecycle,
  /// such as "validation.started", "external.service.called", or "cache.miss".
  /// </remarks>
  public static Activity? AddCustomEvent(
      this Activity? activity,
      string eventName,
      IEnumerable<KeyValuePair<string, object?>>? attributes = null)
  {
    if (activity is null || string.IsNullOrWhiteSpace(eventName)) return activity;

    var tags = attributes is not null
        ? new ActivityTagsCollection(attributes)
        : null;

    activity.AddEvent(new ActivityEvent(eventName, tags: tags));
    return activity;
  }
  #endregion

  #region Span Linking Methods
  /// <summary>
  /// Creates a new activity with a link to a parent trace context, useful for async/batch operations.
  /// </summary>
  /// <param name="source">The activity source to create the activity from.</param>
  /// <param name="name">The name of the new activity.</param>
  /// <param name="linkedContext">The activity context to link to.</param>
  /// <param name="kind">The kind of activity (default: Internal).</param>
  /// <returns>A new activity with the specified link.</returns>
  /// <remarks>
  /// Links are useful when an operation is triggered by multiple parent operations
  /// or when processing batched items that originated from different traces.
  /// </remarks>
  public static Activity? StartActivityWithLink(
      this ActivitySource source,
      string name,
      ActivityContext linkedContext,
      ActivityKind kind = ActivityKind.Internal)
  {
    ArgumentNullException.ThrowIfNull(source);
    var links = new[] { new ActivityLink(linkedContext) };
    return source.StartActivity(name, kind, default(ActivityContext), links: links);
  }
  #endregion
}
