namespace arolariu.Backend.Core.Tests.Common.Telemetry;

using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Common.Telemetry;
using arolariu.Backend.Common.Telemetry.Logging;
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
/// and that required services can be resolved after configuration. Naming follows
/// the mandated <c>MethodName_Condition_ExpectedResult</c> convention.
/// </summary>
[SuppressMessage("Design", "CA1515", Justification = "MSTest requires public visibility for discovery.")]
[SuppressMessage("Naming", "CA1707", Justification = "Underscore naming pattern mandated for tests.")]
[SuppressMessage("Performance", "CA1848", Justification = "Single trivial log in test; performance delegate pattern unnecessary.")]
[TestClass]
public sealed class LoggingExtensionsTests
{
  private static AzureOptions CreateOptions()
  {
    return new()
    {
      ApplicationInsightsEndpoint = "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://eastus-0.in.applicationinsights.azure.com/"
    };
  }

  /// <summary>Ensures AddTelemetry completes and app can build with Application Insights config.</summary>
  [TestMethod]
  public void AddTelemetry_ConfiguresApplicationInsights()
  {
    var builder = WebApplication.CreateBuilder();
    builder.Services.AddSingleton<IOptionsManager>(new FakeOptionsManager(CreateOptions()));
    builder.AddTelemetry();
    using var app = builder.Build();
    Assert.IsNotNull(app);
  }

  /// <summary>Validates OpenTelemetry logging pipeline builds and logger factory available.</summary>
  [TestMethod]
  public void AddOTelLogging_ConfiguresOpenTelemetryLogging()
  {
    var builder = WebApplication.CreateBuilder();
    builder.Services.AddSingleton<IOptionsManager>(new FakeOptionsManager(CreateOptions()));
    builder.AddOTelLogging();
    using var app = builder.Build();
    var loggerFactory = app.Services.GetService<ILoggerFactory>();
    Assert.IsNotNull(loggerFactory);
    var logger = loggerFactory!.CreateLogger("test");
    logger.LogInformation("Test log message to exercise provider pipeline.");
  }

  /// <summary>Ensures metric configuration path executes without exception.</summary>
  [TestMethod]
  public void AddOTelMetering_ConfiguresMetrics()
  {
    var builder = WebApplication.CreateBuilder();
    builder.Services.AddSingleton<IOptionsManager>(new FakeOptionsManager(CreateOptions()));
    builder.AddOTelMetering();
    using var app = builder.Build();
    Assert.IsNotNull(app.Services);
  }

  /// <summary>Ensures tracing configuration path executes.</summary>
  [TestMethod]
  public void AddOTelTracing_ConfiguresTracing()
  {
    var builder = WebApplication.CreateBuilder();
    builder.Services.AddSingleton<IOptionsManager>(new FakeOptionsManager(CreateOptions()));
    builder.AddOTelTracing();
    using var app = builder.Build();
    Assert.IsNotNull(app.Services);
  }

  /// <summary>Verifies combined telemetry extensions coexist without runtime conflicts.</summary>
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

  /// <summary>Confirms auth + telemetry middleware configuration executes pipeline mapping twice safely.</summary>
  [TestMethod]
  public void UseAuthServices_Pipeline_CompletesAfterTelemetry()
  {
    var builder = WebApplication.CreateBuilder();
    builder.Services.AddSingleton<IOptionsManager>(new FakeOptionsManager(CreateOptions()));
    builder.AddAuthServices();
    builder.AddTelemetry();
    builder.AddOTelLogging();
    builder.AddOTelMetering();
    builder.AddOTelTracing();
    var app = builder.Build();
    app.UseAuthServices();
    app.UseAuthServices();
    Assert.IsNotNull(app);
  }
}
