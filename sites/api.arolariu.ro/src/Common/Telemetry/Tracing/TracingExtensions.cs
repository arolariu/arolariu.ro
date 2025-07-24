namespace arolariu.Backend.Common.Telemetry.Tracing;

using System;
using System.Diagnostics;

using arolariu.Backend.Common.Options;

using Azure.Identity;
using Azure.Monitor.OpenTelemetry.Exporter;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using OpenTelemetry.Trace;

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

		builder.Services.AddOpenTelemetry().WithTracing(tracingOptions =>
		{
			tracingOptions.AddAspNetCoreInstrumentation();
			tracingOptions.AddHttpClientInstrumentation();
			tracingOptions.AddEntityFrameworkCoreInstrumentation();

			if (Debugger.IsAttached)
			{
				tracingOptions.AddConsoleExporter();
			}

			tracingOptions.AddAzureMonitorTraceExporter(monitorOptions =>
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
