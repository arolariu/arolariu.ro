namespace arolariu.Backend.Common.Telemetry.Tracing;

using System;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Reflection;

using arolariu.Backend.Common.Options;

using Azure.Identity;
using Azure.Monitor.OpenTelemetry.Exporter;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

#pragma warning disable CA2000 // Dispose objects before losing scope - ServiceProvider disposed after configuration

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

    // Get the connection string from IOptionsManager service
    using var serviceProvider = builder.Services.BuildServiceProvider();
    var connectionString = serviceProvider
      .GetRequiredService<IOptionsManager>()
      .GetApplicationOptions()
      .ApplicationInsightsEndpoint ?? string.Empty;

    builder.Services.AddOpenTelemetry().WithTracing(tracingOptions =>
    {
      // Configure service resource information for proper identification in Azure Application Insights
      tracingOptions.SetResourceBuilder(ResourceBuilder.CreateDefault()
        .AddService(
          serviceName: "arolariu.Backend.API",
          serviceVersion: Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0",
          serviceInstanceId: Environment.MachineName)
        .AddAttributes([
          new("deployment.environment", Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development"),
          new("service.namespace", "arolariu.ro")
        ]));

      // Register custom ActivitySources for domain-specific tracing
      tracingOptions.AddSource(CommonPackageTracing.Name);
      tracingOptions.AddSource(CorePackageTracing.Name);
      tracingOptions.AddSource(AuthPackageTracing.Name);
      tracingOptions.AddSource(InvoicePackageTracing.Name);

      // Add custom processor for span enrichment (must be added before exporters)
      tracingOptions.AddProcessor(new ActivityEnrichingProcessor());

      // Add framework instrumentation with enrichment callbacks
      tracingOptions.AddAspNetCoreInstrumentation(options =>
      {
        // Enrich incoming HTTP request spans with additional context
        options.EnrichWithHttpRequest = (activity, httpRequest) =>
        {
          activity?.SetTag("http.request.id", httpRequest.HttpContext.TraceIdentifier);
          activity?.SetTag("http.client.ip", httpRequest.HttpContext.Connection.RemoteIpAddress?.ToString());

          // Extract user identifier from claims if authenticated
          var userId = httpRequest.HttpContext.User.FindFirst("sub")?.Value
                    ?? httpRequest.HttpContext.User.FindFirst("userId")?.Value;
          if (!string.IsNullOrEmpty(userId))
          {
            activity?.SetTag("enduser.id", userId);
          }
        };

        // Enrich with response information
        options.EnrichWithHttpResponse = (activity, httpResponse) =>
        {
          activity?.SetTag("http.response.content_length", httpResponse.ContentLength);
        };

        // Record unhandled exceptions on spans
        options.RecordException = true;
      });

      tracingOptions.AddHttpClientInstrumentation(options =>
      {
        // Enrich outgoing HTTP client spans
        options.EnrichWithHttpRequestMessage = (activity, httpRequest) =>
        {
          activity?.SetTag("http.request.uri.host", httpRequest.RequestUri?.Host);
        };

        // Record exceptions for dependency failures
        options.RecordException = true;
      });

      tracingOptions.AddEntityFrameworkCoreInstrumentation();

      if (Debugger.IsAttached)
      {
        tracingOptions.AddConsoleExporter();
      }

      // Only add Azure Monitor exporter if connection string is configured
      if (!string.IsNullOrWhiteSpace(connectionString))
      {
        tracingOptions.AddAzureMonitorTraceExporter(monitorOptions =>
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
