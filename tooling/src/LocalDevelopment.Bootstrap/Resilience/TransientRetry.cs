namespace LocalDevelopment.Bootstrap.Resilience;

using System.Globalization;

using Azure;

using Microsoft.Azure.Cosmos;

/// <summary>
/// Runs an operation again, with bounded doubling waits, when it fails with a temporary emulator error.
/// </summary>
/// <param name="maxAttempts">The total number of attempts, including the first.</param>
/// <param name="initialDelay">The wait before the second attempt; each later wait doubles.</param>
/// <param name="delay">Waits between attempts and observes the caller's cancellation.</param>
/// <param name="log">Receives one line per retry.</param>
internal sealed class TransientRetry(
  int maxAttempts,
  TimeSpan initialDelay,
  Func<TimeSpan, CancellationToken, Task> delay,
  TextWriter log)
{
  /// <summary>Gets a policy that runs the operation exactly once.</summary>
  internal static TransientRetry None { get; } =
    new(1, TimeSpan.Zero, static (_, _) => Task.CompletedTask, TextWriter.Null);

  /// <summary>Creates the bootstrap policy: five attempts with waits of 1, 2, 4, and 8 seconds.</summary>
  /// <param name="log">Receives one line per retry.</param>
  /// <param name="timeProvider">Drives the waits between attempts.</param>
  /// <returns>The default bootstrap retry policy.</returns>
  internal static TransientRetry CreateDefault(TextWriter log, TimeProvider timeProvider)
  {
    ArgumentNullException.ThrowIfNull(timeProvider);
    return new(5, TimeSpan.FromSeconds(1), (wait, token) => Task.Delay(wait, timeProvider, token), log);
  }

  /// <summary>Runs the operation, retrying it from the start after each temporary failure.</summary>
  /// <param name="operation">The idempotent operation to run.</param>
  /// <param name="cancellationToken">The caller's token, forwarded to every attempt and wait.</param>
  /// <returns>A task that completes when an attempt succeeds.</returns>
  internal async Task ExecuteAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(operation);
    for (int attempt = 1; ; attempt++)
    {
      try
      {
        await operation(cancellationToken).ConfigureAwait(false);
        return;
      }
      catch (Exception exception) when (attempt < maxAttempts
        && TransientFailureClassifier.IsTransient(exception, cancellationToken))
      {
        TimeSpan wait = initialDelay * Math.Pow(2, attempt - 1);
        await log.WriteLineAsync(string.Create(CultureInfo.InvariantCulture,
          $"Local development bootstrap attempt {attempt}/{maxAttempts} failed with {Describe(exception)}; retrying in {wait.TotalSeconds:0.###} s."))
          .ConfigureAwait(false);
        await delay(wait, cancellationToken).ConfigureAwait(false);
      }
    }
  }

  private static string Describe(Exception exception) => exception switch
  {
    CosmosException cosmos => string.Create(CultureInfo.InvariantCulture,
      $"{nameof(CosmosException)} {(int)cosmos.StatusCode}"),
    RequestFailedException storage => string.Create(CultureInfo.InvariantCulture,
      $"{nameof(RequestFailedException)} {storage.Status}"),
    _ => exception.GetType().Name,
  };
}
