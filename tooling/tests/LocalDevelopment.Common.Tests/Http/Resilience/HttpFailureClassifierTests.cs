namespace LocalDevelopment.Common.Tests.Http.Resilience;

using System.Net.Sockets;

using global::LocalDevelopment.Common.Http.Resilience;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies SDK-neutral transport and cancellation classification.</summary>
[TestClass]
public sealed class HttpFailureClassifierTests
{
  /// <summary>Verifies both cancellation exception types distinguish operation timeout from caller cancellation.</summary>
  /// <param name="callerCanceled">Whether the caller has requested cancellation.</param>
  /// <param name="taskCancellation">Whether to use the task-specific cancellation subtype.</param>
  [TestMethod]
  [DataRow(false, false)]
  [DataRow(true, false)]
  [DataRow(false, true)]
  [DataRow(true, true)]
  public void IsTransient_Cancellation_UsesCallerToken(bool callerCanceled, bool taskCancellation)
  {
    using var source = new CancellationTokenSource();
    if (callerCanceled)
    {
      source.Cancel();
    }

    OperationCanceledException exception = taskCancellation
      ? new TaskCanceledException("Task canceled.")
      : new OperationCanceledException("Operation canceled.");

    bool actual = HttpFailureClassifier.IsTransient(exception, source.Token);

    Assert.AreEqual(!callerCanceled, actual);
  }

  /// <summary>Verifies direct and deeply wrapped HTTP and socket failures are transient.</summary>
  /// <param name="socketFailure">Whether the inner transport failure comes from a socket.</param>
  /// <param name="wrapped">Whether to wrap the transport failure twice.</param>
  [TestMethod]
  [DataRow(false, false)]
  [DataRow(true, false)]
  [DataRow(false, true)]
  [DataRow(true, true)]
  public void IsTransient_TransportFailure_WalksExceptionChain(bool socketFailure, bool wrapped)
  {
    Exception exception = socketFailure
      ? new SocketException((int)SocketError.ConnectionReset)
      : new HttpRequestException("Transport failed.");
    if (wrapped)
    {
      exception = new InvalidOperationException("Outer.", new IOException("Inner.", exception));
    }

    Assert.IsTrue(HttpFailureClassifier.IsTransient(exception, CancellationToken.None));
  }

  /// <summary>Verifies outer cancellation wins over a nested transport failure when the caller cancels.</summary>
  [TestMethod]
  public void IsTransient_CallerCancellationWrappingTransport_ReturnsFalse()
  {
    using var source = new CancellationTokenSource();
    source.Cancel();
    var exception = new OperationCanceledException("Canceled.", new HttpRequestException("Transport."), source.Token);

    Assert.IsFalse(HttpFailureClassifier.IsTransient(exception, source.Token));
  }

  /// <summary>Verifies only outer cancellation exceptions receive caller-token classification.</summary>
  [TestMethod]
  public void IsTransient_WrappedCancellationWithoutTransport_ReturnsFalse()
  {
    var exception = new InvalidOperationException("Wrapper.", new OperationCanceledException("Timeout."));

    Assert.IsFalse(HttpFailureClassifier.IsTransient(exception, CancellationToken.None));
  }

  /// <summary>Verifies caller cancellation does not override non-cancellation transport failures.</summary>
  [TestMethod]
  public void IsTransient_TransportFailureWithCanceledCaller_ReturnsTrue()
  {
    using var source = new CancellationTokenSource();
    source.Cancel();

    Assert.IsTrue(HttpFailureClassifier.IsTransient(new HttpRequestException("Transport."), source.Token));
  }

  /// <summary>Verifies unrelated failures are not classified as transient, even when wrapped.</summary>
  [TestMethod]
  public void IsTransient_UnrelatedFailure_ReturnsFalse()
  {
    var exception = new InvalidOperationException("Outer.", new ArgumentException("Permanent."));

    Assert.IsFalse(HttpFailureClassifier.IsTransient(exception, CancellationToken.None));
    Assert.IsFalse(HttpFailureClassifier.IsTransient(new TimeoutException("Not a cancellation."), CancellationToken.None));
  }

  /// <summary>Verifies a null exception is rejected rather than classified as permanent.</summary>
  [TestMethod]
  public void IsTransient_NullException_Throws()
  {
    Assert.ThrowsExactly<ArgumentNullException>(() => HttpFailureClassifier.IsTransient(null!, CancellationToken.None));
  }
}
