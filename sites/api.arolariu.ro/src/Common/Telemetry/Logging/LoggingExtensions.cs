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
/// Provides extension methods for configuring OpenTelemetry logging with Azure Monitor integration.
/// This class sets up structured logging with automatic export to Azure Application Insights.
/// </summary>
/// <remarks>
/// This extension configures:
/// - OpenTelemetry logging providers for structured log collection
/// - Azure Monitor exporter for cloud-based log aggregation
/// - Console exporter for local debugging scenarios
/// - Scope and formatted message inclusion for detailed context
/// </remarks>
/// <example>
/// <code>
/// // Usage in Program.cs
/// var builder = WebApplication.CreateBuilder(args);
/// builder.AddOTelLogging();
/// </code>
/// </example>
public static class LoggingExtensions
{
	/// <summary>
	/// Configures OpenTelemetry logging with Azure Monitor export capabilities.
	/// This method sets up structured logging that automatically exports to Azure Application Insights
	/// and includes console output during debugging.
	/// </summary>
	/// <param name="builder">The <see cref="WebApplicationBuilder"/> to configure with OpenTelemetry logging.</param>
	/// <remarks>
	/// This method configures:
	/// - Formatted message inclusion for readable log entries
	/// - Scope inclusion to capture logging context and correlation
	/// - Console exporter when debugger is attached for development
	/// - Azure Monitor exporter with Application Insights integration
	/// - Managed Identity authentication for secure cloud access
	/// </remarks>
	/// <exception cref="ArgumentNullException">
	/// Thrown when <paramref name="builder"/> is null.
	/// </exception>
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
