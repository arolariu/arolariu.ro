namespace arolariu.Backend.Core.Tests.Common.Http;

using System;
using System.Diagnostics;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Common.Http;

using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Tests for <see cref="ExceptionToHttpResultMapper"/> covering marker-to-status mapping,
/// inner exception classification, safe detail construction, and trace correlation.
/// </summary>
[TestClass]
public sealed class ExceptionToHttpResultMapperTests
{

  [SuppressMessage("Performance", "CA1812", Justification = "Instantiated via Activator.CreateInstance in data-driven test")]
  private sealed class ValidationException : Exception, IValidationException
  {
    public ValidationException(string m) : base(m) { }

    public ValidationException()
    {
    }

    public ValidationException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }
  private sealed class NotFoundException : Exception, INotFoundException
  {
    public NotFoundException(string m) : base(m) { }

    public NotFoundException()
    {
    }

    public NotFoundException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }
  [SuppressMessage("Performance", "CA1812", Justification = "Instantiated via Activator.CreateInstance in data-driven test")]
  private sealed class ConflictException : Exception, IAlreadyExistsException
  {
    public ConflictException(string m) : base(m) { }

    public ConflictException()
    {
    }

    public ConflictException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }
  [SuppressMessage("Performance", "CA1812", Justification = "Instantiated via Activator.CreateInstance in data-driven test")]
  private sealed class LockedException : Exception, ILockedException
  {
    public LockedException(string m) : base(m) { }

    public LockedException()
    {
    }

    public LockedException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }
  private sealed class RateLimitException : Exception, IRateLimitedException
  {
    public RateLimitException(string m) : base(m) { }

    public RateLimitException()
    {
    }

    public TimeSpan RetryAfter { get; } = TimeSpan.Zero;

    public RateLimitException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }
  [SuppressMessage("Performance", "CA1812", Justification = "Instantiated via Activator.CreateInstance in data-driven test")]
  private sealed class UnauthorizedException : Exception, IUnauthorizedException
  {
    public UnauthorizedException(string m) : base(m) { }

    public UnauthorizedException()
    {
    }

    public UnauthorizedException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }
  [SuppressMessage("Performance", "CA1812", Justification = "Instantiated via Activator.CreateInstance in data-driven test")]
  private sealed class ForbiddenException : Exception, IForbiddenException
  {
    public ForbiddenException(string m) : base(m) { }

    public ForbiddenException()
    {
    }

    public ForbiddenException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }
  [SuppressMessage("Performance", "CA1812", Justification = "Instantiated via Activator.CreateInstance in data-driven test")]
  private sealed class DependencyException : Exception, IDependencyException
  {
    public DependencyException(string m) : base(m) { }

    public DependencyException()
    {
    }

    public DependencyException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }
  [SuppressMessage("Performance", "CA1812", Justification = "Instantiated via test methods")]
  private sealed class DependencyValidationException : Exception, IDependencyValidationException
  {
    public DependencyValidationException(string message) : base(message) { }

    public DependencyValidationException()
    {
    }

    public DependencyValidationException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }
  private sealed class ServiceException : Exception, IServiceException
  {
    public ServiceException(string m) : base(m) { }

    public ServiceException()
    {
    }

    public ServiceException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }
  private sealed class TimeoutMarkerException : Exception, ITimeoutException // Marker name avoids shadowing System.TimeoutException in this file.
  {
    public TimeoutMarkerException(string m) : base(m) { }

    public TimeoutMarkerException()
    {
    }

    public TimeoutMarkerException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }

  /// <summary>Ensures each marker interface maps to its canonical HTTP status.</summary>
  [TestMethod]
  [DataRow(typeof(ValidationException), 400)]
  [DataRow(typeof(NotFoundException), 404)]
  [DataRow(typeof(ConflictException), 409)]
  [DataRow(typeof(LockedException), 423)]
  [DataRow(typeof(RateLimitException), 429)]
  [DataRow(typeof(UnauthorizedException), 401)]
  [DataRow(typeof(ForbiddenException), 403)]
  [DataRow(typeof(DependencyException), 503)]
  [DataRow(typeof(ServiceException), 500)]
  public void ToHttpResult_MapsMarkerToStatus(Type exceptionType, int expectedStatus)
  {
    var ex = (Exception)Activator.CreateInstance(exceptionType, "boom")!;

    var result = ExceptionToHttpResultMapper.ToHttpResult(ex, activity: null);

    Assert.IsInstanceOfType<ProblemHttpResult>(result);
    var problem = (ProblemHttpResult)result;
    Assert.AreEqual(expectedStatus, problem.StatusCode);
  }

  /// <summary>Unknown/unclassified exceptions fall back to HTTP 500.</summary>
  [TestMethod]
  public void ToHttpResult_UnknownException_MapsTo500()
  {
    var result = ExceptionToHttpResultMapper.ToHttpResult(new InvalidOperationException("boom"), activity: null);

    Assert.IsInstanceOfType<ProblemHttpResult>(result);
    var problem = (ProblemHttpResult)result;
    Assert.AreEqual(500, problem.StatusCode);
    Assert.AreEqual("An unexpected error occurred. Please try again later.", problem.ProblemDetails.Detail);
  }

  /// <summary>Inner classifiable exception drives status when outer is unclassified.</summary>
  [TestMethod]
  public void ToHttpResult_InnerExceptionDrivesClassification()
  {
    var inner = new NotFoundException("missing");
    var outer = new InvalidOperationException("outer", inner);

    var result = ExceptionToHttpResultMapper.ToHttpResult(outer, activity: null);

    Assert.IsInstanceOfType<ProblemHttpResult>(result);
    var problem = (ProblemHttpResult)result;
    Assert.AreEqual(404, problem.StatusCode);
  }

  /// <summary>Innermost classifiable exception wins even when outer wrappers are also classifiable.</summary>
  [TestMethod]
  public void ToHttpResult_InnermostClassifiableExceptionDrivesClassification()
  {
    var inner = new NotFoundException("missing");
    var middle = new DependencyValidationException("dependency validation", inner);
    var outer = new ServiceException("service failure", middle);

    var result = ExceptionToHttpResultMapper.ToHttpResult(outer, activity: null);

    Assert.IsInstanceOfType<ProblemHttpResult>(result);
    var problem = (ProblemHttpResult)result;
    Assert.AreEqual(404, problem.StatusCode);
    Assert.AreEqual("missing", problem.ProblemDetails.Detail);
  }

  /// <summary>Mapper never leaks <see cref="Exception.Source"/> via the detail payload.</summary>
  [TestMethod]
  public void ToHttpResult_NeverLeaksExceptionSource()
  {
    var ex = new ServiceException("secret details about internal types") { Source = "arolariu.Backend.Invoices" };

    var result = ExceptionToHttpResultMapper.ToHttpResult(ex, activity: null);

    Assert.IsInstanceOfType<ProblemHttpResult>(result);
    var problem = (ProblemHttpResult)result;
    var detail = problem.ProblemDetails.Detail ?? string.Empty;
    Assert.IsFalse(
      detail.Contains("arolariu.Backend.Invoices", StringComparison.Ordinal),
      "500 must not echo Exception.Source.");
    Assert.IsFalse(
      detail.Contains("secret details about internal types", StringComparison.Ordinal),
      "500 must not echo the exception message.");
    Assert.AreEqual(
      "An unexpected error occurred. Please try again later.",
      detail);
  }

  /// <summary>When an <see cref="Activity"/> is present, its TraceId is projected as an extension.</summary>
  [TestMethod]
  public void ToHttpResult_IncludesTraceIdWhenActivityPresent()
  {
    using var activity = new Activity("test");
    activity.Start();

    var result = ExceptionToHttpResultMapper.ToHttpResult(new ServiceException("boom"), activity);

    Assert.IsInstanceOfType<ProblemHttpResult>(result);
    var problem = (ProblemHttpResult)result;
    Assert.IsTrue(problem.ProblemDetails.Extensions.ContainsKey("traceId"));
  }

  /// <summary>Rate-limited responses surface a retry hint via the extensions dictionary.</summary>
  [TestMethod]
  public void ToHttpResult_RateLimited_IncludesRetryAfterExtension()
  {
    var result = ExceptionToHttpResultMapper.ToHttpResult(new RateLimitException("throttled"), activity: null);

    Assert.IsInstanceOfType<ProblemHttpResult>(result);
    var problem = (ProblemHttpResult)result;
    Assert.IsTrue(problem.ProblemDetails.Extensions.ContainsKey("retryAfterSeconds"));
  }

  /// <summary>BadHttpRequestException propagates its StatusCode instead of defaulting to 500.</summary>
  [TestMethod]
  public void ToHttpResult_BadHttpRequestException_PropagatesItsStatusCode()
  {
    var exception = new Microsoft.AspNetCore.Http.BadHttpRequestException("bad body", statusCode: 400);

    var result = ExceptionToHttpResultMapper.ToHttpResult(exception, activity: null);

    Assert.IsInstanceOfType<ProblemHttpResult>(result);
    var problem = (ProblemHttpResult)result;
    Assert.AreEqual(400, problem.StatusCode);
  }

  /// <summary>Timeout exceptions map to HTTP 504 Gateway Timeout with correct problem type URI.</summary>
  [TestMethod]
  public void ToHttpResult_TimeoutMarkerException_Returns504()
  {
    var result = ExceptionToHttpResultMapper.ToHttpResult(new TimeoutMarkerException("cosmos took too long"), null);

    var problem = (ProblemHttpResult)result;
    Assert.AreEqual(504, problem.StatusCode);
    Assert.AreEqual(ProblemTypeUris.Timeout, problem.ProblemDetails.Type);
  }

  /// <summary>504 responses never leak internal exception messages (server-side status).</summary>
  [TestMethod]
  public void ToHttpResult_TimeoutMarkerException_DoesNotLeakInternalMessage()
  {
    const string secret = "Server=tcp:internal;******";

    var result = ExceptionToHttpResultMapper.ToHttpResult(new TimeoutMarkerException(secret), null);

    var problem = (ProblemHttpResult)result;
    var detail = problem.ProblemDetails.Detail ?? string.Empty;

    Assert.IsFalse(
      detail.Contains("Server=tcp:internal", StringComparison.Ordinal),
      "504 is a server-side status and must not echo the exception message.");
    Assert.AreEqual(
      "The operation took too long to complete. Please try again later.",
      detail);
  }
}
