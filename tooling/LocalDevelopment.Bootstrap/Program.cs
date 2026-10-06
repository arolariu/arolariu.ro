namespace LocalDevelopment.Bootstrap;

using System.Runtime.InteropServices;
using LocalDevelopment.Bootstrap.Configuration;
using LocalDevelopment.Bootstrap.Safety;
using LocalDevelopment.Bootstrap.Scenarios.Invoices;
using LocalDevelopment.Bootstrap.Scenarios.Invoices.Storage;

using Azure.Storage.Blobs;
using Azure.Storage.Queues;

using Microsoft.Azure.Cosmos;

internal static class Program
{
  /// <summary>Runs local provisioning with owned graceful-shutdown cancellation.</summary>
  public static async Task<int> Main(
    string[] args)
  {
    using var shutdown = new CancellationTokenSource();
    void Cancel(object? sender, ConsoleCancelEventArgs eventArgs)
    {
      eventArgs.Cancel = true;
      shutdown.Cancel();
    }
    Console.CancelKeyPress += Cancel;
    try
    {
      using PosixSignalRegistration? termination = OperatingSystem.IsWindows() ? null
        : PosixSignalRegistration.Create(PosixSignal.SIGTERM, context =>
        {
          context.Cancel = true;
          shutdown.Cancel();
        });
      return await RunAsync(BootstrapOptions.FromEnvironment,
        args.Contains("--ensure-storage-only", StringComparer.Ordinal), shutdown.Token).ConfigureAwait(false);
    }
    finally { Console.CancelKeyPress -= Cancel; }
  }

  internal static async Task<int> RunAsync(
    Func<BootstrapOptions> readOptions, bool ensureStorageOnly, CancellationToken cancellationToken)
  {
    try
    {
      cancellationToken.ThrowIfCancellationRequested();
      ArgumentNullException.ThrowIfNull(readOptions);
      BootstrapOptions options = readOptions();

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

      cancellationToken.ThrowIfCancellationRequested();
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
          .EnsureStorageAsync(cancellationToken)
          .ConfigureAwait(false);
        cancellationToken.ThrowIfCancellationRequested();
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
        .RunAsync(options.ManifestPath, cancellationToken)
        .ConfigureAwait(false);
      cancellationToken.ThrowIfCancellationRequested();
      return 0;
    }
    catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
    {
      Console.Error.WriteLine("Local development bootstrap cancelled; completed reset phases are not rolled back.");
      return 1;
    }
    catch (Exception exception)
    {
      Console.Error.WriteLine(
        $"Local development bootstrap failed: {exception.GetType().Name}: {exception.Message}");
      return 1;
    }
  }
}
