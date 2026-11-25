namespace AppHost.Infrastructure;

using AppHost.Infrastructure.Sql;
using AppHost.Infrastructure.Storage;
using AppHost.LocalDevelopment;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Azure;
using global::LocalDevelopment.Data;

#pragma warning disable ASPIRECOSMOSDB001
#pragma warning disable ASPIRECERTIFICATES001

/// <summary>Contains the native infrastructure handles consumed by application slices.</summary>
internal sealed record LocalInfrastructure(
  IResourceBuilder<SqlServerDatabaseResource> SqlDatabase,
  IResourceBuilder<AzureCosmosDBResource> Cosmos,
  IResourceBuilder<AzureCosmosDBDatabaseResource> CosmosDatabase,
  IResourceBuilder<AzureCosmosDBContainerResource> CosmosInvoices,
  IResourceBuilder<AzureCosmosDBContainerResource> CosmosMerchants,
  IResourceBuilder<AzureStorageResource> Storage,
  IResourceBuilder<AzureBlobStorageResource> Blobs,
  IResourceBuilder<AzureQueueStorageResource> Queues,
  IResourceBuilder<AzureTableStorageResource> Tables);

/// <summary>Composes local infrastructure using native Aspire integrations.</summary>
internal static class InfrastructureResources
{
  internal static LocalInfrastructure AddInfrastructure(
    this IDistributedApplicationBuilder builder, string sqlPassword, WorktreeLaunchScope? scope = null,
    string? redisSecret = null)
  {
    var sql = builder.AddLocalSql(sqlPassword, scope);
    var cosmos = builder.AddAzureCosmosDB("cosmos")
      .RunAsEmulator(emulator => emulator
        .WithGatewayPort(scope?.Port("cosmos") ?? Constants.CosmosGatewayPort)
        .WithDataExplorer(scope?.Port("cosmosDataExplorer"))
        .WithImageSHA256(Constants.CosmosEmulatorImageSha256)
        .WithDataVolume(scope?.Volumes["cosmos"] ?? Constants.CosmosDataVolumeEn20261008)
        .WithEnvironment("AZURE_COSMOS_EMULATOR_ENABLE_DATA_PLANE_HTTP", "true"))
      .WithEndpoint("emulator", endpoint => endpoint.IsProxied = true)
      .WithIconName("DatabaseMultiple");
    var database = cosmos.AddCosmosDatabase(LocalDataContract.CosmosDatabaseName);
    var invoices = database.AddContainer(
      LocalDataContract.CosmosInvoicesContainer, partitionKeyPath: LocalDataContract.CosmosInvoicesPartitionKey);
    var merchants = database.AddContainer(
      LocalDataContract.CosmosMerchantsContainer, partitionKeyPath: LocalDataContract.CosmosMerchantsPartitionKey);
    LocalStorageResources storage = builder.AddLocalStorage(scope);
    var redisPassword = scope is null
      ? builder.AddParameter("redis-password", secret: true)
      : builder.AddParameter("redis-password", redisSecret ?? throw new InvalidOperationException("Scoped Redis parameter is required."),
        secret: true);
    builder.AddRedis("redis", port: scope?.Port("redis") ?? Constants.RedisPort, password: redisPassword)
      .WithImageSHA256(Constants.RedisImageSha256)
      .WithDataVolume(scope?.Volumes["redis"] ?? Constants.RedisDataVolumeV8_6_3)
      // Local Redis does not terminate TLS.
      .WithoutHttpsCertificate()
      .WithIconName("Memory");
    return new(sql, cosmos, database, invoices, merchants, storage.Storage, storage.Blobs, storage.Queues, storage.Tables);
  }
}
