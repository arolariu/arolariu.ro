/**
 * @fileoverview Unit tests for allergenLabels utility.
 * @module app/domains/invoices/_components/allergens/allergenLabels.test
 */

import {AllergenCode} from "@/types/invoices/Allergen";
import {describe, expect, it} from "vitest";
import {ALLERGEN_LABEL_KEYS, getAllergenLabelKey} from "./allergenLabels";

const ALL_CODES = Object.values(AllergenCode) as AllergenCode[];

describe("allergenLabels", () => {
  it("provides a key for all 14 EU allergen codes", () => {
    expect(ALL_CODES).toHaveLength(14);
    for (const code of ALL_CODES) {
      expect(getAllergenLabelKey(code)).toBeTruthy();
    }
  });

  it("maps every code to a distinct key", () => {
    const keys = ALL_CODES.map((c) => getAllergenLabelKey(c));
    const unique = new Set(keys);
    expect(unique.size).toBe(14);
  });

  it("all keys follow the allergens.codes.* namespace pattern", () => {
    for (const code of ALL_CODES) {
      expect(getAllergenLabelKey(code)).toMatch(/^allergens\.codes\./);
    }
  });

  it("ALLERGEN_LABEL_KEYS has exactly 14 entries", () => {
    expect(Object.keys(ALLERGEN_LABEL_KEYS)).toHaveLength(14);
  });

  it("getAllergenLabelKey returns the same value as the map lookup", () => {
    for (const code of ALL_CODES) {
      expect(getAllergenLabelKey(code)).toBe(ALLERGEN_LABEL_KEYS[code]);
    }
  });
});
