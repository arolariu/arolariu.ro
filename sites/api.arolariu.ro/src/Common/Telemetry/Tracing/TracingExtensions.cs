﻿using Azure.Identity;
using Azure.Monitor.OpenTelemetry.Exporter;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using OpenTelemetry.Exporter;
using OpenTelemetry.Trace;

namespace arolariu.Backend.Common.Telemetry.Tracing;

public static class TracingExtensions
{
    public static void AddOTelTracing(this WebApplicationBuilder builder)
    {
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
                var instrumentationKey = builder.Configuration["OTel:InstrumentationKey"];
                monitorOptions.ConnectionString = $"InstrumentationKey={instrumentationKey}";
                monitorOptions.Credential = new DefaultAzureCredential();
            });
        });
    }
}