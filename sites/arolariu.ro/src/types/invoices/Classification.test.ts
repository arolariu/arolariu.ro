/**
 * @fileoverview Unit tests for classification transport runtime guards.
 * @module types/invoices/Classification.test
 */

import {
  ClassificationOrigin,
  ClassificationSystem,
  isClassificationSelection,
  isStandardClassification,
  isTaxonomyArtifact,
} from "./Classification";
import {describe, expect, it} from "vitest";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createValidTaxonomyArtifact(): unknown {
  return {
    system: ClassificationSystem.EcoicopV2,
    version: "2",
    sourceUrl: "https://example.test/taxonomy",
    generatedAt: "2026-08-17T20:00:00+00:00",
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

describe("classification transport contracts", () => {
  it("accepts complete canonical selection and classification shapes", () => {
    // Arrange
    const selection = {system: ClassificationSystem.EcoicopV2, code: "01.1"};
    const classification = {
      ...selection,
      version: "2",
      officialLabel: "Food",
      hierarchy: [{level: "group", code: "01.1", officialLabel: "Food"}],
      origin: ClassificationOrigin.Analysis,
      confidence: 0.98,
      evidence: [{source: "receipt", value: "Groceries"}],
    };

    // Assert
    expect(isClassificationSelection(selection)).toBe(true);
    expect(isStandardClassification(classification)).toBe(true);
  });

  it("rejects taxonomy artifacts with invalid timestamps or hierarchy integrity", () => {
    // Arrange
    const validArtifact = createValidTaxonomyArtifact();
    if (!isRecord(validArtifact)) {
      throw new Error("The taxonomy fixture must be an object.");
    }

    const nodes = validArtifact["nodes"];
    if (!Array.isArray(nodes)) {
      throw new Error("The taxonomy fixture must contain nodes.");
    }

    const root = nodes.at(0);
    const child = nodes.at(1);
    if (!isRecord(root) || !isRecord(child)) {
      throw new Error("The taxonomy fixture must contain root and child nodes.");
    }

    // Assert
    expect(isTaxonomyArtifact(validArtifact)).toBe(true);
    expect(isTaxonomyArtifact({...validArtifact, generatedAt: "2026-02-30T20:00:00Z"})).toBe(false);
    expect(isTaxonomyArtifact({...validArtifact, nodes: [root, child, root]})).toBe(false);
    expect(isTaxonomyArtifact({...validArtifact, nodes: [{...root, parentCode: "01"}, child]})).toBe(false);
    expect(isTaxonomyArtifact({...validArtifact, nodes: [root, {...child, parentCode: "missing"}]})).toBe(false);
    expect(isTaxonomyArtifact({...validArtifact, nodes: [root, {...child, hierarchyLabels: ["Food"]}]})).toBe(false);
    expect(
      isTaxonomyArtifact({
        ...validArtifact,
        nodes: [root, {...child, hierarchyLabels: ["Food and non-alcoholic beverages", "Other"]}],
      }),
    ).toBe(false);
    expect(
      isTaxonomyArtifact({
        ...validArtifact,
        nodes: [root, {...child, hierarchyCodes: ["missing", "01.1"]}],
      }),
    ).toBe(false);
  });
});
