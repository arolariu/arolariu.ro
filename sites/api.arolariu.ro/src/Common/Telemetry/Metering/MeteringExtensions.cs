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
/// Provides extension methods for configuring OpenTelemetry metrics collection with Azure Monitor integration.
/// This class sets up performance monitoring and metrics export to Azure Application Insights.
/// </summary>
/// <remarks>
/// This extension configures:
/// - ASP.NET Core metrics for HTTP request performance monitoring
/// - HTTP client metrics for dependency call tracking
/// - Azure Monitor exporter for cloud-based metrics aggregation
/// - Console exporter for local development and debugging
/// </remarks>
/// <example>
/// <code>
/// // Usage in Program.cs
/// var builder = WebApplication.CreateBuilder(args);
/// builder.AddOTelMetering();
/// </code>
/// </example>
public static class MeteringExtensions
{
	/// <summary>
	/// Configures OpenTelemetry metrics collection with automatic instrumentation and Azure Monitor export.
	/// This method enables comprehensive performance monitoring for ASP.NET Core applications and HTTP clients.
	/// </summary>
	/// <param name="builder">The <see cref="WebApplicationBuilder"/> to configure with OpenTelemetry metrics.</param>
	/// <remarks>
	/// This method configures metrics collection for:
	/// - ASP.NET Core instrumentation: HTTP request duration, response codes, and throughput
	/// - HTTP client instrumentation: Outbound request performance and dependency tracking
	/// - Console export during debugging for immediate feedback
	/// - Azure Monitor export for production monitoring and alerting
	/// - Managed Identity authentication for secure cloud integration
	/// </remarks>
	/// <exception cref="ArgumentNullException">
	/// Thrown when <paramref name="builder"/> is null.
	/// </exception>
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
