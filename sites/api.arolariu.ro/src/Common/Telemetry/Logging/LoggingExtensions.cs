namespace arolariu.Backend.Common.Telemetry.Logging;

using System;
using System.Diagnostics;

using arolariu.Backend.Common.Options;

using Azure.Identity;
using Azure.Monitor.OpenTelemetry.Exporter;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using OpenTelemetry.Logs;

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

		builder.Logging.AddOpenTelemetry(otelOptions =>
		{
			otelOptions.IncludeFormattedMessage = true;
			otelOptions.IncludeScopes = true;

			if (Debugger.IsAttached)
			{
				otelOptions.AddConsoleExporter();
			}

			otelOptions.AddAzureMonitorLogExporter(monitorOptions =>
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
