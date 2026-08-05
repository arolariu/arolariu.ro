namespace arolariu.Backend.Core.Tests.Common.Http;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Http;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests for <see cref="RequestCancellation"/> covering the two-tier token policy:
/// reads follow the client, writes deliberately do not.
/// </summary>
[TestClass]
public sealed class RequestCancellationTests
{
  private sealed class StubLifetime : IHostApplicationLifetime, IDisposable
  {
    private readonly CancellationTokenSource stopping = new();

    public CancellationToken ApplicationStarted => CancellationToken.None;

    public CancellationToken ApplicationStopping => stopping.Token;

    public CancellationToken ApplicationStopped => CancellationToken.None;

    public void StopApplication() => stopping.Cancel();

    public void Dispose() => stopping.Dispose();
  }

  private sealed class StubTimeoutFeature : IHttpRequestTimeoutFeature, IDisposable
  {
    private readonly CancellationTokenSource cts;

    public StubTimeoutFeature(bool cancelled)
    {
      cts = new CancellationTokenSource();
      if (cancelled) cts.Cancel();
    }

    public CancellationToken RequestTimeoutToken => cts.Token;

    public void DisableTimeout() { }

    public void Dispose() => cts.Dispose();
  }

  private static DefaultHttpContext CreateContext(IHostApplicationLifetime lifetime)
  {
    var services = new ServiceCollection();
    services.AddSingleton(lifetime);
    return new DefaultHttpContext { RequestServices = services.BuildServiceProvider() };
  }

  /// <summary>Verifies that ForWrite ignores client disconnect.</summary>
  [TestMethod]
  public void ForWrite_IgnoresClientDisconnect()
  {
    using var aborted = new CancellationTokenSource();
    using var lifetime = new StubLifetime();
    var context = CreateContext(lifetime);
    context.RequestAborted = aborted.Token;

    using var scope = RequestCancellation.ForWrite(context, TimeSpan.FromMinutes(5));

    aborted.Cancel();
    Assert.IsFalse(
      scope.Token.IsCancellationRequested,
      "Writes must survive a client disconnect to avoid ambiguous partial state.");
  }

  /// <summary>Verifies that ForWrite honours application shutdown.</summary>
  [TestMethod]
  public void ForWrite_HonoursApplicationShutdown()
  {
    using var lifetime = new StubLifetime();
    var context = CreateContext(lifetime);

    using var scope = RequestCancellation.ForWrite(context, TimeSpan.FromMinutes(5));

    lifetime.StopApplication();
    Assert.IsTrue(scope.Token.IsCancellationRequested, "Writes must abort on application shutdown.");
  }

  /// <summary>Verifies that ForWrite honours its own time budget.</summary>
  [TestMethod]
  public async Task ForWrite_HonoursItsOwnBudget()
  {
    using var lifetime = new StubLifetime();
    var context = CreateContext(lifetime);

    using var scope = RequestCancellation.ForWrite(context, TimeSpan.FromMilliseconds(50));

    // Poll until cancelled or the generous ceiling expires — avoids timing races on loaded CI.
    using var ceiling = new CancellationTokenSource(TimeSpan.FromSeconds(5));
    while (!scope.Token.IsCancellationRequested && !ceiling.IsCancellationRequested)
      await Task.Delay(10, CancellationToken.None).ConfigureAwait(false);

    Assert.IsTrue(scope.Token.IsCancellationRequested, "Writes must abort when their budget elapses.");
  }

  /// <summary>Verifies that WasTimeout returns false when no timeout feature is present.</summary>
  [TestMethod]
  public void WasTimeout_WithoutTimeoutFeature_ReturnsFalse()
  {
    using var lifetime = new StubLifetime();
    var context = CreateContext(lifetime);

    Assert.IsFalse(
      RequestCancellation.WasTimeout(context),
      "Absent the timeout feature, a cancellation is a client abort.");
  }

  /// <summary>Verifies that WasTimeout returns true when the timeout feature's token is cancelled.</summary>
  [TestMethod]
  public void WasTimeout_WithCancelledTimeoutToken_ReturnsTrue()
  {
    using var lifetime = new StubLifetime();
    var context = CreateContext(lifetime);
    using var stub = new StubTimeoutFeature(cancelled: true);
    context.Features.Set<IHttpRequestTimeoutFeature>(stub);

    Assert.IsTrue(
      RequestCancellation.WasTimeout(context),
      "A cancelled RequestTimeoutToken must be classified as a server-side timeout.");
  }

  /// <summary>
  /// Verifies that WasTimeout does not misclassify a client abort as a timeout when the
  /// timeout feature is present but its token is NOT cancelled.
  /// </summary>
  [TestMethod]
  public void WasTimeout_ClientAbortWithTimeoutFeaturePresent_ReturnsFalse()
  {
    using var lifetime = new StubLifetime();
    var context = CreateContext(lifetime);
    using var stub = new StubTimeoutFeature(cancelled: false);
    context.Features.Set<IHttpRequestTimeoutFeature>(stub);

    using var aborted = new CancellationTokenSource();
    context.RequestAborted = aborted.Token;
    aborted.Cancel();

    Assert.IsFalse(
      RequestCancellation.WasTimeout(context),
      "A client abort with a non-cancelled timeout token must NOT be classified as a timeout.");
  }
}

