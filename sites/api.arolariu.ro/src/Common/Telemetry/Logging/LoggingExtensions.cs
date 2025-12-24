namespace arolariu.Backend.Common.Telemetry.Logging;

using System;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Reflection;

using arolariu.Backend.Common.Options;

using Azure.Identity;
using Azure.Monitor.OpenTelemetry.Exporter;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using OpenTelemetry.Logs;
using OpenTelemetry.Resources;

#pragma warning disable CA2000 // Dispose objects before losing scope - ServiceProvider disposed after configuration

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
[ExcludeFromCodeCoverage] // Infrastructure wiring; excluded to allow 100% business logic coverage
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

    // Get the connection string from IOptionsManager service
    using var serviceProvider = builder.Services.BuildServiceProvider();
    var connectionString = serviceProvider
      .GetRequiredService<IOptionsManager>()
      .GetApplicationOptions()
      .ApplicationInsightsEndpoint ?? string.Empty;

    builder.Logging.AddOpenTelemetry(otelOptions =>
    {
      // Configure service resource information
      otelOptions.SetResourceBuilder(ResourceBuilder.CreateDefault()
        .AddService(
          serviceName: "arolariu.Backend.API",
          serviceVersion: Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0",
          serviceInstanceId: Environment.MachineName)
        .AddAttributes([
          new("deployment.environment", Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development"),
          new("service.namespace", "arolariu.ro")
        ]));

      otelOptions.IncludeFormattedMessage = true;
      otelOptions.IncludeScopes = true;

      if (Debugger.IsAttached)
      {
        otelOptions.AddConsoleExporter();
      }

      // Only add Azure Monitor exporter if connection string is configured
      if (!string.IsNullOrWhiteSpace(connectionString))
      {
        otelOptions.AddAzureMonitorLogExporter(monitorOptions =>
        {
          monitorOptions.ConnectionString = connectionString;
          monitorOptions.Credential = new DefaultAzureCredential(
#if !DEBUG
                      new DefaultAzureCredentialOptions
                      {
                          ManagedIdentityClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")
                      }
#endif
          );
        });
      }
    });
  }
}
