import {describe, expect, it} from "vitest";
import {ClassificationSystem} from "@/types/invoices";
import {searchTaxonomyCatalog, TaxonomySearchValidationError} from "./taxonomyCatalog.server";

describe("taxonomy catalog", () => {
  it("ranks exact canonical codes first", () => {
    const results = searchTaxonomyCatalog({
      system: ClassificationSystem.Nace21,
      query: "47.11",
      limit: 5,
    });

    expect(results[0]?.code).toBe("47.11");
    expect(results[0]).not.toHaveProperty("searchText");
    expect(results[0]).not.toHaveProperty("definition");
  });

  it("normalizes diacritics and bounds results", () => {
    const results = searchTaxonomyCatalog({
      system: ClassificationSystem.EcoicopV2,
      query: "aliment",
      limit: 3,
    });

    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("rejects invalid limits", () => {
    expect(() =>
      searchTaxonomyCatalog({
        system: ClassificationSystem.Gs1Gpc,
        query: "food",
        limit: 51,
      }),
    ).toThrow(TaxonomySearchValidationError);
  });
});
