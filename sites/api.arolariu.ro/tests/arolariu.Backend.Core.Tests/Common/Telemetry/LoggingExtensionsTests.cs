namespace arolariu.Backend.Core.Tests.Common.Telemetry;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Common.Telemetry.Logging;
using arolariu.Backend.Common.Telemetry;
using arolariu.Backend.Common.Telemetry.Metering;
using arolariu.Backend.Common.Telemetry.Tracing;
using arolariu.Backend.Core.Auth.Modules;
using arolariu.Backend.Core.Tests.Shared.TestDoubles;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Smoke tests for telemetry extension methods to exercise configuration code paths.
/// These do not assert exporter internals (Azure Monitor SDK) but ensure no exceptions
/// and that required services can be resolved after configuration.
/// </summary>
[TestClass]
public sealed class LoggingExtensionsTests
{
  private static AzureOptions CreateOptions() => new()
  {
    ApplicationInsightsEndpoint = "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://eastus-0.in.applicationinsights.azure.com/"
  };

  [TestMethod]
  public void AddTelemetry_ConfiguresApplicationInsights()
  {
    var builder = WebApplication.CreateBuilder();
    builder.Services.AddSingleton<IOptionsManager>(new FakeOptionsManager(CreateOptions()));

    builder.AddTelemetry();

    // Build to force options/service resolution path executed inside AddTelemetry.
    using var app = builder.Build();

    // If we reach here without exception, configuration path executed.
    Assert.IsNotNull(app);
  }

  [TestMethod]
  public void AddOTelLogging_ConfiguresOpenTelemetryLogging()
  {
    var builder = WebApplication.CreateBuilder();
    builder.Services.AddSingleton<IOptionsManager>(new FakeOptionsManager(CreateOptions()));

    builder.AddOTelLogging();

    using var app = builder.Build();
    var loggerFactory = app.Services.GetService<Microsoft.Extensions.Logging.ILoggerFactory>();
    Assert.IsNotNull(loggerFactory);

    var logger = loggerFactory!.CreateLogger("test");
    logger.LogInformation("Test log message to exercise provider pipeline.");
  }

  [TestMethod]
  public void AddOTelMetering_ConfiguresMetrics()
  {
    var builder = WebApplication.CreateBuilder();
    builder.Services.AddSingleton<IOptionsManager>(new FakeOptionsManager(CreateOptions()));

    builder.AddOTelMetering();

    using var app = builder.Build();
    // Resolving a service to ensure container build succeeded.
    Assert.IsNotNull(app.Services);
  }

  [TestMethod]
  public void AddOTelTracing_ConfiguresTracing()
  {
    var builder = WebApplication.CreateBuilder();
    builder.Services.AddSingleton<IOptionsManager>(new FakeOptionsManager(CreateOptions()));

    builder.AddOTelTracing();

    using var app = builder.Build();
    Assert.IsNotNull(app.Services);
  }

  [TestMethod]
  public void CombinedTelemetryExtensions_WorkTogether()
  {
    var builder = WebApplication.CreateBuilder();
    builder.Services.AddSingleton<IOptionsManager>(new FakeOptionsManager(CreateOptions()));
    builder.AddTelemetry();
    builder.AddOTelLogging();
    builder.AddOTelMetering();
    builder.AddOTelTracing();

    using var app = builder.Build();
    Assert.IsNotNull(app.Services.GetService<IOptionsManager>());
  }

  [TestMethod]
  public void UseAuthServices_Pipeline_CompletesAfterTelemetry()
  {
    var builder = WebApplication.CreateBuilder();
    builder.Services.AddSingleton<IOptionsManager>(new FakeOptionsManager(CreateOptions()));

    // Auth + telemetry configuration
    builder.AddAuthServices();
    builder.AddTelemetry();
    builder.AddOTelLogging();
    builder.AddOTelMetering();
    builder.AddOTelTracing();

    var app = builder.Build();
    // Exercise pipeline extension (ensures internal MapAuthEndpoints + auth middlewares invoked).
    app.UseAuthServices();

    // Double invocation should remain safe (idempotent expectation for mapping & middleware order).
    app.UseAuthServices();

    Assert.IsNotNull(app);
  }
}
