using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace arolariu.Backend.Common.Telemetry;

public static class TelemetryExtensions
{
    public static void AddTelemetry(this WebApplicationBuilder builder)
    {
        builder.Services.AddApplicationInsightsTelemetry(options =>
        {
            var instrumentationKey = builder.Configuration["OTel:InstrumentationKey"];
            options.ConnectionString = $"InstrumentationKey={instrumentationKey}";
        });
    }
}
