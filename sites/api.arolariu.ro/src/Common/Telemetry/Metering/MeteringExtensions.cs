using Azure.Identity;
using Azure.Monitor.OpenTelemetry.Exporter;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using OpenTelemetry.Exporter;
using OpenTelemetry.Metrics;

namespace arolariu.Backend.Common.Telemetry.Metering;

public static class MeteringExtensions
{
    public static void AddOTelMetering(this WebApplicationBuilder builder)
    {
        builder.Services
        .AddOpenTelemetry()
        .WithMetrics(metricsOptions =>
        {
            metricsOptions.AddAspNetCoreInstrumentation();

            metricsOptions.AddConsoleExporter(consoleOptions =>
            {
                consoleOptions.Targets = ConsoleExporterOutputTargets.Console;
            });

            metricsOptions.AddAzureMonitorMetricExporter(monitorOptions =>
            {
                var instrumentationKey = builder.Configuration["OTel:InstrumentationKey"];
                monitorOptions.ConnectionString = $"InstrumentationKey={instrumentationKey}";
                monitorOptions.Credential = new DefaultAzureCredential();
            });
        });
    }
}
