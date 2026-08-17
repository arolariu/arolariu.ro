/**
 * @fileoverview Unit tests for the taxonomy classification search server action.
 * @module app/domains/invoices/_actions/analysis/searchClassifications.test
 */

import {ClassificationSystem, type SearchClassificationsInput} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {searchClassifications} from "./searchClassifications";

describe("searchClassifications", () => {
  it("returns a standard result containing bounded taxonomy projections", async () => {
    // Act
    const result = await searchClassifications({
      system: ClassificationSystem.EcoicopV2,
      query: "food",
      limit: 2,
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toMatchObject({
        system: ClassificationSystem.EcoicopV2,
        code: "01.1",
        officialLabel: "Food",
      });
      expect(result.data[0]).not.toHaveProperty("searchText");
      expect(result.data[0]).not.toHaveProperty("definition");
    }
  });

  it("returns an explicit validation result for invalid action input", async () => {
    // Act
    const result = await searchClassifications({
      system: "UNSUPPORTED_SYSTEM",
      query: "food",
      limit: 1,
    } as unknown as SearchClassificationsInput);

    // Assert
    expect(result).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
      },
    });
  });

  it("returns an explicit validation result for a blank query and excessive limit", async () => {
    // Act
    const blankQueryResult = await searchClassifications({
      system: ClassificationSystem.Nace21,
      query: "   ",
    });
    const excessiveLimitResult = await searchClassifications({
      system: ClassificationSystem.Nace21,
      query: "agriculture",
      limit: 51,
    });

    // Assert
    expect(blankQueryResult).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(excessiveLimitResult).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
  });
});
