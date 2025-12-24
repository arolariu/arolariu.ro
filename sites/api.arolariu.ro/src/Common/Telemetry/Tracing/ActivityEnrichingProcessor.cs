namespace arolariu.Backend.Common.Telemetry.Tracing;

using System;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;

using OpenTelemetry;

/// <summary>
/// A custom span processor that enriches all activities with consistent baseline attributes
/// for improved filtering and correlation in Azure Application Insights.
/// </summary>
/// <remarks>
/// <para>
/// This processor is invoked for every span (activity) started in the application and adds:
/// - Correlation IDs for cross-service tracing
/// - Environment context for multi-environment filtering
/// - Timestamp metadata for precise timing analysis
/// - Request context extraction from Activity baggage
/// </para>
/// <para>
/// The processor runs before spans are exported to Azure Monitor, ensuring all telemetry
/// contains the enrichment data needed for effective distributed trace analysis.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// // Registration in TracingExtensions.cs
/// tracingOptions.AddProcessor(new ActivityEnrichingProcessor());
/// </code>
/// </example>
[ExcludeFromCodeCoverage] // Infrastructure processor; excluded to allow 100% business logic coverage
public sealed class ActivityEnrichingProcessor : BaseProcessor<Activity>
{
    #region Attribute Keys
    private const string CorrelationIdKey = "correlation.id";
    private const string ParentSpanIdKey = "parent.span_id";
    private const string RootTraceIdKey = "root.trace_id";
    private const string SpanDepthKey = "span.depth";
    private const string EnvironmentNameKey = "environment.name";
    private const string HostNameKey = "host.name";
    private const string ProcessIdKey = "process.id";
    private const string ThreadIdKey = "thread.id";
    private const string StartTimestampUtcKey = "start.timestamp_utc";
    #endregion

    private readonly string _environmentName;
    private readonly string _hostName;
    private readonly int _processId;

    /// <summary>
    /// Initializes a new instance of the <see cref="ActivityEnrichingProcessor"/> class.
    /// </summary>
    public ActivityEnrichingProcessor()
    {
        _environmentName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
        _hostName = Environment.MachineName;
        _processId = Environment.ProcessId;
    }

    /// <summary>
    /// Called when an activity is started. Enriches the activity with baseline context.
    /// </summary>
    /// <param name="activity">The activity that was started.</param>
    /// <remarks>
    /// OnStart is called synchronously on the thread that starts the activity.
    /// Keep processing minimal to avoid impacting application performance.
    /// </remarks>
    public override void OnStart(Activity activity)
    {
        if (activity is null) return;

        // Add correlation context
        activity.SetTag(CorrelationIdKey, activity.TraceId.ToString());
        activity.SetTag(RootTraceIdKey, activity.RootId);

        if (activity.Parent is not null)
        {
            activity.SetTag(ParentSpanIdKey, activity.Parent.SpanId.ToString());
        }

        // Calculate span depth for hierarchy visualization
        var depth = CalculateSpanDepth(activity);
        activity.SetTag(SpanDepthKey, depth);

        // Add environment context
        activity.SetTag(EnvironmentNameKey, _environmentName);
        activity.SetTag(HostNameKey, _hostName);
        activity.SetTag(ProcessIdKey, _processId);
        activity.SetTag(ThreadIdKey, Environment.CurrentManagedThreadId);

        // Add precise timestamp
        activity.SetTag(StartTimestampUtcKey, activity.StartTimeUtc.ToString("O"));

        // Extract any baggage items and add as tags for visibility
        foreach (var baggage in activity.Baggage)
        {
            // Prefix baggage items to distinguish them
            activity.SetTag($"baggage.{baggage.Key}", baggage.Value);
        }
    }

    /// <summary>
    /// Called when an activity is stopped. Can add final enrichment based on activity results.
    /// </summary>
    /// <param name="activity">The activity that was stopped.</param>
    /// <remarks>
    /// OnEnd is called synchronously on the thread that stops the activity.
    /// This is the last chance to add attributes before the span is exported.
    /// </remarks>
    public override void OnEnd(Activity activity)
    {
        if (activity is null) return;

        // Add duration in milliseconds for easier analysis
        activity.SetTag("duration.ms", activity.Duration.TotalMilliseconds);

        // Ensure all activities have a status (default to OK if not explicitly set)
        // Only set if no status was explicitly set and no error was recorded
        if (activity.Status == ActivityStatusCode.Unset &&
            activity.GetTagItem("error") is null)
        {
            activity.SetStatus(ActivityStatusCode.Ok);
        }

        // Add display name for better readability in traces
        // Combine source name and operation name for unique identification
        activity.SetTag("display.name", $"{activity.Source.Name}/{activity.OperationName}");
    }

    /// <summary>
    /// Calculates the depth of the current span in the trace hierarchy.
    /// </summary>
    /// <param name="activity">The activity to calculate depth for.</param>
    /// <returns>The depth level (0 = root, 1 = first child, etc.).</returns>
    private static int CalculateSpanDepth(Activity? activity)
    {
        var depth = 0;
        var current = activity?.Parent;

        while (current is not null)
        {
            depth++;
            current = current.Parent;
        }

        return depth;
    }
}
