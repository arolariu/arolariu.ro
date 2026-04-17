namespace arolariu.Backend.Core.Tests.Common.Http;

using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Common.Http;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests for <see cref="ExceptionMappingHandler"/> covering exception routing through
/// the static mapper, ProblemDetails response writing, and Activity telemetry recording.
/// </summary>
[TestClass]
public sealed class ExceptionMappingHandlerTests
{
  private sealed class NotFoundEx : Exception, INotFoundException { public NotFoundEx(string m) : base(m) { } }

  /// <summary>
  /// A minimal <see cref="IHttpResponseFeature"/> implementation that allows setting HasStarted.
  /// </summary>
  private sealed class TestHttpResponseFeature : IHttpResponseFeature
  {
    public Stream Body { get; set; } = new MemoryStream();
    public bool HasStarted { get; set; }
    public IHeaderDictionary Headers { get; set; } = new HeaderDictionary();
    public int StatusCode { get; set; } = 200;
    public string? ReasonPhrase { get; set; }

    public void OnCompleted(Func<object, Task> callback, object state) { }
    public void OnStarting(Func<object, Task> callback, object state) { }
  }

  /// <summary>
  /// Builds a <see cref="DefaultHttpContext"/> wired with a logging <see cref="IServiceProvider"/>
  /// and an in-memory response body, suitable for exercising <see cref="ExceptionMappingHandler"/>
  /// end-to-end (mapper dispatch + result execution).
  /// </summary>
  /// <returns>A fresh <see cref="HttpContext"/> per invocation — do not reuse between tests.</returns>
  private static DefaultHttpContext CreateHttpContextWithLoggingServices()
  {
    var services = new ServiceCollection()
      .AddLogging()
      .BuildServiceProvider();

    return new DefaultHttpContext
    {
      Response = { Body = new MemoryStream() },
      RequestServices = services,
    };
  }

  /// <summary>
  /// Verifies that a classifiable exception (implementing a marker interface) is mapped
  /// to the correct HTTP status code, written as ProblemDetails, and handler returns true.
  /// </summary>
  [TestMethod]
  public async Task TryHandleAsync_ClassifiableException_WritesProblemDetailsAndReturnsTrue()
  {
    // Arrange
    var handler = new ExceptionMappingHandler();
    var context = CreateHttpContextWithLoggingServices();
    var exception = new NotFoundEx("Resource not found");

    // Act
    var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

    // Assert
    Assert.IsTrue(handled);
    Assert.AreEqual(404, context.Response.StatusCode);
    Assert.IsNotNull(context.Response.ContentType);
    Assert.IsTrue(
      context.Response.ContentType!.Contains("application/problem+json", StringComparison.Ordinal),
      $"Expected content-type to contain 'application/problem+json' but got '{context.Response.ContentType}'.");
  }

  /// <summary>
  /// Verifies that an unclassifiable (plain) exception is mapped to HTTP 500 Internal Server Error,
  /// written as ProblemDetails, and handler returns true.
  /// </summary>
  [TestMethod]
  public async Task TryHandleAsync_UnclassifiableException_WritesInternalServerError()
  {
    // Arrange
    var handler = new ExceptionMappingHandler();
    var context = CreateHttpContextWithLoggingServices();
    var exception = new InvalidOperationException("surprise");

    // Act
    var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

    // Assert
    Assert.IsTrue(handled);
    Assert.AreEqual(500, context.Response.StatusCode);
    Assert.IsNotNull(context.Response.ContentType);
    Assert.IsTrue(
      context.Response.ContentType!.Contains("application/problem+json", StringComparison.Ordinal),
      $"Expected content-type to contain 'application/problem+json' but got '{context.Response.ContentType}'.");
  }

  /// <summary>
  /// Verifies that <see cref="ExceptionMappingHandler.TryHandleAsync"/> rejects a null
  /// <see cref="HttpContext"/> with <see cref="ArgumentNullException"/> — the null guard
  /// is the first statement in the method to fail fast before any mapper dispatch.
  /// </summary>
  [TestMethod]
  public async Task TryHandleAsync_NullHttpContext_ThrowsArgumentNullException()
  {
    var handler = new ExceptionMappingHandler();

    await Assert.ThrowsExactlyAsync<ArgumentNullException>(
      () => handler.TryHandleAsync(httpContext: null!, exception: new InvalidOperationException(), CancellationToken.None).AsTask());
  }

  /// <summary>
  /// Verifies that <see cref="ExceptionMappingHandler.TryHandleAsync"/> rejects a null
  /// <see cref="Exception"/> with <see cref="ArgumentNullException"/> — complements the
  /// null-context guard to ensure the handler is defensive on both required inputs.
  /// </summary>
  [TestMethod]
  public async Task TryHandleAsync_NullException_ThrowsArgumentNullException()
  {
    var handler = new ExceptionMappingHandler();
    var context = CreateHttpContextWithLoggingServices();

    await Assert.ThrowsExactlyAsync<ArgumentNullException>(
      () => handler.TryHandleAsync(context, exception: null!, CancellationToken.None).AsTask());
  }

  /// <summary>
  /// Rewinds the response body stream to position 0 and reads the full content as a string.
  /// This helper prevents silent empty reads when body position is not manually reset; all
  /// body-reading tests should call this method rather than implementing inline rewind logic.
  /// </summary>
  /// <param name="context">The <see cref="HttpContext"/> whose response body will be read.</param>
  /// <returns>The response body content as a string.</returns>
  private static async Task<string> ReadResponseBodyAsync(HttpContext context)
  {
    context.Response.Body.Position = 0;
    using var reader = new StreamReader(context.Response.Body, leaveOpen: true);
    return await reader.ReadToEndAsync();
  }

  /// <summary>
  /// Verifies that when an ambient <see cref="Activity"/> is present, the emitted
  /// ProblemDetails body includes a <c>traceId</c> extension matching
  /// <c>Activity.Current.TraceId</c>. This is the correlation hook that lets clients
  /// and SREs tie a 4xx/5xx response back to the originating distributed trace.
  /// </summary>
  [TestMethod]
  public async Task TryHandleAsync_ClassifiableException_IncludesTraceIdWhenActivityPresent()
  {
    // Arrange — register a listener that samples EVERYTHING so StartActivity actually
    // produces a non-null Activity (default sampling yields null outside a host).
    using var listener = new ActivityListener
    {
      ShouldListenTo = _ => true,
      Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllData,
    };
    ActivitySource.AddActivityListener(listener);

    using var source = new ActivitySource("arolariu.tests.ExceptionMappingHandler");
    using var activity = source.StartActivity("test-op");
    Assert.IsNotNull(activity, "ActivityListener wiring failed; StartActivity returned null.");

    var handler = new ExceptionMappingHandler();
    var context = CreateHttpContextWithLoggingServices();

    // Act
    await handler.TryHandleAsync(context, new NotFoundEx("nope"), CancellationToken.None);

    // Assert — read response body and confirm it carries the active trace identifier.
    var body = await ReadResponseBodyAsync(context);

    var expectedTraceId = activity!.TraceId.ToString();
    Assert.IsTrue(
      body.Contains(expectedTraceId, StringComparison.Ordinal),
      $"Expected traceId '{expectedTraceId}' in ProblemDetails body but got: {body}");
  }

  /// <summary>
  /// Verifies that <see cref="ExceptionMappingHandler.TryHandleAsync"/> returns <see langword="false"/>
  /// when the response has already started writing (headers committed), without attempting to
  /// overwrite the status code or write ProblemDetails. This guards against corrupted or
  /// ill-formed responses when an exception escapes a streaming handler or middleware that
  /// has already begun writing the response body.
  /// </summary>
  [TestMethod]
  public async Task TryHandleAsync_WhenResponseHasStarted_ReturnsFalseWithoutWriting()
  {
    // Arrange — build a context with a response feature that reports HasStarted = true.
    var handler = new ExceptionMappingHandler();
    var services = new ServiceCollection()
      .AddLogging()
      .BuildServiceProvider();

    var responseFeature = new TestHttpResponseFeature { HasStarted = true, StatusCode = 200 };

    var context = new DefaultHttpContext();
    context.Features.Set<IHttpResponseFeature>(responseFeature);
    context.RequestServices = services;

    // Act
    var handled = await handler.TryHandleAsync(
        context,
        new InvalidOperationException("too late"),
        CancellationToken.None);

    // Assert — handler must return false, and the status code should remain unchanged.
    Assert.IsFalse(handled, "TryHandleAsync should return false when response has already started.");
    Assert.AreEqual(200, responseFeature.StatusCode, "Status code should remain unchanged when response has already started.");
  }
}
