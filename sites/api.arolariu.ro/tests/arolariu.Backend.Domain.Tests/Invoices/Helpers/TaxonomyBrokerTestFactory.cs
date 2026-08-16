namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Creates <see cref="JsonTaxonomyBroker"/> instances backed by deterministic in-memory JSON artifacts for tests.
/// </summary>
public static class TaxonomyBrokerTestFactory
{
  private static readonly string[] FoodDivisionHierarchyCodes = ["01"];
  private static readonly string[] FoodDivisionHierarchyLabels = ["Food and non-alcoholic beverages"];
  private static readonly string[] FoodGroupHierarchyCodes = ["01", "01.1"];
  private static readonly string[] FoodGroupHierarchyLabels = ["Food and non-alcoholic beverages", "Food"];

  /// <summary>
  /// Creates a broker seeded with small deterministic artifacts for all supported taxonomy systems.
  /// </summary>
  /// <returns>A taxonomy broker instance using injected JSON artifacts.</returns>
  public static ITaxonomyBroker Create() =>
    new JsonTaxonomyBroker(new Dictionary<ClassificationSystem, string>
    {
      [ClassificationSystem.EcoicopV2] = """
        {
          "system": "ECOICOP_V2",
          "version": "2",
          "sourceUrl": "https://example.test/ecoicop",
          "generatedAt": "2026-08-16T14:09:17.303Z",
          "attribution": "Test ECOICOP artifact",
          "nodes": [
            {
              "code": "01",
              "officialLabel": "Food and non-alcoholic beverages",
              "level": "division",
              "parentCode": null,
              "hierarchyCodes": ["01"],
              "hierarchyLabels": ["Food and non-alcoholic beverages"],
              "definition": null,
              "searchText": "01 food and non alcoholic beverages food and non alcoholic beverages"
            },
            {
              "code": "01.1",
              "officialLabel": "Food",
              "level": "group",
              "parentCode": "01",
              "hierarchyCodes": ["01", "01.1"],
              "hierarchyLabels": ["Food and non-alcoholic beverages", "Food"],
              "definition": null,
              "searchText": "01.1 food food and non alcoholic beverages food"
            },
            {
              "code": "01.1.1",
              "officialLabel": "Cereals and cereal products (ND)",
              "level": "class",
              "parentCode": "01.1",
              "hierarchyCodes": ["01", "01.1", "01.1.1"],
              "hierarchyLabels": ["Food and non-alcoholic beverages", "Food", "Cereals and cereal products (ND)"],
              "definition": null,
              "searchText": "01.1.1 cereals and cereal products nd food and non alcoholic beverages food cereals and cereal products nd"
            },
            {
              "code": "01.1.1.1",
              "officialLabel": "Cereals (ND)",
              "level": "subclass",
              "parentCode": "01.1.1",
              "hierarchyCodes": ["01", "01.1", "01.1.1", "01.1.1.1"],
              "hierarchyLabels": ["Food and non-alcoholic beverages", "Food", "Cereals and cereal products (ND)", "Cereals (ND)"],
              "definition": null,
              "searchText": "01.1.1.1 cereals nd food and non alcoholic beverages food cereals and cereal products nd cereals nd"
            },
            {
              "code": "01.1.1.2",
              "officialLabel": "Flours and other cereals",
              "level": "subclass",
              "parentCode": "01.1.1",
              "hierarchyCodes": ["01", "01.1", "01.1.1", "01.1.1.2"],
              "hierarchyLabels": ["Food and non-alcoholic beverages", "Food", "Cereals and cereal products (ND)", "Flours and other cereals"],
              "definition": null,
              "searchText": "01.1.1.2 flours and other cereals food and non alcoholic beverages food cereals and cereal products nd flours and other cereals"
            }
          ]
        }
        """,
      [ClassificationSystem.Nace21] = """
        {
          "system": "NACE_2_1",
          "version": "2.1",
          "sourceUrl": "https://example.test/nace",
          "generatedAt": "2026-08-16T14:09:17.303Z",
          "attribution": "Test NACE artifact",
          "nodes": [
            {
              "code": "A",
              "officialLabel": "AGRICULTURE, FORESTRY AND FISHING",
              "level": "section",
              "parentCode": null,
              "hierarchyCodes": ["A"],
              "hierarchyLabels": ["AGRICULTURE, FORESTRY AND FISHING"],
              "definition": null,
              "searchText": "a agriculture forestry and fishing agriculture forestry and fishing"
            },
            {
              "code": "01",
              "officialLabel": "Crop and animal production, hunting and related service activities",
              "level": "division",
              "parentCode": "A",
              "hierarchyCodes": ["A", "01"],
              "hierarchyLabels": ["AGRICULTURE, FORESTRY AND FISHING", "Crop and animal production, hunting and related service activities"],
              "definition": null,
              "searchText": "01 crop and animal production hunting and related service activities agriculture forestry and fishing crop and animal production hunting and related service activities"
            }
          ]
        }
        """,
      [ClassificationSystem.Gs1Gpc] = """
        {
          "system": "GS1_GPC",
          "version": "2026-05",
          "sourceUrl": "https://example.test/gpc",
          "generatedAt": "2026-08-16T14:09:17.303Z",
          "attribution": "Test GPC artifact",
          "nodes": [
            {
              "code": "10000025",
              "officialLabel": "Milk / Butter / Cream / Yogurt / Eggs / Egg Substitutes",
              "level": "segment",
              "parentCode": null,
              "hierarchyCodes": ["10000025"],
              "hierarchyLabels": ["Milk / Butter / Cream / Yogurt / Eggs / Egg Substitutes"],
              "definition": "Test node",
              "searchText": "10000025 milk butter cream yogurt eggs egg substitutes"
            }
          ]
        }
        """
    });

  /// <summary>
  /// Creates a broker with a large ECOICOP artifact to exercise result capping behavior.
  /// </summary>
  /// <param name="nodeCount">The number of generated subclass nodes.</param>
  /// <returns>A taxonomy broker backed by a generated large artifact.</returns>
  public static ITaxonomyBroker CreateLargeEcoicopBroker(int nodeCount)
  {
    object[] nodes = new object[]
    {
      new
      {
        code = "01",
        officialLabel = "Food and non-alcoholic beverages",
        level = "division",
        parentCode = (string?)null,
        hierarchyCodes = FoodDivisionHierarchyCodes,
        hierarchyLabels = FoodDivisionHierarchyLabels,
        definition = (string?)null,
        searchText = "01 food and non alcoholic beverages"
      },
      new
      {
        code = "01.1",
        officialLabel = "Food",
        level = "group",
        parentCode = "01",
        hierarchyCodes = FoodGroupHierarchyCodes,
        hierarchyLabels = FoodGroupHierarchyLabels,
        definition = (string?)null,
        searchText = "01.1 food food and non alcoholic beverages food"
      }
    }
    .Concat(Enumerable.Range(1, nodeCount)
      .Select(index => new
      {
        code = $"01.1.{index:D2}",
        officialLabel = $"Food item {index:D2}",
        level = "class",
        parentCode = "01.1",
        hierarchyCodes = new[] { "01", "01.1", $"01.1.{index:D2}" },
        hierarchyLabels = new[] { "Food and non-alcoholic beverages", "Food", $"Food item {index:D2}" },
        definition = (string?)null,
        searchText = $"01.1.{index:D2} food item {index:D2} food"
      })
      .Cast<object>())
    .ToArray();

    string artifactJson = JsonSerializer.Serialize(new
    {
      system = "ECOICOP_V2",
      version = "2",
      sourceUrl = "https://example.test/ecoicop-large",
      generatedAt = "2026-08-16T14:09:17.303Z",
      attribution = "Large test ECOICOP artifact",
      nodes
    });

    return new JsonTaxonomyBroker(new Dictionary<ClassificationSystem, string>
    {
      [ClassificationSystem.EcoicopV2] = artifactJson,
      [ClassificationSystem.Nace21] = """
        {
          "system": "NACE_2_1",
          "version": "2.1",
          "sourceUrl": "https://example.test/nace",
          "generatedAt": "2026-08-16T14:09:17.303Z",
          "attribution": "Test NACE artifact",
          "nodes": []
        }
        """,
      [ClassificationSystem.Gs1Gpc] = """
        {
          "system": "GS1_GPC",
          "version": "2026-05",
          "sourceUrl": "https://example.test/gpc",
          "generatedAt": "2026-08-16T14:09:17.303Z",
          "attribution": "Test GPC artifact",
          "nodes": []
        }
        """
    });
  }
}
