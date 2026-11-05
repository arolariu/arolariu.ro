namespace LocalDevelopment.Common.Http.Resilience;

using System.Net.Sockets;

/// <summary>Classifies SDK-neutral timeout and transport failures for retries.</summary>
public static class HttpFailureClassifier
{
  /// <summary>Determines whether an exception represents a retryable HTTP failure.</summary>
  /// <param name="exception">The failure to classify, including its inner-exception chain.</param>
  /// <param name="token">The caller's token, used to distinguish caller cancellation from an operation timeout.</param>
  /// <returns>
  /// For an outer cancellation exception, whether the caller has not canceled; otherwise, whether any exception in the
  /// chain is an <see cref="HttpRequestException"/> or <see cref="SocketException"/>.
  /// </returns>
  /// <exception cref="ArgumentNullException">The exception is null.</exception>
  /// <remarks>Provider-specific status codes are deliberately not classified here.</remarks>
  public static bool IsTransient(Exception exception, CancellationToken token)
  {
    ArgumentNullException.ThrowIfNull(exception);

    if (exception is OperationCanceledException)
    {
      return !token.IsCancellationRequested;
    }

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
