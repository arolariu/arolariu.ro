namespace LocalDevelopment.Common.Http.Resilience;

/// <summary>Defines a named, bounded retry policy without provider-specific rules.</summary>
/// <param name="Name">The nonblank, case-sensitive name used by a registry.</param>
/// <param name="MaxAttempts">The maximum number of operation attempts, including the initial attempt; at least one.</param>
/// <param name="GetDelay">Calculates the delay after a failed attempt, starting with attempt one for the first retry.</param>
/// <param name="ShouldRetry">Classifies an operation exception using the caller's cancellation token.</param>
/// <remarks>
/// Registries and executors validate the configuration before use. The policy holds no execution state.
/// Delegates must support concurrent invocation if the policy is reused concurrently.
/// Cancellation classification belongs to <paramref name="ShouldRetry"/> unless an explicit cancellation check is enabled.
/// </remarks>
public sealed record RetryPolicy(
  string Name,
  int MaxAttempts,
  Func<int, TimeSpan> GetDelay,
  Func<Exception, CancellationToken, bool> ShouldRetry)
{
  /// <summary>Gets whether to check caller cancellation before every operation attempt.</summary>
  /// <value><see langword="true"/> to reject a canceled token before invoking the operation; defaults to <see langword="false"/>.</value>
  public bool CheckCancellationBeforeAttempt { get; init; }

  /// <summary>Gets whether to check caller cancellation after a successful attempt.</summary>
  /// <value><see langword="true"/> to reject a canceled token before returning success; defaults to <see langword="false"/>.</value>
  public bool CheckCancellationAfterAttempt { get; init; }

  /// <summary>Validates configuration shared by registration and direct execution.</summary>
  /// <exception cref="ArgumentNullException">The name or either delegate is null.</exception>
  /// <exception cref="ArgumentException">The name is empty or consists only of whitespace.</exception>
  /// <exception cref="ArgumentOutOfRangeException">The attempt budget is less than one.</exception>
  internal void Validate()
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(Name);
    ArgumentOutOfRangeException.ThrowIfLessThan(MaxAttempts, 1);
    ArgumentNullException.ThrowIfNull(GetDelay);
    ArgumentNullException.ThrowIfNull(ShouldRetry);
  }
}
