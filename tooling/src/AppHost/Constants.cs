namespace AppHost;

/// <summary>
/// Single source of truth for hardcoded strings used across AppHost's
/// resource declarations: emulator credentials,
/// volume names, and fixed ports. Keep this file thin — only true constants
/// belong here, not configurable values that should come from parameters
/// or environment variables.
/// </summary>
internal static class Constants
{
  /// <summary>
  /// Documented public key for the Azure Cosmos DB emulator. Identical for every
  /// emulator instance — published in Microsoft Learn at
  /// https://learn.microsoft.com/azure/cosmos-db/emulator-linux. Not a secret.
  /// </summary>
  public const string CosmosEmulatorWellKnownKey =
      "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";

  // ── Volume names (data persistence across container restarts) ──
  public const string SqlDataVolumeV16_0_4305_5 = "arolariu-mssql-data-16.0.4305.5";
  public const string SqlServerImageSha256 =
      "cf8f0ab2ebe61feec2eed2629061a07d247f791c2a8ddda74a4ac9f06a291718";
  // Keep the initialized Cosmos volume paired with its tested emulator image.
  public const string CosmosDataVolumeEn20261008 = "arolariu-cosmos-data-en20261008";
  public const string CosmosEmulatorImageSha256 =
      "4535ddbd27bba762f3e068f7585feb0022a2559ceccc9394b23aa38d91d77c38";
  public const string RedisDataVolumeV8_6_3 = "arolariu-redis-data-8.6.3";
  public const string RedisImageSha256 =
      "4d25e2fe601f7ffaeb4437cb6ced3518bc36edf34ebe98863c80836943d94529";
  public const string AzuriteDataVolumeV3_35_0 = "arolariu-azurite-data-3.35.0";
  public const string AzuriteEmulatorImageSha256 =
      "647c63a91102a9d8e8000aab803436e1fc85fbb285e7ce830a82ee5d6661cf37";

  // ── Fixed dev ports — match infra/Local/Storage/docker-compose.yml ──
  public const int ApiPort = 5000;
  public const int LocalIdentityPort = 5011;
  public const int ExpPort = 5002;
  public const int WebsitePort = 3000;
  public const int CvPort = 4173;
  public const int DocsPort = 3100;
  public const int StatusPort = 3002;
  public const int RedisPort = 6379;
  public const int SqlPort = 8082;
  public const int CosmosGatewayPort = 8081;
  public const int AzuriteBlobPort = 10000;
  public const int AzuriteQueuePort = 10001;
}
