namespace AppHost.Tests;

using System.Text.Json;
using global::AppHost.Repository;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies console filtering retains Aspire connection information without routine log noise.</summary>
[TestClass]
public sealed class LoggingConfigurationTests
{
  /// <summary>The default AppHost console retains startup announcements and warnings, but not routine information.</summary>
  [TestMethod]
  public void ConsoleLogging_AppHostSettings_PreservesAnnouncementsWithoutRoutineInformation()
  {
    using ConfigurationRoot configuration = CreateConfiguration([]);

    AssertConsolePolicy(configuration);
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
    ILogger announcements = factory.CreateLogger("Aspire.Hosting.DistributedApplication");
    Assert.IsTrue(announcements.IsEnabled(LogLevel.Information), "Dashboard login and endpoint announcements must remain visible.");
    Assert.IsFalse(announcements.IsEnabled(LogLevel.Debug));
    foreach (string category in new[] { "Aspire.Hosting.Dcp", "Aspire.Hosting.Backchannel",
      "Microsoft.Extensions.Http.DefaultHttpClientFactory", "Microsoft.Hosting.Lifetime", "AppHost.LocalDevelopment.Reset" })
    {
      ILogger logger = factory.CreateLogger(category);
      Assert.IsFalse(logger.IsEnabled(LogLevel.Information), $"Routine console information must be suppressed for {category}.");
      Assert.IsFalse(logger.IsEnabled(LogLevel.Debug));
      Assert.IsTrue(logger.IsEnabled(LogLevel.Warning), $"Console warnings must remain visible for {category}.");
      Assert.IsTrue(logger.IsEnabled(LogLevel.Error));
    }
  }
}
