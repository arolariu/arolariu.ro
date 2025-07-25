namespace arolariu.Backend.Common.Telemetry;

using System;

using arolariu.Backend.Common.Options;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Provides extension methods for configuring Application Insights telemetry.
/// Enables monitoring, diagnostics, and performance analysis for the application.
/// </summary>
/// <remarks>
/// This class integrates with Azure Application Insights to automatically collect:
/// - HTTP requests and responses with timing and status codes
/// - Database queries and external service calls
/// - Unhandled exceptions with stack traces
/// - Performance metrics and custom business events
/// </remarks>
/// <example>
/// <code>
/// // Usage in Program.cs
/// var builder = WebApplication.CreateBuilder(args);
/// builder.AddTelemetry();
/// </code>
/// </example>
public static class TelemetryExtensions
{
	/// <summary>
	/// Configures Application Insights telemetry collection for the application.
	/// Retrieves the connection string from configuration and enables automatic data collection.
	/// </summary>
	/// <param name="builder">The <see cref="WebApplicationBuilder"/> to configure with telemetry.</param>
	/// <remarks>
	/// This method:
	/// - Retrieves Application Insights connection string from ApplicationInsightsEndpoint configuration
	/// - Enables automatic telemetry collection for requests, dependencies, and exceptions
	/// - Sets up correlation for distributed tracing across services
	/// </remarks>
	/// <exception cref="ArgumentNullException">
	/// Thrown when <paramref name="builder"/> is null.
	/// </exception>
	/// <exception cref="InvalidOperationException">
	/// Thrown when the Application Insights connection string is missing or invalid.
	/// </exception>
	public static void AddTelemetry(this WebApplicationBuilder builder)
	{
		ArgumentNullException.ThrowIfNull(builder);

		builder.Services.AddApplicationInsightsTelemetry(telemetryOptions =>
		{
			using ServiceProvider optionsManager = builder.Services.BuildServiceProvider();
			string instrumentationKey = new string(optionsManager
				.GetRequiredService<IOptionsManager>()
				.GetApplicationOptions()
				.ApplicationInsightsEndpoint);

			telemetryOptions.ConnectionString = instrumentationKey;
		});
	}
}
