using arolariu.Backend.Common.Options;

using Azure.Identity;
using Azure.Monitor.OpenTelemetry.Exporter;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Logging;

using OpenTelemetry.Logs;

using System;

namespace arolariu.Backend.Common.Telemetry.Logging;

/// <summary>
/// Extensions for logging.
/// </summary>
public static class LoggingExtensions
{
    /// <summary>
    /// Adds OpenTelemetry logging to the application.
    /// </summary>
    /// <param name="builder"></param>
    public static void AddOTelLogging(this WebApplicationBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.Logging
        .AddOpenTelemetry(otelOptions =>
        {
            otelOptions.IncludeFormattedMessage = true;
            otelOptions.IncludeScopes = true;

            #if DEBUG // Add console exporter only in Development
            otelOptions.AddConsoleExporter();
            #endif

            otelOptions.AddAzureMonitorLogExporter(monitorOptions =>
            {
                var instrumentationKey = builder.Configuration[$"{nameof(CommonOptions)}:ApplicationInsightsEndpoint"];
                monitorOptions.ConnectionString = instrumentationKey;
                monitorOptions.Credential = new DefaultAzureCredential();
            });
        });
    }
}
