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
  string SeedDataDirectory)
{
  internal static BootstrapOptions FromEnvironment() =>
    FromEnvironment(Environment.GetEnvironmentVariable);

  internal static BootstrapOptions FromEnvironment(Func<string, string?> readVariable)
  {
    ArgumentNullException.ThrowIfNull(readVariable);
    if (!string.IsNullOrWhiteSpace(readVariable("SEED_MANIFEST_PATH")))
    {
      throw new InvalidOperationException("SEED_MANIFEST_PATH is obsolete. Set SEED_DATA_DIRECTORY to the directory containing all four persona JSON files.");
    }

    string directory = readVariable("SEED_DATA_DIRECTORY") ?? Path.Combine(AppContext.BaseDirectory, "SeedData");
    if (string.IsNullOrWhiteSpace(directory))
    {
      throw new InvalidOperationException("SEED_DATA_DIRECTORY must not be blank.");
    }

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
      directory);
  }
}
