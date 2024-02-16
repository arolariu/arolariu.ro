using arolariu.Backend.Common.Options;

using Azure.Identity;
using Azure.Monitor.OpenTelemetry.Exporter;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using OpenTelemetry.Exporter;
using OpenTelemetry.Metrics;

using System;

namespace arolariu.Backend.Common.Telemetry.Metering;

public static class MeteringExtensions
{
    public static void AddOTelMetering(this WebApplicationBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.Services.AddOpenTelemetry()
        .WithMetrics(metricsOptions =>
        {
            metricsOptions.AddAspNetCoreInstrumentation();
            metricsOptions.AddHttpClientInstrumentation();

            #if DEBUG
            metricsOptions.AddConsoleExporter();
            #endif

            metricsOptions.AddAzureMonitorMetricExporter(monitorOptions =>
            {
                var instrumentationKey = builder.Configuration[$"{nameof(CommonOptions)}:ApplicationInsightsEndpoint"];
                monitorOptions.ConnectionString = instrumentationKey;
                monitorOptions.Credential = new DefaultAzureCredential();
            });
        });
    }
}
