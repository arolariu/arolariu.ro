namespace arolariu.Backend.Core.Tests.Common.Http;

using System;
using System.Diagnostics;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Common.Http;

using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests for <see cref="ExceptionToHttpResultMapper"/> covering marker-to-status mapping,
/// inner exception classification, safe detail construction, and trace correlation.
/// </summary>
[TestClass]
public sealed class ExceptionToHttpResultMapperTests
{

  private sealed class ValidationEx : Exception, IValidationException { public ValidationEx(string m) : base(m) { } }
  private sealed class NotFoundEx : Exception, INotFoundException { public NotFoundEx(string m) : base(m) { } }
  private sealed class ConflictEx : Exception, IAlreadyExistsException { public ConflictEx(string m) : base(m) { } }
  private sealed class LockedEx : Exception, ILockedException { public LockedEx(string m) : base(m) { } }
  private sealed class RateLimitEx : Exception, IRateLimitedException { public RateLimitEx(string m) : base(m) { } }
  private sealed class UnauthorizedEx : Exception, IUnauthorizedException { public UnauthorizedEx(string m) : base(m) { } }
  private sealed class ForbiddenEx : Exception, IForbiddenException { public ForbiddenEx(string m) : base(m) { } }
  private sealed class DependencyEx : Exception, IDependencyException { public DependencyEx(string m) : base(m) { } }
  private sealed class ServiceEx : Exception, IServiceException { public ServiceEx(string m) : base(m) { } }

  /// <summary>Ensures each marker interface maps to its canonical HTTP status.</summary>
  [DataTestMethod]
  [DataRow(typeof(ValidationEx), 400)]
  [DataRow(typeof(NotFoundEx), 404)]
  [DataRow(typeof(ConflictEx), 409)]
  [DataRow(typeof(LockedEx), 423)]
  [DataRow(typeof(RateLimitEx), 429)]
  [DataRow(typeof(UnauthorizedEx), 401)]
  [DataRow(typeof(ForbiddenEx), 403)]
  [DataRow(typeof(DependencyEx), 503)]
  [DataRow(typeof(ServiceEx), 500)]
  public void ToHttpResult_MapsMarkerToStatus(Type exceptionType, int expectedStatus)
  {
    var ex = (Exception)Activator.CreateInstance(exceptionType, "boom")!;

    var result = ExceptionToHttpResultMapper.ToHttpResult(ex, activity: null);

    Assert.IsInstanceOfType(result, typeof(ProblemHttpResult));
    var problem = (ProblemHttpResult)result;
    Assert.AreEqual(expectedStatus, problem.StatusCode);
  }

  /// <summary>Unknown/unclassified exceptions fall back to HTTP 500.</summary>
  [TestMethod]
  public void ToHttpResult_UnknownException_MapsTo500()
  {
    var result = ExceptionToHttpResultMapper.ToHttpResult(new Exception("boom"), activity: null);

    Assert.IsInstanceOfType(result, typeof(ProblemHttpResult));
    var problem = (ProblemHttpResult)result;
    Assert.AreEqual(500, problem.StatusCode);
    Assert.AreEqual("An unexpected error occurred. Please try again later.", problem.ProblemDetails.Detail);
  }

  /// <summary>Inner classifiable exception drives status when outer is unclassified.</summary>
  [TestMethod]
  public void ToHttpResult_InnerExceptionDrivesClassification()
  {
    var inner = new NotFoundEx("missing");
    var outer = new Exception("outer", inner);

    var result = ExceptionToHttpResultMapper.ToHttpResult(outer, activity: null);

    Assert.IsInstanceOfType(result, typeof(ProblemHttpResult));
    var problem = (ProblemHttpResult)result;
    Assert.AreEqual(404, problem.StatusCode);
  }

  /// <summary>Mapper never leaks <see cref="Exception.Source"/> via the detail payload.</summary>
  [TestMethod]
  public void ToHttpResult_NeverLeaksExceptionSource()
  {
    var ex = new ServiceEx("secret details about internal types") { Source = "arolariu.Backend.Invoices" };

    var result = ExceptionToHttpResultMapper.ToHttpResult(ex, activity: null);

    Assert.IsInstanceOfType(result, typeof(ProblemHttpResult));
    var problem = (ProblemHttpResult)result;
    var detail = problem.ProblemDetails.Detail ?? string.Empty;
    Assert.IsFalse(detail.Contains("arolariu.Backend.Invoices", StringComparison.Ordinal));
  }

  /// <summary>When an <see cref="Activity"/> is present, its TraceId is projected as an extension.</summary>
  [TestMethod]
  public void ToHttpResult_IncludesTraceIdWhenActivityPresent()
  {
    using var activity = new Activity("test").Start();

    var result = ExceptionToHttpResultMapper.ToHttpResult(new ServiceEx("boom"), activity);

    Assert.IsInstanceOfType(result, typeof(ProblemHttpResult));
    var problem = (ProblemHttpResult)result;
    Assert.IsTrue(problem.ProblemDetails.Extensions.ContainsKey("traceId"));
  }

  /// <summary>Rate-limited responses surface a retry hint via the extensions dictionary.</summary>
  [TestMethod]
  public void ToHttpResult_RateLimited_IncludesRetryAfterExtension()
  {
    var result = ExceptionToHttpResultMapper.ToHttpResult(new RateLimitEx("throttled"), activity: null);

    Assert.IsInstanceOfType(result, typeof(ProblemHttpResult));
    var problem = (ProblemHttpResult)result;
    Assert.IsTrue(problem.ProblemDetails.Extensions.ContainsKey("retryAfterSeconds"));
  }
}
