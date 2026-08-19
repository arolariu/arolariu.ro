namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when Cosmos DB returns HTTP 429 (request rate too large) while persisting or querying an
/// analysis run. Carries the recommended retry-after value so the mapper can surface it as a response hint.
/// </summary>
/// <remarks>
/// Implements <see cref="IRateLimitedException"/>; <c>ExceptionToHttpResultMapper</c> produces HTTP 429 Too Many
/// Requests and surfaces the <see cref="RetryAfter"/> value in the <c>retryAfterSeconds</c> ProblemDetails
/// extension, whether unwrapped or wrapped by a Foundation outer exception.
/// </remarks>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class AnalysisRunCosmosDbRateLimitException : Exception, IRateLimitedException
{
  /// <summary>Initializes a new instance of the <see cref="AnalysisRunCosmosDbRateLimitException"/> class.</summary>
  public AnalysisRunCosmosDbRateLimitException() { }

  /// <summary>Initializes a new instance of the <see cref="AnalysisRunCosmosDbRateLimitException"/> class with retry-after metadata.</summary>
  /// <param name="retryAfter">The recommended retry-after duration from Cosmos DB.</param>
  /// <param name="innerException">The underlying Cosmos exception.</param>
  public AnalysisRunCosmosDbRateLimitException(TimeSpan retryAfter, Exception innerException)
  : base("Cosmos DB rate limit exceeded (HTTP 429) while accessing analysis run data.", innerException)
  {
    RetryAfter = retryAfter;
  }

  /// <summary>Initializes a new instance of the <see cref="AnalysisRunCosmosDbRateLimitException"/> class with a custom message.</summary>
  /// <param name="message">The exception message.</param>
  public AnalysisRunCosmosDbRateLimitException(string message) : base(message) { }

  /// <summary>Initializes a new instance of the <see cref="AnalysisRunCosmosDbRateLimitException"/> class with a custom message and inner exception.</summary>
  /// <param name="message">The exception message.</param>
  /// <param name="innerException">The inner exception.</param>
  public AnalysisRunCosmosDbRateLimitException(string message, Exception innerException)
  : base(message, innerException) { }

#pragma warning disable SYSLIB0051
  private AnalysisRunCosmosDbRateLimitException(SerializationInfo info, StreamingContext context)
  : base(info, context) { }
#pragma warning restore SYSLIB0051

  /// <summary>Gets the recommended retry-after duration from Cosmos DB.</summary>
  public TimeSpan RetryAfter { get; }
}
