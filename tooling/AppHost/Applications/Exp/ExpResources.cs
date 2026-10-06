namespace AppHost.Applications.Exp;

using AppHost.Infrastructure.Sql;

/// <summary>Owns the exp service's local endpoint overlay.</summary>
internal static class ExpResources
{
  internal static IReadOnlyDictionary<string, string> CreateEndpointOverrides(string sqlPassword) =>
    new Dictionary<string, string>(StringComparer.Ordinal)
    {
      ["Endpoints:Database:NoSQL"] =
        $"AccountEndpoint=https://localhost:{Constants.CosmosGatewayPort}/;AccountKey={Constants.CosmosEmulatorWellKnownKey};",
      ["Endpoints:Database:SQL"] =
        SqlResources.CreateConnectionString(sqlPassword, Constants.SqlDatabaseName),
      ["Endpoints:Storage:Blob"] = $"http://localhost:{Constants.AzuriteBlobPort}/devstoreaccount1",
      ["Endpoints:Service:Api"] = $"http://localhost:{Constants.ApiPort}",
    };
}
