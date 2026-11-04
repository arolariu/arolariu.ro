namespace LocalDevelopment.Data.Tests.Resilience;

using System.Net;
using System.Net.Sockets;

using Azure;

using global::LocalDevelopment.Data.Resilience;

using Microsoft.Azure.Cosmos;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies which emulator failures the bootstrap treats as temporary.</summary>
[TestClass]
public sealed class TransientFailureClassifierTests
{
  /// <summary>Verifies Cosmos statuses that signal a busy or starting emulator are retried.</summary>
  [TestMethod]
  [DataRow(408)]
  [DataRow(429)]
  [DataRow(449)]
  [DataRow(503)]
  [DataRow(504)]
  public void IsTransient_CosmosRetryableStatus_ReturnsTrue(int status) =>
    Assert.IsTrue(TransientFailureClassifier.IsTransient(Cosmos(status), CancellationToken.None));

  /// <summary>Verifies Cosmos client errors and internal errors such as corrupt data are not retried.</summary>
  [TestMethod]
  [DataRow(400)]
  [DataRow(404)]
  [DataRow(409)]
  [DataRow(500)]
  public void IsTransient_CosmosPermanentStatus_ReturnsFalse(int status) =>
    Assert.IsFalse(TransientFailureClassifier.IsTransient(Cosmos(status), CancellationToken.None));

  /// <summary>Verifies Azurite transport failures and retryable statuses are retried.</summary>
  [TestMethod]
  [DataRow(0)]
  [DataRow(408)]
  [DataRow(429)]
  [DataRow(500)]
  [DataRow(502)]
  [DataRow(503)]
  [DataRow(504)]
  public void IsTransient_StorageRetryableStatus_ReturnsTrue(int status) =>
    Assert.IsTrue(TransientFailureClassifier.IsTransient(Storage(status), CancellationToken.None));

  /// <summary>Verifies Azurite client errors are not retried.</summary>
  [TestMethod]
  [DataRow(400)]
  [DataRow(404)]
  [DataRow(409)]
  public void IsTransient_StoragePermanentStatus_ReturnsFalse(int status) =>
    Assert.IsFalse(TransientFailureClassifier.IsTransient(Storage(status), CancellationToken.None));

  /// <summary>Verifies network failures are retried, including when wrapped by another exception.</summary>
  [TestMethod]
  public void IsTransient_NetworkFailure_ReturnsTrue()
  {
    Assert.IsTrue(TransientFailureClassifier.IsTransient(
      new HttpRequestException("connection refused"), CancellationToken.None));
    Assert.IsTrue(TransientFailureClassifier.IsTransient(
      new InvalidOperationException("wrapped", new SocketException((int)SocketError.ConnectionRefused)),
      CancellationToken.None));
  }

  /// <summary>Verifies a client timeout that the caller did not request is retried.</summary>
  [TestMethod]
  public void IsTransient_TimeoutWithoutCallerCancellation_ReturnsTrue() =>
    Assert.IsTrue(TransientFailureClassifier.IsTransient(new TaskCanceledException(), CancellationToken.None));

  /// <summary>Verifies caller cancellation is never retried.</summary>
  [TestMethod]
  public void IsTransient_CallerCancellation_ReturnsFalse() =>
    Assert.IsFalse(TransientFailureClassifier.IsTransient(
      new OperationCanceledException(), new CancellationToken(true)));

  /// <summary>Verifies invalid seed input is never retried.</summary>
  [TestMethod]
  public void IsTransient_InvalidManifest_ReturnsFalse() =>
    Assert.IsFalse(TransientFailureClassifier.IsTransient(
      new InvalidDataException("bad manifest"), CancellationToken.None));

  private static CosmosException Cosmos(int status) => new("test", (HttpStatusCode)status, 0, "activity", 0);

  private static RequestFailedException Storage(int status) => new(status, "test");
}
