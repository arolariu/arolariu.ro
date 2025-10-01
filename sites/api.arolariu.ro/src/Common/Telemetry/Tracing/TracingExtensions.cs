namespace arolariu.Backend.Common.Telemetry.Tracing;

using System;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Options;

using Azure.Identity;
using Azure.Monitor.OpenTelemetry.Exporter;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using OpenTelemetry.Trace;

/// <summary>
/// Provides extension methods for configuring OpenTelemetry distributed tracing with Azure Monitor integration.
/// This class sets up comprehensive request tracing across application layers and external dependencies.
/// </summary>
/// <remarks>
/// This extension configures:
/// - ASP.NET Core instrumentation for HTTP request tracing
/// - HTTP client instrumentation for outbound dependency tracking
/// - Entity Framework Core instrumentation for database operation tracing
/// - Azure Monitor exporter for distributed trace visualization
/// </remarks>
/// <example>
/// <code>
/// // Usage in Program.cs
/// var builder = WebApplication.CreateBuilder(args);
/// builder.AddOTelTracing();
/// </code>
/// </example>
[ExcludeFromCodeCoverage] // Infrastructure wiring; excluded to allow 100% business logic coverage
public static class TracingExtensions
{
  /// <summary>
  /// Configures OpenTelemetry distributed tracing with comprehensive instrumentation and Azure Monitor export.
  /// This method enables end-to-end request tracing across all application layers and external dependencies.
  /// </summary>
  /// <param name="builder">The <see cref="WebApplicationBuilder"/> to configure with OpenTelemetry tracing.</param>
  /// <remarks>
  /// This method configures tracing instrumentation for:
  /// - ASP.NET Core: HTTP request spans with timing, status codes, and routing information
  /// - HTTP Client: Outbound request tracing for dependency monitoring and performance analysis
  /// - Entity Framework Core: Database query tracing with SQL execution times and connection details
  /// - Console export during debugging for immediate trace visibility
  /// - Azure Monitor export for production distributed tracing and correlation
  /// - Managed Identity authentication for secure Azure integration
  /// </remarks>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="builder"/> is null.
  /// </exception>
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
