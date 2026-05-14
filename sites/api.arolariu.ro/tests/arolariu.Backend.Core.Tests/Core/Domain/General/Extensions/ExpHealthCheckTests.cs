namespace arolariu.Backend.Core.Tests.Core.Domain.General.Extensions;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Configuration;
using arolariu.Backend.Core.Domain.General.Extensions;

using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for <see cref="ExpHealthCheck"/> covering the three observable paths:
/// healthy (2xx), unhealthy (non-2xx), and exception (unreachable).
/// </summary>
[TestClass]
public sealed class ExpHealthCheckTests
{
  // HealthCheckContext is not read by ExpHealthCheck, so a default instance is sufficient.
  private static readonly HealthCheckContext DummyContext = new()
  {
    Registration = new HealthCheckRegistration("exp", _ => null!, null, null),
  };

  /// <summary>
  /// Verifies that when <see cref="IConfigProxyClient.PingAsync"/> returns <see langword="true"/>
  /// (HTTP 2xx from exp), <see cref="ExpHealthCheck"/> reports <see cref="HealthStatus.Healthy"/>.
  /// </summary>
  [TestMethod]
  public async Task CheckHealthAsync_PingReturnsTrue_ReturnsHealthy()
  {
    var check = new ExpHealthCheck(new StubConfigProxyClient(pingResult: true));

    var result = await check.CheckHealthAsync(DummyContext).ConfigureAwait(false);

    Assert.AreEqual(HealthStatus.Healthy, result.Status);
    Assert.AreEqual("exp responded 2xx at /api/ready.", result.Description);
  }

  /// <summary>
  /// Verifies that when <see cref="IConfigProxyClient.PingAsync"/> returns <see langword="false"/>
  /// (non-2xx from exp, e.g. HTTP 503), <see cref="ExpHealthCheck"/> reports
  /// <see cref="HealthStatus.Unhealthy"/> with the expected description.
  /// </summary>
  [TestMethod]
  public async Task CheckHealthAsync_PingReturnsFalse_ReturnsUnhealthy()
  {
    var check = new ExpHealthCheck(new StubConfigProxyClient(pingResult: false));

    var result = await check.CheckHealthAsync(DummyContext).ConfigureAwait(false);

    Assert.AreEqual(HealthStatus.Unhealthy, result.Status);
    Assert.AreEqual("exp /api/ready did not return a 2xx status.", result.Description);
  }

  /// <summary>
  /// Verifies that when <see cref="IConfigProxyClient.PingAsync"/> throws (e.g. network timeout,
  /// TLS failure, or <see cref="OperationCanceledException"/>), <see cref="ExpHealthCheck"/>
  /// catches the exception and reports <see cref="HealthStatus.Unhealthy"/> embedding the
  /// exception message in the description.
  /// </summary>
  [TestMethod]
  public async Task CheckHealthAsync_PingThrows_ReturnsUnhealthyWithExceptionMessage()
  {
    const string exceptionMessage = "Connection refused (localhost:5002).";
    var check = new ExpHealthCheck(
        new StubConfigProxyClient(pingResult: false, exception: new InvalidOperationException(exceptionMessage)));

    var result = await check.CheckHealthAsync(DummyContext).ConfigureAwait(false);

    Assert.AreEqual(HealthStatus.Unhealthy, result.Status);
    Assert.IsNotNull(result.Description);
    StringAssert.Contains(result.Description, exceptionMessage);
    StringAssert.StartsWith(result.Description, "exp unreachable:");
  }

  // ---------------------------------------------------------------------------
  // Test double
  // ---------------------------------------------------------------------------

  [SuppressMessage("Performance", "CA1812:Avoid uninstantiated internal classes",
      Justification = "Instantiated inside test methods via the public constructor.")]
  private sealed class StubConfigProxyClient(bool pingResult, Exception? exception = null)
      : IConfigProxyClient
  {
    /// <inheritdoc />
    public Task<ConfigValueResponse?> GetConfigValueAsync(
        string name,
        string? label = null,
        CancellationToken ct = default)
        => Task.FromResult<ConfigValueResponse?>(null);

    /// <inheritdoc />
    public Task<bool> PingAsync(CancellationToken ct = default)
    {
      if (exception is not null)
      {
        throw exception;
      }

      return Task.FromResult(pingResult);
    }
  }
}
