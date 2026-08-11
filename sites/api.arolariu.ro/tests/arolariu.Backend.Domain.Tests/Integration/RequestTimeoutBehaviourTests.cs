namespace arolariu.Backend.Domain.Tests.Integration;

using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Pins the ASP.NET Core behaviours the cancellation contract depends on:
/// (1) the RequestTimeouts middleware writes the timeout response only when the exception
/// escapes the handler, (2) a handler that catches owns the response itself, and
/// (3) IHttpRequestTimeoutFeature.RequestTimeoutToken lets such a handler still emit 504.
/// </summary>
[TestClass]
public sealed class RequestTimeoutBehaviourTests
{
  private const string PolicyName = "test-policy";

  /// <summary>
  /// Verifies that when a cancellation token is signalled and the handler does not catch it,
  /// the RequestTimeouts middleware writes a 504 Gateway Timeout response.
  /// </summary>
  [TestMethod]
  public async Task RequestTimeouts_WhenExceptionEscapesHandler_MiddlewareWrites504()
  {
    var app = BuildApp(handlerCatchesCancellation: false);

    await app.StartAsync();
    using var client = app.GetTestClient();

    using var response = await client.GetAsync(new Uri("/slow", UriKind.Relative));

    // Nothing caught the cancellation, so the middleware owns the response.
    Assert.AreEqual(HttpStatusCode.GatewayTimeout, response.StatusCode);

    await app.StopAsync();
  }

  /// <summary>
  /// Verifies that when a handler catches an OperationCanceledException and returns a 500
  /// response, the client receives that 500 status code, not a 504 from the middleware.
  /// </summary>
  [TestMethod]
  public async Task RequestTimeouts_WhenHandlerCatches_HandlerOwnsTheResponse()
  {
    var app = BuildApp(handlerCatchesCancellation: true);

    await app.StartAsync();
    using var client = app.GetTestClient();

    using var response = await client.GetAsync(new Uri("/slow", UriKind.Relative));

    // The handler swallowed the cancellation and returned 500, so the middleware never saw a
    // fault. This is why every endpoint's catch block must produce the correct status itself —
    // the middleware is only a fallback for cancellations that escape.
    Assert.AreEqual(HttpStatusCode.InternalServerError, response.StatusCode);

    await app.StopAsync();
  }

  /// <summary>
  /// Verifies that a handler catching OperationCanceledException can consult
  /// IHttpRequestTimeoutFeature.RequestTimeoutToken to discriminate a timeout from a client abort,
  /// and emit 504 Gateway Timeout for a timeout even though it caught the exception.
  /// </summary>
  [TestMethod]
  public async Task RequestTimeoutToken_LetsAHandlerReturnTheCorrectStatus()
  {
    var app = BuildApp(handlerCatchesCancellation: true, discriminateWithTimeoutFeature: true);

    await app.StartAsync();
    using var client = app.GetTestClient();

    using var response = await client.GetAsync(new Uri("/slow", UriKind.Relative));

    // Proves the mechanism HandleCancellation relies on: a catching handler can still emit 504
    // by consulting IHttpRequestTimeoutFeature.RequestTimeoutToken.
    Assert.AreEqual(HttpStatusCode.GatewayTimeout, response.StatusCode);

    await app.StopAsync();
  }

  /// <summary>
  /// Verifies that CosmosOperationCanceledException derives from OperationCanceledException,
  /// so that Cosmos cancellation can be caught by a base OperationCanceledException catch block
  /// in the broker layer without being reclassified as a CosmosException.
  /// </summary>
  [TestMethod]
  public void CosmosOperationCanceledException_DerivesFrom_OperationCanceledException()
  {
    // Guards the broker layer: TranslateInvoiceCosmosAsync catches only CosmosException,
    // so Cosmos cancellation must NOT be a CosmosException or it would be reclassified.
    Assert.IsTrue(
      typeof(OperationCanceledException).IsAssignableFrom(
        typeof(Microsoft.Azure.Cosmos.CosmosOperationCanceledException)),
      "CosmosOperationCanceledException must derive from OperationCanceledException.");
  }

  private static WebApplication BuildApp(
    bool handlerCatchesCancellation,
    bool discriminateWithTimeoutFeature = false)
  {
    var builder = WebApplication.CreateBuilder();
    builder.WebHost.UseTestServer();
    builder.Services.AddRequestTimeouts(options =>
      options.AddPolicy(PolicyName, new RequestTimeoutPolicy
      {
        Timeout = TimeSpan.FromMilliseconds(100),
        TimeoutStatusCode = StatusCodes.Status504GatewayTimeout,
      }));

    var app = builder.Build();
    app.UseRequestTimeouts();

    app.MapGet("/slow", async (HttpContext context, CancellationToken token) =>
    {
      if (!handlerCatchesCancellation)
      {
        await Task.Delay(TimeSpan.FromSeconds(30), token);
        return Results.Ok();
      }

      try
      {
        await Task.Delay(TimeSpan.FromSeconds(30), token);
        return Results.Ok();
      }
      catch (OperationCanceledException)
      {
        if (!discriminateWithTimeoutFeature)
        {
          return Results.StatusCode(StatusCodes.Status500InternalServerError);
        }

        var feature = context.Features.Get<IHttpRequestTimeoutFeature>();
        var isTimeout = feature?.RequestTimeoutToken.IsCancellationRequested == true;
        return Results.StatusCode(isTimeout ? StatusCodes.Status504GatewayTimeout : 499);
      }
    }).WithRequestTimeout(PolicyName);

    return app;
  }
}
