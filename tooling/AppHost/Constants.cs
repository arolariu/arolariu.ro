namespace AppHost;

/// <summary>
/// Single source of truth for hardcoded strings used across AppHost's
/// resource declarations: dev credentials, database / container names,
/// volume names, and fixed ports. Keep this file thin — only true constants
/// belong here, not configurable values that should come from parameters
/// or environment variables.
/// </summary>
internal static class Constants
{
    // ── Dev-only credentials (mirror infra/Local/Storage/docker-compose.yml) ──
    public const string SqlPassword = "qazWSXedcRFV1234!";
    public const string RedisPassword = "RedisPassword123!";
    public const string CosmosEmulatorAccountKey =
        "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";

    // ── Database / container / partition key names ──
    public const string SqlDatabaseName = "arolariu-sql";
    public const string CosmosDatabaseName = "primary";
    public const string CosmosInvoicesContainer = "invoices";
    public const string CosmosInvoicesPartitionKey = "/UserIdentifier";
    public const string CosmosMerchantsContainer = "merchants";
    public const string CosmosMerchantsPartitionKey = "/ParentCompanyId";

    // ── Volume names (data persistence across container restarts) ──
    public const string SqlDataVolume = "arolariu-mssql-data";
    public const string RedisDataVolume = "arolariu-redis-data";

    // ── Fixed dev ports — match infra/Local/Storage/docker-compose.yml ──
    public const int ApiPort = 5000;
    public const int ExpPort = 5002;
    public const int WebsitePort = 3000;
    public const int CvPort = 4173;
    public const int DocsPort = 3100;
    public const int StatusPort = 3002;
    public const int RedisPort = 6379;
    public const int SqlPort = 8082;
    public const int CosmosGatewayPort = 8081;
    public const int AzuriteBlobPort = 10000;

    // ── Node.js inspector ports (--inspect=<port>) ──
    // One per JS resource so VS Code can attach to each independently. Default
    // Node inspector port is 9229; we allocate sequentially. Update the
    // matching attach configs in .vscode/launch.json if you change these.
    public const int WebsiteInspectPort = 9229;
    public const int CvInspectPort = 9230;
    public const int DocsInspectPort = 9231;
    public const int StatusInspectPort = 9232;
}
