/**
 * @fileoverview Unit tests for the taxonomy classification search server action.
 * @module app/domains/invoices/_actions/analysis/searchClassifications.test
 */

import {ClassificationSystem} from "@/types/invoices";
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
    });

    // Assert
    expect(result).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Taxonomy search request is invalid.",
      },
    });
  });

  it("returns standardized validation results for null and non-object action input", async () => {
    // Act
    const nullInputResult = await searchClassifications(null);
    const stringInputResult = await searchClassifications("food");

    // Assert
    const expectedResult = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Taxonomy search request is invalid.",
      },
    };
    expect(nullInputResult).toEqual(expectedResult);
    expect(stringInputResult).toEqual(expectedResult);
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

  it("rejects queries that normalize to fewer than two searchable characters", async () => {
    // Act
    const whitespaceResult = await searchClassifications({
      system: ClassificationSystem.EcoicopV2,
      query: "  a  ",
    });
    const combiningMarkResult = await searchClassifications({
      system: ClassificationSystem.EcoicopV2,
      query: "\u0301a",
    });
    const punctuationResult = await searchClassifications({
      system: ClassificationSystem.EcoicopV2,
      query: " ! ",
    });

    // Assert
    for (const result of [whitespaceResult, combiningMarkResult, punctuationResult]) {
      expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    }
  });
});
