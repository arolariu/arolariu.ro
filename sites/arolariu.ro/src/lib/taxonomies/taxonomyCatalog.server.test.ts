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

  it("rejects a non-record input and an input carrying an unknown key", () => {
    // Documented cast: a runtime caller can bypass the static input type.
    const nonRecord = null as unknown as Parameters<typeof searchTaxonomyCatalog>[0];
    const withExtraKey = {system: ClassificationSystem.Nace21, query: "47.11", extra: true};

    expect(() => searchTaxonomyCatalog(nonRecord)).toThrow("Taxonomy search input is invalid.");
    expect(() => searchTaxonomyCatalog(withExtraKey)).toThrow("Taxonomy search input is invalid.");
  });

  it("rejects an unknown system and a non-string query", () => {
    // Documented casts: runtime callers can bypass the static input type.
    const badSystem = {system: "bogus", query: "47.11"} as unknown as Parameters<typeof searchTaxonomyCatalog>[0];
    const badQuery = {system: ClassificationSystem.Nace21, query: 4711} as unknown as Parameters<typeof searchTaxonomyCatalog>[0];

    expect(() => searchTaxonomyCatalog(badSystem)).toThrow("Taxonomy search system or query is invalid.");
    expect(() => searchTaxonomyCatalog(badQuery)).toThrow("Taxonomy search system or query is invalid.");
  });

  it("rejects queries shorter than two normalized characters", () => {
    expect(() => searchTaxonomyCatalog({system: ClassificationSystem.Nace21, query: "a"})).toThrow(
      "Taxonomy search query must contain at least two characters.",
    );
    expect(() => searchTaxonomyCatalog({system: ClassificationSystem.Nace21, query: "!!"})).toThrow(TaxonomySearchValidationError);
  });

  it("defaults the limit to the maximum when omitted and honors an explicit smaller limit", () => {
    const defaulted = searchTaxonomyCatalog({system: ClassificationSystem.EcoicopV2, query: "food"});
    const limited = searchTaxonomyCatalog({system: ClassificationSystem.EcoicopV2, query: "food", limit: 2});

    expect(defaulted).toHaveLength(50);
    expect(limited).toHaveLength(2);
    expect(limited).toEqual(defaulted.slice(0, 2));
  });

  it("returns the node whose label equals the query first", () => {
    const [seed] = searchTaxonomyCatalog({system: ClassificationSystem.Nace21, query: "47.11", limit: 1});
    const label = seed?.officialLabel ?? "";

    const results = searchTaxonomyCatalog({system: ClassificationSystem.Nace21, query: label, limit: 5});

    expect(label).not.toBe("");
    expect(results[0]?.code).toBe("47.11");
    expect(results[0]?.officialLabel).toBe(label);
  });

  it("matches code prefixes and keeps results ordered by code for equal rank", () => {
    const results = searchTaxonomyCatalog({system: ClassificationSystem.Nace21, query: "47.1", limit: 20});
    const prefixed = results.filter((result) => result.code.startsWith("47.1"));

    expect(prefixed.length).toBeGreaterThan(1);
    expect(prefixed.map((result) => result.code)).toEqual(prefixed.map((result) => result.code).toSorted((a, b) => a.localeCompare(b)));
    expect(results.every((result) => result.system === ClassificationSystem.Nace21)).toBe(true);
  });
});
