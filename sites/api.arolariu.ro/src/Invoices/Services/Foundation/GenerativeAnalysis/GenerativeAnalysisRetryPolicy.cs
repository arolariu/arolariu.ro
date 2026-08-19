namespace arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;

using Azure;

/// <summary>
/// Provides bounded transient-failure retry for generative-analysis dependency calls.
/// </summary>
/// <remarks>
/// <para><b>Attempts:</b> Performs at most three total attempts (the initial attempt plus up to two retries), waiting
/// approximately 250 ms after the first failed attempt and approximately 750 ms after the second failed attempt, each
/// plus bounded jitter.</para>
/// <para><b>Retryable failures:</b> Only transient dependency failures are retried: <see cref="RequestFailedException"/>
/// with HTTP status 408, 429, or any 5xx status; <see cref="HttpRequestException"/>; and <see cref="TimeoutException"/>.</para>
/// <para><b>Non-retryable failures:</b> Cancellation, content-filter/refusal or invalid-schema failures
/// (<see cref="InvalidStructuredOutputException"/>), invalid taxonomy codes (<see cref="TaxonomyCodeNotFoundException"/>),
/// caller validation failures (<see cref="ArgumentException"/>), and non-transient <see cref="RequestFailedException"/>
/// statuses are never retried.</para>
/// </remarks>
public sealed class GenerativeAnalysisRetryPolicy
{
  private const int MaximumAttempts = 3;
  private const double MaximumJitterMilliseconds = 100d;

  private static readonly TimeSpan[] BaseDelaysByAttempt =
  [
    TimeSpan.FromMilliseconds(250),
    TimeSpan.FromMilliseconds(750),
  ];

  private readonly Func<TimeSpan, CancellationToken, Task> delayAsync;
  private readonly Func<double> jitterSource;

  /// <summary>
  /// Initializes a new instance of the <see cref="GenerativeAnalysisRetryPolicy"/> class using real delays and random jitter.
  /// </summary>
  public GenerativeAnalysisRetryPolicy()
    : this(static (duration, cancellationToken) => Task.Delay(duration, cancellationToken), Random.Shared.NextDouble)
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="GenerativeAnalysisRetryPolicy"/> class using an injected delay
  /// delegate and jitter source, so tests can complete deterministically without sleeping.
  /// </summary>
  /// <param name="delayAsync">The delegate invoked instead of sleeping between retry attempts.</param>
  /// <param name="jitterSource">The delegate producing a bounded jitter fraction in the inclusive range <c>[0, 1]</c>.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="delayAsync"/> or <paramref name="jitterSource"/> is null.</exception>
  internal GenerativeAnalysisRetryPolicy(
    Func<TimeSpan, CancellationToken, Task> delayAsync,
    Func<double> jitterSource)
  {
    ArgumentNullException.ThrowIfNull(delayAsync);
    ArgumentNullException.ThrowIfNull(jitterSource);

    this.delayAsync = delayAsync;
    this.jitterSource = jitterSource;
  }

  /// <summary>
  /// Executes the supplied operation, retrying transient dependency failures up to <see cref="MaximumAttempts"/> total attempts.
  /// </summary>
  /// <typeparam name="TResult">The operation result type.</typeparam>
  /// <param name="operation">The operation to execute, receiving the cancellation token for the current attempt.</param>
  /// <param name="cancellationToken">The cancellation token that aborts all attempts.</param>
  /// <param name="onRetryScheduled">
  /// An optional observer invoked with the 1-based number of the attempt that just failed, immediately before the
  /// policy waits and retries. Only the attempt number is surfaced so retry telemetry stays free of payload content.
  /// </param>
  /// <returns>The result produced by the first successful attempt.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="operation"/> is null.</exception>
  public async Task<TResult> ExecuteAsync<TResult>(
    Func<CancellationToken, Task<TResult>> operation,
    CancellationToken cancellationToken,
    Action<int>? onRetryScheduled = null)
  {
    ArgumentNullException.ThrowIfNull(operation);

    for (int attempt = 1; attempt < MaximumAttempts; attempt++)
    {
      try
      {
        return await operation(cancellationToken).ConfigureAwait(false);
      }
      catch (Exception exception) when (ShouldRetry(exception, cancellationToken))
      {
        onRetryScheduled?.Invoke(attempt);
        TimeSpan waitDuration = ComputeDelay(attempt);
        await delayAsync(waitDuration, cancellationToken).ConfigureAwait(false);
      }
    }

    return await operation(cancellationToken).ConfigureAwait(false);
  }

  private static bool ShouldRetry(Exception exception, CancellationToken cancellationToken) =>
    !cancellationToken.IsCancellationRequested
    && IsTransientDependencyFailure(exception);

  /// <summary>
  /// Determines whether the supplied exception represents a transient dependency failure eligible for retry.
  /// </summary>
  /// <param name="exception">The exception raised by the wrapped operation.</param>
  /// <returns><see langword="true"/> when the failure is transient; otherwise, <see langword="false"/>.</returns>
  internal static bool IsTransientDependencyFailure(Exception exception) => exception switch
  {
    OperationCanceledException => false,
    InvalidStructuredOutputException => false,
    TaxonomyCodeNotFoundException => false,
    ArgumentException => false,
    RequestFailedException requestFailedException => IsTransientStatus(requestFailedException.Status),
    HttpRequestException => true,
    TimeoutException => true,
    _ => false,
  };

  private static bool IsTransientStatus(int status) =>
    status is 408 or 429 || status is >= 500 and < 600;

  private TimeSpan ComputeDelay(int attempt)
  {
    TimeSpan baseDelay = BaseDelaysByAttempt[attempt - 1];
    double jitterFraction = Math.Clamp(jitterSource(), 0d, 1d);
    TimeSpan jitter = TimeSpan.FromMilliseconds(jitterFraction * MaximumJitterMilliseconds);
    return baseDelay + jitter;
  }
}
