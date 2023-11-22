﻿using Azure.Identity;
using Azure.Monitor.OpenTelemetry.Exporter;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Logging;

using OpenTelemetry.Exporter;
using OpenTelemetry.Logs;

using System.Collections.Generic;

namespace arolariu.Backend.Common.Telemetry.Logging;

public static class LoggingExtensions
{
    public static void AddOTelLogging(this WebApplicationBuilder builder)
    {
        builder.Logging
        .AddOpenTelemetry(otelOptions =>
        {
            otelOptions.IncludeFormattedMessage = true;
            otelOptions.IncludeScopes = true;

            #if DEBUG
            otelOptions.AddConsoleExporter();
            #endif

            otelOptions.AddAzureMonitorLogExporter(monitorOptions =>
            {
                var instrumentationKey = builder.Configuration["OTel:InstrumentationKey"];
                monitorOptions.ConnectionString = $"InstrumentationKey={instrumentationKey}";
                monitorOptions.Credential = new DefaultAzureCredential();
            });
        });
    }
}
