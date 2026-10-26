namespace LocalDevelopment.Bootstrap.Configuration;

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
    FromEnvironment(Environment.GetEnvironmentVariable);

  internal static BootstrapOptions FromEnvironment(Func<string, string?> readVariable)
  {
    ArgumentNullException.ThrowIfNull(readVariable);
    return new(
      readVariable("DOTNET_ENVIRONMENT")
        ?? readVariable("ASPNETCORE_ENVIRONMENT")
        ?? string.Empty,
      readVariable("INFRA") ?? string.Empty,
      readVariable("AZURE_CLIENT_ID"),
      readVariable("ConnectionStrings__primary"),
      readVariable("ConnectionStrings__blobs")
        ?? throw new InvalidOperationException(
          "ConnectionStrings__blobs is required."),
      readVariable("ConnectionStrings__queues")
        ?? throw new InvalidOperationException(
          "ConnectionStrings__queues is required."),
      readVariable("SEED_MANIFEST_PATH")
        ?? Path.Combine(AppContext.BaseDirectory, "SeedData", "scenario.v1.json"));
  }
}
