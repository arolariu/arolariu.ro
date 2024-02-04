using arolariu.Backend.Common.Options;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using System;

namespace arolariu.Backend.Common.Telemetry;

public static class TelemetryExtensions
{
    public static void AddTelemetry(this WebApplicationBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.Services.AddApplicationInsightsTelemetry(options =>
        {
            var instrumentationKey = builder.Configuration[$"{nameof(CommonOptions)}:ApplicationInsightsEndpoint"];
            options.ConnectionString = instrumentationKey;
        });
    }
}
