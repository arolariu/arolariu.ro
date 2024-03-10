using arolariu.Backend.Common.Options;

using Azure.Identity;
using Azure.Monitor.OpenTelemetry.Exporter;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using OpenTelemetry.Exporter;
using OpenTelemetry.Trace;

using System;

namespace arolariu.Backend.Common.Telemetry.Tracing;

/// <summary>
/// Extensions for tracing.
/// </summary>
public static class TracingExtensions
{
    /// <summary>
    /// Extension for adding OpenTelemetry tracing to the application.
    /// </summary>
    /// <param name="builder"></param>
    public static void AddOTelTracing(this WebApplicationBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.Services
        .AddOpenTelemetry()
        .WithTracing(tracingOptions =>
        {
            tracingOptions.AddAspNetCoreInstrumentation();
            tracingOptions.AddHttpClientInstrumentation();
            tracingOptions.AddEntityFrameworkCoreInstrumentation();

            #if DEBUG
            tracingOptions.AddConsoleExporter();
            #endif

            tracingOptions.AddAzureMonitorTraceExporter(monitorOptions =>
            {
                var instrumentationKey = builder.Configuration[$"{nameof(CommonOptions)}:ApplicationInsightsEndpoint"];
                monitorOptions.ConnectionString = instrumentationKey;
                monitorOptions.Credential = new DefaultAzureCredential();
            });
        });
    }
}
