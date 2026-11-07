namespace LocalDevelopment.Data;

using Azure;
using LocalDevelopment.Common.Http.Resilience;
using Microsoft.Azure.Cosmos;

/// <summary>Names and configures the retry profiles used by local data operations.</summary>
/// <remarks>The shared executor is provider-neutral; SDK failure classification stays with local data.</remarks>
public static class LocalDataRetryPolicies
{
  /// <summary>The startup provisioning profile: six attempts with linear waits.</summary>
  public const string AzuriteStartup = "azurite-startup";

  /// <summary>The scenario initialization profile: five attempts with doubling waits.</summary>
  public const string ScenarioTransient = "scenario-transient";

  /// <summary>The post-deletion profile: thirty attempts for deletion-in-progress conflicts only.</summary>
  public const string StorageDeletionPending = "storage-deletion-pending";

  /// <summary>The single-attempt profile for operations that must not retry.</summary>
  public const string None = "none";

  /// <summary>Gets the immutable default registry; callers can copy a policy to configure a specific use.</summary>
  public static RetryPolicyRegistry Default { get; } = new(
  [
    new RetryPolicy(AzuriteStartup, 6, attempt => TimeSpan.FromSeconds(attempt),
      (exception, _) => exception is not OperationCanceledException)
    {
      CheckCancellationBeforeAttempt = true,
      CheckCancellationAfterAttempt = true,
    },
    new RetryPolicy(ScenarioTransient, 5, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt - 1)), IsTransient),
    new RetryPolicy(StorageDeletionPending, 30, _ => TimeSpan.FromSeconds(1),
      (exception, _) => exception is RequestFailedException
      {
        Status: 409,
        ErrorCode: "ContainerBeingDeleted" or "QueueBeingDeleted",
      })
    {
      CheckCancellationBeforeAttempt = true,
    },
    new RetryPolicy(None, 1, _ => TimeSpan.Zero, (_, _) => false),
  ]);

  private static bool IsTransient(Exception exception, CancellationToken cancellationToken) => exception switch
  {
    CosmosException cosmos => (int)cosmos.StatusCode is 408 or 429 or 449 or 503 or 504,
    // Status zero means the Azure SDK did not receive an HTTP response.
    RequestFailedException storage => storage.Status is 0 or 408 or 429 or 500 or 502 or 503 or 504,
    _ => HttpFailureClassifier.IsTransient(exception, cancellationToken),
  };
}
