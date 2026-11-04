namespace LocalDevelopment.Bootstrap.Resilience;

using System.Net.Sockets;

using Azure;

using Microsoft.Azure.Cosmos;

/// <summary>
/// Decides whether a local emulator failure is temporary and worth retrying.
/// </summary>
internal static class TransientFailureClassifier
{
  private static readonly HashSet<int> CosmosRetryableStatuses = [408, 429, 449, 503, 504];

  // Status 0 is an Azure SDK transport failure (no HTTP response was received).
  private static readonly HashSet<int> StorageRetryableStatuses = [0, 408, 429, 500, 502, 503, 504];

  /// <summary>Returns whether a reset or seed failure is a temporary emulator or network failure.</summary>
  /// <param name="exception">The failure raised by a reset or seed phase.</param>
  /// <param name="cancellationToken">The caller's token; cancellation it requested is never transient.</param>
  /// <returns><see langword="true"/> when running the phases again can succeed.</returns>
  internal static bool IsTransient(Exception exception, CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(exception);
    return exception switch
    {
      OperationCanceledException => !cancellationToken.IsCancellationRequested,
      CosmosException cosmos => CosmosRetryableStatuses.Contains((int)cosmos.StatusCode),
      RequestFailedException storage => StorageRetryableStatuses.Contains(storage.Status),
      _ => IsNetworkFailure(exception),
    };
  }

  private static bool IsNetworkFailure(Exception exception)
  {
    for (Exception? current = exception; current is not null; current = current.InnerException)
    {
      if (current is HttpRequestException or SocketException)
      {
        return true;
      }
    }

    return false;
  }
}
