namespace LocalDevelopment.Bootstrap;

/// <summary>
/// Resolves local bootstrap inputs from Aspire-provided environment variables.
/// </summary>
internal sealed record BootstrapOptions(
  string EnvironmentName,
  string Infra,
  string? AzureClientId,
  string? CosmosConnectionString,
  string BlobStorageConnectionString,
  string QueueStorageConnectionString,
  string ManifestPath)
{
  internal static BootstrapOptions FromEnvironment() =>
    new(
      Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
        ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
        ?? string.Empty,
      Environment.GetEnvironmentVariable("INFRA") ?? string.Empty,
      Environment.GetEnvironmentVariable("AZURE_CLIENT_ID"),
      Environment.GetEnvironmentVariable("ConnectionStrings__primary"),
      Environment.GetEnvironmentVariable("ConnectionStrings__blobs")
        ?? throw new InvalidOperationException(
          "ConnectionStrings__blobs is required."),
      Environment.GetEnvironmentVariable("ConnectionStrings__queues")
        ?? throw new InvalidOperationException(
          "ConnectionStrings__queues is required."),
      Environment.GetEnvironmentVariable("SEED_MANIFEST_PATH")
        ?? Path.Combine(AppContext.BaseDirectory, "SeedData", "scenario.v1.json"));
}
