namespace LocalDevelopment.Bootstrap;

using Azure.Storage.Blobs;
using Azure.Storage.Queues;

using Microsoft.Azure.Cosmos;

internal static class Program
{
  public static async Task<int> Main(
    string[] args)
  {
    try
    {
      BootstrapOptions options = BootstrapOptions.FromEnvironment();
      bool ensureStorageOnly = args.Contains(
        "--ensure-storage-only",
        StringComparer.Ordinal);

      if (ensureStorageOnly)
      {
        LocalEnvironmentGuard.ValidateStorage(
          options.EnvironmentName,
          options.Infra,
          options.AzureClientId,
          options.BlobStorageConnectionString,
          options.QueueStorageConnectionString);
      }
      else
      {
        LocalEnvironmentGuard.Validate(
          options.EnvironmentName,
          options.Infra,
          options.AzureClientId,
          options.CosmosConnectionString
            ?? throw new InvalidOperationException(
              "ConnectionStrings__primary is required."),
          options.BlobStorageConnectionString,
          options.QueueStorageConnectionString);
      }

      var blobServiceClient =
        new BlobServiceClient(options.BlobStorageConnectionString);
      var queueServiceClient =
        new QueueServiceClient(options.QueueStorageConnectionString);
      var storage = new LocalAzuriteResetter(
        blobServiceClient,
        queueServiceClient);

      if (ensureStorageOnly)
      {
        await storage
          .EnsureStorageAsync(CancellationToken.None)
          .ConfigureAwait(false);
        return 0;
      }

      using var cosmosClient =
        new CosmosClient(
          options.CosmosConnectionString,
          new CosmosClientOptions
          {
            ConnectionMode = ConnectionMode.Gateway,
            LimitToEndpoint = true,
          });
      var bootstrap = new LocalScenarioBootstrap(
        new LocalCosmosResetter(cosmosClient),
        storage,
        TimeProvider.System);
      await bootstrap
        .RunAsync(options.ManifestPath, CancellationToken.None)
        .ConfigureAwait(false);
      return 0;
    }
    catch (Exception exception)
    {
      Console.Error.WriteLine(
        $"Local development bootstrap failed: {exception.GetType().Name}: {exception.Message}");
      return 1;
    }
  }
}
