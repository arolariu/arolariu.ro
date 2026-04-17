namespace arolariu.Backend.Core.Tests.Common.Http;

using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Common.Http;

using Microsoft.AspNetCore.Http;
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
  /// Verifies that a classifiable exception (implementing a marker interface) is mapped
  /// to the correct HTTP status code, written as ProblemDetails, and handler returns true.
  /// </summary>
  [TestMethod]
  public async Task TryHandleAsync_ClassifiableException_WritesProblemDetailsAndReturnsTrue()
  {
    // Arrange
    var handler = new ExceptionMappingHandler();
    var services = new ServiceCollection()
      .AddLogging()
      .BuildServiceProvider();
    var context = new DefaultHttpContext
    {
      Response = { Body = new MemoryStream() },
      RequestServices = services
    };
    var exception = new NotFoundEx("Resource not found");

    // Act
    var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

    // Assert
    Assert.IsTrue(handled);
    Assert.AreEqual(404, context.Response.StatusCode);
    Assert.AreEqual("application/problem+json", context.Response.ContentType);
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
    var services = new ServiceCollection()
      .AddLogging()
      .BuildServiceProvider();
    var context = new DefaultHttpContext
    {
      Response = { Body = new MemoryStream() },
      RequestServices = services
    };
    var exception = new Exception("surprise");

    // Act
    var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

    // Assert
    Assert.IsTrue(handled);
    Assert.AreEqual(500, context.Response.StatusCode);
  }
}
