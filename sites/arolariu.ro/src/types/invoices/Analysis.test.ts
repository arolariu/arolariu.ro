/**
 * @fileoverview Tests for the invoice/merchant analysis capability resolution and request building.
 * @module types/invoices/Analysis.test
 */

import {describe, expect, it} from "vitest";
import {
  applyInvoiceDependencyClosure,
  buildAnalysisRequest,
  isInvoiceAnalysisCapabilitiesValid,
  resolveAnalysisCapabilities,
} from "./Analysis";

// ---------------------------------------------------------------------------
// resolveAnalysisCapabilities
// ---------------------------------------------------------------------------
describe("resolveAnalysisCapabilities", () => {
  it("fast preset returns exact expected shape", () => {
    expect(resolveAnalysisCapabilities("invoice", "fast")).toStrictEqual({
      documentExtraction: true,
      invoiceSummary: false,
      productClassification: true,
      allergenAssessment: false,
      invoiceClassification: true,
      recipeGeneration: false,
      maximumRecipes: 0,
    });
  });

  it("balanced preset enables invoiceSummary and allergenAssessment, leaves recipeGeneration false", () => {
    const caps = resolveAnalysisCapabilities("invoice", "balanced");
    expect(caps.invoiceSummary).toBe(true);
    expect(caps.allergenAssessment).toBe(true);
    expect(caps.recipeGeneration).toBe(false);
  });

  it("comprehensive preset enables recipeGeneration and sets maximumRecipes to 3", () => {
    const caps = resolveAnalysisCapabilities("invoice", "comprehensive");
    expect(caps.recipeGeneration).toBe(true);
    expect(caps.maximumRecipes).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// applyInvoiceDependencyClosure
// ---------------------------------------------------------------------------
describe("applyInvoiceDependencyClosure", () => {
  it("allergenAssessment=true with productClassification=false pulls productClassification to true", () => {
    const result = applyInvoiceDependencyClosure({
      documentExtraction: false,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: true,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 0,
    });
    expect(result.productClassification).toBe(true);
  });

  it("invoiceClassification=true with both deps false pulls documentExtraction AND productClassification to true", () => {
    const result = applyInvoiceDependencyClosure({
      documentExtraction: false,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: true,
      recipeGeneration: false,
      maximumRecipes: 0,
    });
    expect(result.documentExtraction).toBe(true);
    expect(result.productClassification).toBe(true);
  });

  it("recipeGeneration=true pulls productClassification and allergenAssessment to true", () => {
    const result = applyInvoiceDependencyClosure({
      documentExtraction: false,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: true,
      maximumRecipes: 2,
    });
    expect(result.productClassification).toBe(true);
    expect(result.allergenAssessment).toBe(true);
    expect(result.maximumRecipes).toBe(2); // already in range, preserved
  });

  it("clamps maximumRecipes from 9 to 3 when recipeGeneration is on", () => {
    const result = applyInvoiceDependencyClosure({
      documentExtraction: false,
      invoiceSummary: false,
      productClassification: true,
      allergenAssessment: true,
      invoiceClassification: false,
      recipeGeneration: true,
      maximumRecipes: 9,
    });
    expect(result.maximumRecipes).toBe(3);
  });

  it("clamps maximumRecipes from 0 to 1 when recipeGeneration is on", () => {
    const result = applyInvoiceDependencyClosure({
      documentExtraction: false,
      invoiceSummary: false,
      productClassification: true,
      allergenAssessment: true,
      invoiceClassification: false,
      recipeGeneration: true,
      maximumRecipes: 0,
    });
    expect(result.maximumRecipes).toBe(1);
  });

  it("zeroes maximumRecipes when recipeGeneration is off", () => {
    const result = applyInvoiceDependencyClosure({
      documentExtraction: true,
      invoiceSummary: false,
      productClassification: true,
      allergenAssessment: false,
      invoiceClassification: false,
      recipeGeneration: false,
      maximumRecipes: 2,
    });
    expect(result.maximumRecipes).toBe(0);
  });

  it("is idempotent (running twice gives same result)", () => {
    const base = {
      documentExtraction: false,
      invoiceSummary: false,
      productClassification: false,
      allergenAssessment: true,
      invoiceClassification: true,
      recipeGeneration: true,
      maximumRecipes: 9,
    };
    const once = applyInvoiceDependencyClosure(base);
    const twice = applyInvoiceDependencyClosure(once);
    expect(once).toStrictEqual(twice);
  });
});

// ---------------------------------------------------------------------------
// isInvoiceAnalysisCapabilitiesValid
// ---------------------------------------------------------------------------
describe("isInvoiceAnalysisCapabilitiesValid", () => {
  it("all-false capability set returns false", () => {
    expect(
      isInvoiceAnalysisCapabilitiesValid({
        documentExtraction: false,
        invoiceSummary: false,
        productClassification: false,
        allergenAssessment: false,
        invoiceClassification: false,
        recipeGeneration: false,
        maximumRecipes: 0,
      }),
    ).toBe(false);
  });

  it("fast preset returns true", () => {
    expect(isInvoiceAnalysisCapabilitiesValid(resolveAnalysisCapabilities("invoice", "fast"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildAnalysisRequest
// ---------------------------------------------------------------------------
describe("buildAnalysisRequest", () => {
  it("balanced profile with no overrides returns exactly {profile:'balanced'}", () => {
    expect(buildAnalysisRequest("invoice", "balanced")).toStrictEqual({profile: "balanced"});
  });

  it("fast with invoiceSummary override emits profile and invoiceSummary", () => {
    const req = buildAnalysisRequest("invoice", "fast", {invoiceSummary: true});
    expect(req.profile).toBe("fast");
    expect(req.invoiceSummary).toBe(true);
  });

  it("omits maximumRecipes when recipeGeneration is off", () => {
    const req = buildAnalysisRequest("invoice", "fast");
    expect(req).not.toHaveProperty("maximumRecipes");
  });

  it("never includes userIdentifier", () => {
    const req = buildAnalysisRequest("invoice", "balanced");
    expect(req).not.toHaveProperty("userIdentifier");
  });

  it("never includes analysisOptions", () => {
    const req = buildAnalysisRequest("invoice", "balanced");
    expect(req).not.toHaveProperty("analysisOptions");
  });

  it("profile is always one of the three requestable values, never 'custom'", () => {
    const profiles = ["fast", "balanced", "comprehensive"] as const;
    for (const p of profiles) {
      expect(buildAnalysisRequest("invoice", p).profile).toBe(p);
    }
  });
});

// ---------------------------------------------------------------------------
// Merchant target
// ---------------------------------------------------------------------------
describe("buildAnalysisRequest merchant target", () => {
  it("fast profile returns exactly {profile:'fast'}", () => {
    expect(buildAnalysisRequest("merchant", "fast")).toStrictEqual({profile: "fast"});
  });
});

describe("resolveAnalysisCapabilities merchant target", () => {
  it("fast returns exactly {merchantClassification:true, descriptionGeneration:false}", () => {
    expect(resolveAnalysisCapabilities("merchant", "fast")).toStrictEqual({
      merchantClassification: true,
      descriptionGeneration: false,
    });
  });

  it("comprehensive returns {merchantClassification:true, descriptionGeneration:true}", () => {
    expect(resolveAnalysisCapabilities("merchant", "comprehensive")).toStrictEqual({
      merchantClassification: true,
      descriptionGeneration: true,
    });
  });
});
