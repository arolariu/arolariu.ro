/**
 * @fileoverview Unit tests for the server-only generated taxonomy catalog.
 * @module lib/taxonomies/taxonomyCatalog.server.test
 */

import {ClassificationSystem} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {searchTaxonomyArtifact, searchTaxonomyCatalog} from "./taxonomyCatalog.server";

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
});
