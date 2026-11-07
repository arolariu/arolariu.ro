namespace AppHost.Tests;

using System.Text.Json;
using global::AppHost.Repository;
using Aspire.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies console filtering retains Aspire connection information without routine log noise.</summary>
[TestClass]
public sealed class LoggingConfigurationTests
{
  private static readonly Lazy<LoggerFilterRule[]> AspireCategoryRules = new(() =>
  {
    var builder = DistributedApplication.CreateBuilder(new DistributedApplicationOptions { Args = [] });
    using DistributedApplication app = builder.Build();
    LoggerFilterRule[] rules = [.. app.Services.GetRequiredService<IOptions<LoggerFilterOptions>>().Value.Rules
      .Where(rule => rule.ProviderName is null && rule.CategoryName is not null && rule.LogLevel is not null)];
    Assert.IsTrue(rules.Length > 0, "Aspire's built-in console category filters must be discoverable.");
    return rules;
  });

  /// <summary>The default AppHost console retains startup announcements and warnings, but not routine information.</summary>
  [TestMethod]
  public void ConsoleLogging_AppHostSettings_PreservesAnnouncementsWithoutRoutineInformation()
  {
    using ConfigurationRoot configuration = CreateConfiguration([]);

    AssertConsolePolicy(configuration);
  }

  /// <summary>The CLI's Debug AppHost level cannot bypass the console policy or Aspire's own category filters.</summary>
  [TestMethod]
  public void ConsoleLogging_CliDebugLevel_PreservesAnnouncementsWithoutRoutineInformation()
  {
    var builder = DistributedApplication.CreateBuilder(new DistributedApplicationOptions { Args = ["--ASPIRE_LOGLEVEL=Debug"] });
    builder.Configuration.AddJsonFile(Path.Combine(Projects.AppHost.ProjectPath, "appsettings.json"));
    builder.Services.RemoveAll<ILoggerProvider>();
    builder.Services.AddLogging(logging => logging.AddConsole());
    using DistributedApplication app = builder.Build();
    Assert.IsTrue(app.Services.GetRequiredService<IOptions<LoggerFilterOptions>>().Value.Rules.Any(rule =>
      rule is { ProviderName: null, CategoryName: null, LogLevel: LogLevel.Debug }), "The CLI Debug rule must be active.");

    AssertConsolePolicy(app.Services.GetRequiredService<ILoggerFactory>());
  }

  /// <summary>Engine-specific VS Code overrides retain the same console policy in debug and run profiles.</summary>
  [TestMethod]
  [DataRow("podman", false)]
  [DataRow("docker", false)]
  [DataRow("podman", true)]
  [DataRow("docker", true)]
  public void ConsoleLogging_EngineLaunchProfile_PreservesAnnouncementsWithoutRoutineInformation(string engine, bool noDebug)
  {
    RepositoryLayout layout = RepositoryLayout.Resolve(Projects.AppHost.ProjectPath);
    using JsonDocument launch = JsonDocument.Parse(File.ReadAllText(Path.Combine(layout.RootDirectory, ".vscode", "launch.json")));
    JsonElement profile = launch.RootElement.GetProperty("configurations").EnumerateArray().Single(candidate =>
      candidate.TryGetProperty("env", out JsonElement environment)
      && environment.TryGetProperty("ASPIRE_CONTAINER_RUNTIME", out JsonElement runtime)
      && runtime.GetString() == engine
      && (candidate.TryGetProperty("noDebug", out JsonElement disabled) && disabled.GetBoolean()) == noDebug);
    Dictionary<string, string?> overrides = profile.GetProperty("env").EnumerateObject()
      .Where(property => property.Name.StartsWith("Logging__", StringComparison.Ordinal))
      .ToDictionary(property => property.Name.Replace("__", ":", StringComparison.Ordinal), property => property.Value.GetString());
    using ConfigurationRoot configuration = CreateConfiguration(overrides);

    AssertConsolePolicy(configuration);
  }

  private static ConfigurationRoot CreateConfiguration(IEnumerable<KeyValuePair<string, string?>> overrides) =>
    (ConfigurationRoot)new ConfigurationBuilder()
      .AddJsonFile(Path.Combine(Projects.AppHost.ProjectPath, "appsettings.json"))
      .AddInMemoryCollection(overrides)
      .Build();

  private static void AssertConsolePolicy(IConfiguration configuration)
  {
    using ILoggerFactory factory = LoggerFactory.Create(logging =>
      logging.AddConfiguration(configuration.GetSection("Logging")).AddConsole());
    AssertConsolePolicy(factory);
  }

  private static void AssertConsolePolicy(ILoggerFactory factory)
  {
    ILogger announcements = factory.CreateLogger("Aspire.Hosting.DistributedApplication");
    Assert.IsTrue(announcements.IsEnabled(LogLevel.Information), "Dashboard login and endpoint announcements must remain visible.");
    Assert.IsFalse(announcements.IsEnabled(LogLevel.Debug));
    ILogger healthChecks = factory.CreateLogger("Microsoft.Extensions.Diagnostics.HealthChecks.DefaultHealthCheckService");
    Assert.IsFalse(healthChecks.IsEnabled(LogLevel.Critical), "Health is reported by the dashboard, not the console.");
    ILogger appHostServer = factory.CreateLogger("Microsoft.AspNetCore.Server.Kestrel");
    Assert.IsFalse(appHostServer.IsEnabled(LogLevel.Warning), "AppHost endpoint override warnings must stay suppressed.");
    Assert.IsTrue(appHostServer.IsEnabled(LogLevel.Error), "AppHost server errors must remain visible.");
    foreach (string category in new[] { "Aspire.Hosting.Dcp", "Aspire.Hosting.Backchannel",
      "Aspire.Hosting.Dashboard", "Microsoft.Extensions.Http.DefaultHttpClientFactory",
      "Microsoft.Hosting.Lifetime", "Microsoft.AspNetCore.Server.Kestrel.Core.KestrelServer",
      "AppHost.LocalDevelopment.Reset" })
    {
      ILogger logger = factory.CreateLogger(category);
      Assert.IsFalse(logger.IsEnabled(LogLevel.Information), $"Routine console information must be suppressed for {category}.");
      Assert.IsFalse(logger.IsEnabled(LogLevel.Debug));
      Assert.IsTrue(logger.IsEnabled(LogLevel.Warning), $"Console warnings must remain visible for {category}.");
      Assert.IsTrue(logger.IsEnabled(LogLevel.Error));
    }

    foreach (LoggerFilterRule rule in AspireCategoryRules.Value)
    {
      ILogger logger = factory.CreateLogger(rule.CategoryName!);
      LogLevel nativeLevel = rule.LogLevel!.Value;
      if (nativeLevel > LogLevel.Trace)
      {
        Assert.IsFalse(logger.IsEnabled(nativeLevel - 1), $"Console must keep Aspire's {nativeLevel} filter for {rule.CategoryName}.");
      }

      if (nativeLevel < LogLevel.None)
      {
        LogLevel visibleLevel = nativeLevel > LogLevel.Warning ? nativeLevel : LogLevel.Warning;
        Assert.IsTrue(logger.IsEnabled(visibleLevel), $"Console must keep {visibleLevel} logs visible for {rule.CategoryName}.");
      }
    }
  }
}
