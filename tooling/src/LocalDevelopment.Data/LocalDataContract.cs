namespace LocalDevelopment.Data;

/// <summary>Defines the persisted local data names shared by provisioning, scenarios, and reset.</summary>
public static class LocalDataContract
{
  /// <summary>The container holding invoice scans.</summary>
  public const string BlobContainerName = "invoices";

  /// <summary>The queue holding invoice analysis work.</summary>
  public const string AnalysisQueueName = "invoice-analysis";

  /// <summary>The application SQL database.</summary>
  public const string SqlDatabaseName = "arolariu-sql";

  /// <summary>The invoice-domain Cosmos database.</summary>
  public const string CosmosDatabaseName = "primary";

  /// <summary>The invoice document container.</summary>
  public const string CosmosInvoicesContainer = "invoices";

  /// <summary>The invoice owner partition path.</summary>
  public const string CosmosInvoicesPartitionKey = "/UserIdentifier";

  /// <summary>The merchant document container.</summary>
  public const string CosmosMerchantsContainer = "merchants";

  /// <summary>The merchant parent partition path.</summary>
  public const string CosmosMerchantsPartitionKey = "/ParentCompanyId";

  /// <summary>The local initialization receipt container.</summary>
  public const string InitializationContainerName = "local-development";

  /// <summary>The invoice initialization receipt identifier and partition.</summary>
  public const string InitializationId = "invoice-scenario";

  /// <summary>The create-only SQL database prerequisite shared by startup and reset.</summary>
  public static string SqlDatabaseCreationScript => $"""
    IF DB_ID('{SqlDatabaseName}') IS NULL
        CREATE DATABASE [{SqlDatabaseName}];
    """;
}
