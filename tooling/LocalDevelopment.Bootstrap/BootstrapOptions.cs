namespace LocalDevelopment.Bootstrap;

/// <summary>
/// Resolves local bootstrap inputs from Aspire-provided environment variables.
/// </summary>
internal sealed record BootstrapOptions(
  string EnvironmentName,
  string Infra,
  string? AzureClientId,
  string? CosmosConnectionString,
  string StorageConnectionString,
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
      Environment.GetEnvironmentVariable("ConnectionStrings__storage")
        ?? throw new InvalidOperationException(
          "ConnectionStrings__storage is required."),
      Environment.GetEnvironmentVariable("SEED_MANIFEST_PATH")
        ?? Path.Combine(AppContext.BaseDirectory, "SeedData", "scenario.v1.json"));
}
