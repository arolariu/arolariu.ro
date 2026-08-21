namespace LocalDevelopment.Bootstrap;

/// <summary>
/// Prevents destructive reset behavior outside local emulators.
/// </summary>
internal static class LocalEnvironmentGuard
{
  internal static void Validate(
    string environmentName,
    string infra,
    string? azureClientId,
    string cosmosConnectionString,
    string blobStorageConnectionString,
    string queueStorageConnectionString)
  {
    ValidateRuntime(environmentName, infra, azureClientId);

    if (!cosmosConnectionString.Contains(
          "AccountKey=",
          StringComparison.Ordinal)
        || !TryReadEndpoint(
          cosmosConnectionString,
          "AccountEndpoint",
          out Uri? cosmosEndpoint)
        || cosmosEndpoint is null
        || !cosmosEndpoint.IsLoopback)
    {
      throw new InvalidOperationException(
        "Local development bootstrap refused a non-emulator Cosmos target.");
    }

    ValidateStorageConnection(
      blobStorageConnectionString,
      "blob");
    ValidateStorageConnection(
      queueStorageConnectionString,
      "queue");
  }

  internal static void ValidateStorage(
    string environmentName,
    string infra,
    string? azureClientId,
    string blobStorageConnectionString,
    string queueStorageConnectionString)
  {
    ValidateRuntime(environmentName, infra, azureClientId);
    ValidateStorageConnection(
      blobStorageConnectionString,
      "blob");
    ValidateStorageConnection(
      queueStorageConnectionString,
      "queue");
  }

  private static void ValidateRuntime(
    string environmentName,
    string infra,
    string? azureClientId)
  {
    if (!string.Equals(
          environmentName,
          "Development",
          StringComparison.Ordinal)
        || !string.Equals(infra, "local", StringComparison.Ordinal)
        || !string.IsNullOrWhiteSpace(azureClientId))
    {
      throw new InvalidOperationException(
        "Local development bootstrap refused a non-local runtime.");
    }
  }

  private static void ValidateStorageConnection(
    string connectionString,
    string serviceName)
  {
    if (string.Equals(
      connectionString,
      "UseDevelopmentStorage=true",
      StringComparison.OrdinalIgnoreCase))
    {
      return;
    }

    string endpointKey = string.Equals(
      serviceName,
      "blob",
      StringComparison.Ordinal)
        ? "BlobEndpoint"
        : "QueueEndpoint";
    bool hasEndpoint = TryReadEndpoint(
      connectionString,
      endpointKey,
      out Uri? endpoint);

    if (!hasEndpoint
        || endpoint is null
        || !endpoint.IsLoopback)
    {
      throw new InvalidOperationException(
        "Local development bootstrap refused a non-Azurite storage target.");
    }
  }

  private static bool TryReadEndpoint(
    string connectionString,
    string key,
    out Uri? endpoint)
  {
    endpoint = null;
    string prefix = $"{key}=";
    string? segment = connectionString
      .Split(';', StringSplitOptions.RemoveEmptyEntries)
      .FirstOrDefault(value =>
        value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));

    return segment is not null
      && Uri.TryCreate(segment[prefix.Length..], UriKind.Absolute, out endpoint);
  }
}
