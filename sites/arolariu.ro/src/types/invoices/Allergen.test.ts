/**
 * @fileoverview Tests for the EU-14 canonical allergen model guards.
 * @module types/invoices/Allergen.test
 */

import {describe, expect, it} from "vitest";
import {AllergenCode, isAllergenAssessment, isAllergenCode, isAllergenSignal} from "./Allergen";

// ---------------------------------------------------------------------------
// Shared fixtures (no `any` — passed directly to `unknown`-parameter guards)
// ---------------------------------------------------------------------------

const validEvidence = {source: "productLabel", value: "contains wheat"};

const validSignal = {
  code: "cerealsContainingGluten",
  evidenceLevel: "explicit",
  confidence: 0.95,
  evidence: [validEvidence],
};

// ---------------------------------------------------------------------------

describe("isAllergenCode", () => {
  it("AllergenCode object has exactly 14 canonical codes", () => {
    expect(Object.values(AllergenCode)).toHaveLength(14);
  });

  it("accepts all 14 canonical wire strings", () => {
    for (const code of Object.values(AllergenCode)) {
      expect(isAllergenCode(code), `expected "${code}" to be accepted`).toBe(true);
    }
  });

  it("rejects 'gluten' (not a canonical wire string)", () => {
    expect(isAllergenCode("gluten")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isAllergenCode("")).toBe(false);
  });
});

describe("isAllergenSignal", () => {
  it("accepts a fully populated signal", () => {
    expect(isAllergenSignal(validSignal)).toBe(true);
  });

  it("rejects unknown evidenceLevel 'guessed'", () => {
    expect(isAllergenSignal({...validSignal, evidenceLevel: "guessed"})).toBe(false);
  });

  it("rejects confidence 1.4 (above 1)", () => {
    expect(isAllergenSignal({...validSignal, confidence: 1.4})).toBe(false);
  });

  it("rejects confidence -0.1 (below 0)", () => {
    expect(isAllergenSignal({...validSignal, confidence: -0.1})).toBe(false);
  });
});

describe("isAllergenAssessment", () => {
  it("accepts {status:'detected', signals:[valid]}", () => {
    expect(isAllergenAssessment({status: "detected", signals: [validSignal]})).toBe(true);
  });

  it("accepts {status:'noSignals', signals:[]}", () => {
    expect(isAllergenAssessment({status: "noSignals", signals: []})).toBe(true);
  });

  it("accepts {status:'insufficientData', signals:[]}", () => {
    expect(isAllergenAssessment({status: "insufficientData", signals: []})).toBe(true);
  });

  it("REJECTS {status:'detected', signals:[]}", () => {
    expect(isAllergenAssessment({status: "detected", signals: []})).toBe(false);
  });

  it("REJECTS {status:'noSignals', signals:[valid]}", () => {
    expect(isAllergenAssessment({status: "noSignals", signals: [validSignal]})).toBe(false);
  });
});
