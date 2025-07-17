namespace arolariu.Backend.Common.Telemetry.Metering;

using System;

using arolariu.Backend.Common.Options;

using Azure.Identity;
using Azure.Monitor.OpenTelemetry.Exporter;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using OpenTelemetry.Metrics;

/// <summary>
/// Extensions for metering.
/// </summary>
public static class MeteringExtensions
{
	/// <summary>
	/// Adds OpenTelemetry metering to the application.
	/// </summary>
	/// <param name="builder"></param>
	public static void AddOTelMetering(this WebApplicationBuilder builder)
	{
		ArgumentNullException.ThrowIfNull(builder);
		builder.Services.AddOpenTelemetry().WithMetrics(metricsOptions =>
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

#if DEBUG
				monitorOptions.Credential = new DefaultAzureCredential();
#else
				monitorOptions.Credential = new ManagedIdentityCredential(
					clientId: builder.Configuration["AZURE_CLIENT_ID"]);
#endif
			});
		});
	}
}
