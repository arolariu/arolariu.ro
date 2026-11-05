namespace AppHost.LocalDevelopment.Reset;

using System.Data.Common;
using global::LocalDevelopment.Data.NoSql;
using global::LocalDevelopment.Data.Sql;
using global::LocalDevelopment.Data.Storage;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Azure.Data.Tables;
using Azure.Storage.Blobs;
using Azure.Storage.Queues;
using Microsoft.Azure.Cosmos;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

/// <summary>Registers a local-only, interactively confirmed reset against captured native resources.</summary>
internal static class LocalDataResetResourceExtensions
{
  private static readonly Action<ILogger, string, Exception?> PhaseStarted = LoggerMessage.Define<string>(
    LogLevel.Information, new EventId(0), "Local data reset phase: {Phase}.");

  internal static void AddLocalDataReset(this IDistributedApplicationBuilder builder, LocalDataResetResources resources)
  {
    if (!builder.ExecutionContext.IsRunMode || !builder.Environment.IsDevelopment()) { return; }
    var coordinator = new LocalDataResetCoordinator();
    resources.Helpers.Bootstrap.WithCommand("reset-local-data", "Reset local data",
      context => ExecuteAsync(context, resources, coordinator),
      commandOptions: new CommandOptions
      {
        Description = "Delete local custom Cosmos, storage, and SQL data, then restore Alice, Bob, Charlie, and Dmitryi.",
        IconName = "ArrowReset",
        Visibility = ResourceCommandVisibility.UI,
      });
  }

  private static async Task<ExecuteCommandResult> ExecuteAsync(
    ExecuteCommandContext context, LocalDataResetResources resources, LocalDataResetCoordinator coordinator)
  {
    IInteractionService? interaction = context.Services.GetService<IInteractionService>();
    if (interaction is null || !interaction.IsAvailable)
    {
      return CommandResults.Failure("Reset requires an interactive Aspire dashboard confirmation.");
    }

    ResourceCommandService commands = context.Services.GetRequiredService<ResourceCommandService>();
    ResourceNotificationService notifications = context.Services.GetRequiredService<ResourceNotificationService>();
    var lifecycle = new LocalDataResetLifecycle(resources, commands.ExecuteCommandAsync,
      name => notifications.TryGetCurrentState(name, out ResourceEvent? change) ? change : null,
      notifications.WaitForResourceAsync, notifications.WaitForDependenciesAsync);
    CosmosClient? cosmos = null;
    BlobServiceClient? blobs = null;
    QueueServiceClient? queues = null;
    TableServiceClient? tables = null;
    Func<DbConnection>? createMasterConnection = null;
    ResourceEvent[]? nativeInstances = null;
    ResourceEvent? Current(string name) =>
      notifications.TryGetCurrentState(name, out ResourceEvent? change) ? change : null;
    try
    {
      async Task ValidateAsync(CancellationToken token)
      {
        LocalDataResetSafety.ValidateResourceOwnership(resources, isDevelopment: true, isRunMode: true);
        nativeInstances = LocalDataResetSafety.ValidateLiveInfrastructure(resources, Current);
        string cosmosConnection = await ResolveConnectionAsync(resources.Infrastructure.Cosmos.Resource, token).ConfigureAwait(false);
        string blobConnection = await ResolveConnectionAsync(resources.Infrastructure.Blobs.Resource, token).ConfigureAwait(false);
        string queueConnection = await ResolveConnectionAsync(resources.Infrastructure.Queues.Resource, token).ConfigureAwait(false);
        string tableConnection = await ResolveConnectionAsync(resources.Infrastructure.Tables.Resource, token).ConfigureAwait(false);
        string sqlConnection = await ResolveConnectionAsync(resources.Infrastructure.SqlDatabase.Resource, token).ConfigureAwait(false);
        var masterSettings = new SqlConnectionStringBuilder(sqlConnection) { InitialCatalog = "master" };
        cosmos = new CosmosClient(cosmosConnection,
          new CosmosClientOptions { ConnectionMode = ConnectionMode.Gateway, LimitToEndpoint = true });
        blobs = new BlobServiceClient(blobConnection);
        queues = new QueueServiceClient(queueConnection);
        tables = new TableServiceClient(tableConnection);
        using var master = new SqlConnection(masterSettings.ConnectionString);
        LocalDataResetSafety.ValidateResolvedClients(resources, cosmos, blobs, queues, tables, master);
        createMasterConnection = () => new SqlConnection(masterSettings.ConnectionString);
      }

      Task Phase(string name, Func<CancellationToken, Task> action, CancellationToken token, bool requireLiveInfrastructure = false)
      {
        token.ThrowIfCancellationRequested();
        if (requireLiveInfrastructure)
        {
          LocalDataResetSafety.ValidateLiveInfrastructure(resources, Current,
            nativeInstances ?? throw new InvalidOperationException("No native executions were captured for reset."));
        }
        PhaseStarted(context.Logger, name, null);
        return action(token);
      }

      async Task ProvisionAsync(CancellationToken token)
      {
        await NoSqlDataProvider.EnsureScenarioContainersAsync(
          cosmos ?? throw new InvalidOperationException(), token).ConfigureAwait(false);
        await StorageDataProvider.RestoreStorageAsync(
          blobs ?? throw new InvalidOperationException(), queues ?? throw new InvalidOperationException(), token).ConfigureAwait(false);
        await SqlDataProvider.EnsureApplicationDatabaseAsync(
          createMasterConnection ?? throw new InvalidOperationException(), token).ConfigureAwait(false);
      }

      var operations = new LocalDataResetOperations(
        token => Phase("validate targets", ValidateAsync, token),
        token => Phase("stop writers", lifecycle.StopWritersAsync, token),
        token => Phase("clear Cosmos", ct => NoSqlDataProvider.ClearAsync(
          cosmos ?? throw new InvalidOperationException(), ct), token, true),
        token => Phase("clear storage", ct => StorageDataProvider.ClearAsync(
          blobs ?? throw new InvalidOperationException(), queues ?? throw new InvalidOperationException(),
          tables ?? throw new InvalidOperationException(), ct), token, true),
        token => Phase("clear SQL", ct => SqlDataProvider.ClearAsync(
          createMasterConnection ?? throw new InvalidOperationException(), ct), token, true),
        token => Phase("provision prerequisites", ProvisionAsync, token, true),
        token => Phase("initialize scenario", lifecycle.RunBootstrapAsync, token, true),
        token => Phase("resume applications", lifecycle.ResumeApplicationsAsync, token, true));
      return await coordinator.ExecuteAsync(async token =>
      {
        InteractionResult<bool> confirmation = await interaction.PromptConfirmationAsync("Reset local data?",
          "Permanently delete ALL user databases in `cosmos` and `mssql`, and ALL blob containers, queues, "
          + "tables, and contents in `storage`? Custom data cannot be recovered by this action.\n\n"
          + "Stop external clients that write directly to these services. The API, website, and initializer "
          + "will be stopped; Alice, Bob, Charlie, and Dmitryi will be restored before the API and website restart.\n\n"
          + "SQL system databases, server configuration/logins, Redis, selfhost, and the archived "
          + "`arolariu-cosmos-data` volume are NOT targets.",
          new MessageBoxInteractionOptions
          {
            Intent = MessageIntent.Warning,
            PrimaryButtonText = "Reset and reseed",
            SecondaryButtonText = "Cancel",
            ShowSecondaryButton = true,
            EnableMessageMarkdown = true,
          }, token).ConfigureAwait(false);
        return !confirmation.Canceled && confirmation.Data;
      }, operations, context.CancellationToken).ConfigureAwait(false);
    }
    finally { cosmos?.Dispose(); }
  }

  private static async Task<string> ResolveConnectionAsync(
    IResourceWithConnectionString resource, CancellationToken cancellationToken) =>
    await resource.GetConnectionStringAsync(cancellationToken).ConfigureAwait(false)
    ?? throw new InvalidOperationException("A captured native reset connection is unavailable.");
}
