/**
 * @fileoverview Unit tests for the server-only generated taxonomy catalog.
 * @module lib/taxonomies/taxonomyCatalog.server.test
 */

import {ClassificationSystem} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {searchTaxonomyArtifact, searchTaxonomyCatalog} from "./taxonomyCatalog.server";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createValidTaxonomyArtifact(): unknown {
  return {
    system: ClassificationSystem.EcoicopV2,
    version: "2",
    sourceUrl: "https://example.test/taxonomy",
    generatedAt: "2026-08-17T20:00:00.000Z",
    attribution: "Example",
    nodes: [
      {
        code: "01",
        officialLabel: "Food and non-alcoholic beverages",
        level: "division",
        parentCode: null,
        hierarchyCodes: ["01"],
        hierarchyLabels: ["Food and non-alcoholic beverages"],
        definition: null,
        searchText: "food non alcoholic beverages",
      },
      {
        code: "01.1",
        officialLabel: "Food",
        level: "group",
        parentCode: "01",
        hierarchyCodes: ["01", "01.1"],
        hierarchyLabels: ["Food and non-alcoholic beverages", "Food"],
        definition: null,
        searchText: "food non alcoholic beverages",
      },
    ],
  };
}

describe("taxonomyCatalog", () => {
  it("searches the generated ECOICOP catalog with stable relevance ranking", () => {
    // Act
    const results = searchTaxonomyCatalog({
      system: ClassificationSystem.EcoicopV2,
      query: "food",
      limit: 3,
    });

    // Assert
    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({
      system: ClassificationSystem.EcoicopV2,
      code: "01.1",
      officialLabel: "Food",
    });
    expect(results[0]).not.toHaveProperty("searchText");
    expect(results[0]).not.toHaveProperty("definition");
    expect(results[0]).not.toHaveProperty("nodes");
  });

  it("ranks an exact canonical code before prefix and token-overlap matches", () => {
    // Act
    const results = searchTaxonomyCatalog({
      system: ClassificationSystem.Gs1Gpc,
      query: "70000000",
      limit: 3,
    });

    // Assert
    expect(results[0]).toMatchObject({
      code: "70000000",
      officialLabel: "Arts/Crafts/Needlework",
    });
  });

  it("normalizes diacritics for Unicode label searches", () => {
    // Act
    const results = searchTaxonomyCatalog({
      system: ClassificationSystem.EcoicopV2,
      query: "purees",
      limit: 5,
    });

    // Assert
    expect(results.length).toBeGreaterThan(0);
  });

  it("rejects invalid artifact envelopes and invalid query bounds explicitly", () => {
    // Arrange
    const invalidArtifact = {
      system: ClassificationSystem.EcoicopV2,
      version: "2",
      sourceUrl: "https://example.test/taxonomy",
      generatedAt: "2026-08-16T00:00:00.000Z",
      attribution: "Example",
      nodes: [{code: "01"}],
    };

    // Assert
    expect(() => searchTaxonomyArtifact(invalidArtifact, "food", 1)).toThrow("Invalid taxonomy artifact");
    expect(() =>
      searchTaxonomyCatalog({
        system: ClassificationSystem.EcoicopV2,
        query: "food",
        limit: 51,
      }),
    ).toThrow("between 1 and 50");
    expect(() =>
      searchTaxonomyCatalog({
        system: ClassificationSystem.EcoicopV2,
        query: "   ",
      }),
    ).toThrow("non-empty");
  });

  it("rejects corrupt taxonomy node relationships before normalizing a catalog", () => {
    // Arrange
    const artifact = createValidTaxonomyArtifact();
    if (!isRecord(artifact)) {
      throw new Error("The taxonomy fixture must be an object.");
    }

    const nodes = artifact["nodes"];
    if (!Array.isArray(nodes)) {
      throw new Error("The taxonomy fixture must contain nodes.");
    }

    const root = nodes.at(0);
    const child = nodes.at(1);
    if (!isRecord(root) || !isRecord(child)) {
      throw new Error("The taxonomy fixture must contain root and child nodes.");
    }

    // Assert
    expect(() => searchTaxonomyArtifact({...artifact, generatedAt: "2026-02-30T20:00:00Z"}, "food")).toThrow("Invalid taxonomy artifact");
    expect(() => searchTaxonomyArtifact({...artifact, nodes: [root, child, root]}, "food")).toThrow("Invalid taxonomy artifact");
    expect(() => searchTaxonomyArtifact({...artifact, nodes: [{...root, parentCode: "01"}, child]}, "food")).toThrow(
      "Invalid taxonomy artifact",
    );
    expect(() => searchTaxonomyArtifact({...artifact, nodes: [root, {...child, parentCode: "missing"}]}, "food")).toThrow(
      "Invalid taxonomy artifact",
    );
    expect(() =>
      searchTaxonomyArtifact(
        {...artifact, nodes: [root, {...child, hierarchyLabels: ["Food and non-alcoholic beverages", "Other"]}]},
        "food",
      ),
    ).toThrow("Invalid taxonomy artifact");
  });
});
