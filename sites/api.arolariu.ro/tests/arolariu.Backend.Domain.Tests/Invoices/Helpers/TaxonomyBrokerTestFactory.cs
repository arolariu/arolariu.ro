namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System.Collections.Generic;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>Creates a compact real taxonomy broker for focused domain tests.</summary>
internal static class TaxonomyBrokerTestFactory
{
  internal const string EcoicopCode = "01.1";
  internal const string GpcCode = "10000025";
  internal const string NaceCode = "47.11";

  /// <summary>Creates a broker containing one canonical node per supported taxonomy.</summary>
  internal static ITaxonomyBroker Create() =>
    new JsonTaxonomyBroker(new Dictionary<ClassificationSystem, string>
    {
      [ClassificationSystem.EcoicopV2] =
        CreateArtifact("ECOICOP_V2", "2", EcoicopCode, "Food products"),
      [ClassificationSystem.Gs1Gpc] =
        CreateArtifact("GS1_GPC", "2026-05", GpcCode, "Food or beverage products"),
      [ClassificationSystem.Nace21] =
        CreateArtifact("NACE_2_1", "2.1", NaceCode, "Retail sale in non-specialised stores"),
    });

  private static string CreateArtifact(string system, string version, string code, string label) =>
    JsonSerializer.Serialize(new
    {
      system,
      version,
      sourceUrl = "https://example.test",
      generatedAt = "2026-08-19T00:00:00Z",
      attribution = "Test",
      nodes = new[]
      {
        new
        {
          code,
          officialLabel = label,
          level = "leaf",
          parentCode = (string?)null,
          hierarchyCodes = new[] { code },
          hierarchyLabels = new[] { label },
          definition = (string?)null,
          searchText = label.ToUpperInvariant(),
        },
      },
    });
}
