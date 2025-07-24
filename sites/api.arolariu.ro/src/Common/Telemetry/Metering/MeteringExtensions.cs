namespace arolariu.Backend.Common.Telemetry.Metering;

using System;
using System.Diagnostics;

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

			if (Debugger.IsAttached)
			{
				metricsOptions.AddConsoleExporter();
			}

			metricsOptions.AddAzureMonitorMetricExporter(monitorOptions =>
			{
				using ServiceProvider optionsManager = builder.Services.BuildServiceProvider();
				string instrumentationKey = new string(optionsManager
											.GetRequiredService<IOptionsManager>()
											.GetApplicationOptions()
											.ApplicationInsightsEndpoint);

				monitorOptions.ConnectionString = instrumentationKey;
				monitorOptions.Credential = new DefaultAzureCredential(
#if !DEBUG
					new DefaultAzureCredentialOptions
				{
					ManagedIdentityClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")
				}
#endif
				);
			});
		});
	}
}
