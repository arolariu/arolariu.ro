namespace arolariu.Backend.Common.Telemetry;
using arolariu.Backend.Common.Options;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using System;

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
		builder.Services.AddApplicationInsightsTelemetry(options =>
		{
			var instrumentationKey = builder.Configuration[$"{nameof(CommonOptions)}:ApplicationInsightsEndpoint"];
			options.ConnectionString = instrumentationKey;
		});
	}
}
