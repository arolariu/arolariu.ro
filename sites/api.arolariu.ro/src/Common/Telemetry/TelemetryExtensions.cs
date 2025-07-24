namespace arolariu.Backend.Common.Telemetry;

using System;

using arolariu.Backend.Common.Options;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Extensions for telemetry.
/// </summary>
public static class TelemetryExtensions
{
	/// <summary>
	/// Adds telemetry to the application.
	/// </summary>
	/// <param name="builder"></param>
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
