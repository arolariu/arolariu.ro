namespace LocalDevelopment.Common.Http.Resilience;

/// <summary>Executes bounded retries without sharing per-execution state.</summary>
public static class RetryExecutor
{
  /// <summary>Runs an operation until it succeeds or its policy stops retrying.</summary>
  /// <param name="policy">The validated-on-use attempt budget, delay calculation, and failure classifier.</param>
  /// <param name="operation">The operation invoked with the caller's token on each attempt.</param>
  /// <param name="cancellationToken">The token forwarded unchanged to the operation, classifier, and delay.</param>
  /// <param name="onRetry">An optional callback awaited before each retry delay.</param>
  /// <param name="delay">An optional delay implementation; defaults to <see cref="Task.Delay(TimeSpan, CancellationToken)"/>.</param>
  /// <returns>A task that completes after success and any enabled post-success cancellation check.</returns>
  /// <exception cref="ArgumentNullException">The policy, operation, policy name, or a policy delegate is null.</exception>
  /// <exception cref="ArgumentException">The policy name is blank.</exception>
  /// <exception cref="ArgumentOutOfRangeException">The policy attempt budget is less than one.</exception>
  /// <exception cref="OperationCanceledException">An enabled cancellation check or a supplied delegate observes cancellation.</exception>
  /// <remarks>
  /// Only operation failures with remaining attempts are passed to the policy's exception filter.
  /// Terminal operation exceptions propagate unchanged. Delay-calculation, callback, and delay failures are not retried.
  /// Enabled cancellation checks run outside the operation's exception filter.
  /// The first retry uses attempt one; there are at most <c>MaxAttempts - 1</c> delays.
  /// </remarks>
  public static async Task ExecuteAsync(
    RetryPolicy policy,
    Func<CancellationToken, Task> operation,
    CancellationToken cancellationToken,
    Func<RetryContext, Task>? onRetry = null,
    Func<TimeSpan, CancellationToken, Task>? delay = null)
  {
    ArgumentNullException.ThrowIfNull(policy);
    ArgumentNullException.ThrowIfNull(operation);
    policy.Validate();
    delay ??= Task.Delay;

    for (int attempt = 1; attempt <= policy.MaxAttempts; attempt++)
    {
      if (policy.CheckCancellationBeforeAttempt)
      {
        cancellationToken.ThrowIfCancellationRequested();
      }

      try
      {
        await operation(cancellationToken).ConfigureAwait(false);
      }
      catch (Exception exception) when (attempt < policy.MaxAttempts
        && policy.ShouldRetry(exception, cancellationToken))
      {
        TimeSpan wait = policy.GetDelay(attempt);
        if (onRetry is not null)
        {
          await onRetry(new RetryContext(exception, attempt, policy.MaxAttempts, wait)).ConfigureAwait(false);
        }

        await delay(wait, cancellationToken).ConfigureAwait(false);
        continue;
      }

      if (policy.CheckCancellationAfterAttempt)
      {
        cancellationToken.ThrowIfCancellationRequested();
      }

      return;
    }
  }
}
