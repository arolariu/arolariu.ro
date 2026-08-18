/**
 * @fileoverview Unit tests for analysis transport runtime guards and option resolution.
 * @module types/invoices/Analysis.test
 */

import {
  AnalysisCapability,
  AnalysisProfile,
  AnalysisTargetType,
  isAnalysisAcceptedResponse,
  isAnalysisAcceptedResponseForRequest,
  isAnalyzeInvoiceRequest,
  isAnalyzeMerchantRequest,
  resolveAnalysisRequest,
} from "./Analysis";
import {describe, expect, it} from "vitest";

const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";
const merchantIdentifier = "22222222-2222-4222-8222-222222222222";

const fastInvoiceCapabilities = [
  AnalysisCapability.DocumentExtraction,
  AnalysisCapability.MerchantResolution,
  AnalysisCapability.ProductClassification,
  AnalysisCapability.InvoiceClassification,
] as const;

const balancedMerchantCapabilities = [AnalysisCapability.MerchantClassification, AnalysisCapability.DescriptionGeneration] as const;

describe("analysis transport contracts", () => {
  it("resolves every named invoice profile and preserves its profile when overrides are empty", () => {
    // Arrange
    const expectedCapabilities = new Map<AnalysisProfile, readonly AnalysisCapability[]>([
      [
        AnalysisProfile.Fast,
        [
          AnalysisCapability.DocumentExtraction,
          AnalysisCapability.MerchantResolution,
          AnalysisCapability.ProductClassification,
          AnalysisCapability.InvoiceClassification,
        ],
      ],
      [
        AnalysisProfile.Balanced,
        [
          AnalysisCapability.DocumentExtraction,
          AnalysisCapability.MerchantResolution,
          AnalysisCapability.InvoiceSummary,
          AnalysisCapability.ProductClassification,
          AnalysisCapability.AllergenAssessment,
          AnalysisCapability.InvoiceClassification,
        ],
      ],
      [
        AnalysisProfile.Comprehensive,
        [
          AnalysisCapability.DocumentExtraction,
          AnalysisCapability.MerchantResolution,
          AnalysisCapability.InvoiceSummary,
          AnalysisCapability.ProductClassification,
          AnalysisCapability.AllergenAssessment,
          AnalysisCapability.InvoiceClassification,
          AnalysisCapability.RecipeGeneration,
        ],
      ],
    ]);

    for (const [profile, acceptedCapabilities] of expectedCapabilities) {
      // Act
      const resolved = resolveAnalysisRequest(AnalysisTargetType.Invoice, {profile, overrides: {}});

      // Assert
      expect(resolved).toMatchObject({
        targetType: AnalysisTargetType.Invoice,
        profile,
        acceptedCapabilities,
      });
    }
  });

  it("resolves enabled recipes without a cap to the backend maximum and marks actual overrides custom", () => {
    // Act
    const resolved = resolveAnalysisRequest(AnalysisTargetType.Invoice, {
      profile: AnalysisProfile.Balanced,
      overrides: {recipeGeneration: {enabled: true}},
    });

    // Assert
    expect(resolved).toMatchObject({
      targetType: AnalysisTargetType.Invoice,
      profile: "custom",
      maximumRecipes: 3,
      acceptedCapabilities: [
        AnalysisCapability.DocumentExtraction,
        AnalysisCapability.MerchantResolution,
        AnalysisCapability.InvoiceSummary,
        AnalysisCapability.ProductClassification,
        AnalysisCapability.AllergenAssessment,
        AnalysisCapability.InvoiceClassification,
        AnalysisCapability.RecipeGeneration,
      ],
    });
  });

  it("resolves every named merchant profile with merchant-only capabilities", () => {
    // Arrange
    const expectedCapabilities = new Map<AnalysisProfile, readonly AnalysisCapability[]>([
      [AnalysisProfile.Fast, [AnalysisCapability.MerchantClassification]],
      [AnalysisProfile.Balanced, balancedMerchantCapabilities],
      [AnalysisProfile.Comprehensive, balancedMerchantCapabilities],
    ]);

    for (const [profile, acceptedCapabilities] of expectedCapabilities) {
      // Act
      const resolved = resolveAnalysisRequest(AnalysisTargetType.Merchant, {profile, overrides: {}});

      // Assert
      expect(resolved).toMatchObject({
        targetType: AnalysisTargetType.Merchant,
        profile,
        acceptedCapabilities,
      });
    }
  });

  it("rejects malformed, empty, cross-target, and dependency-invalid requests", () => {
    // Arrange
    const disabledAllFastCapabilities = {
      profile: AnalysisProfile.Fast,
      overrides: {
        documentExtraction: {enabled: false},
        merchantResolution: {enabled: false},
        productClassification: {enabled: false},
        invoiceClassification: {enabled: false},
      },
    };
    const disabledRecipeWithCap = {
      profile: AnalysisProfile.Balanced,
      overrides: {recipeGeneration: {enabled: false, maximumRecipes: 1}},
    };
    const allergenWithoutProducts = {
      profile: AnalysisProfile.Fast,
      overrides: {
        productClassification: {enabled: false},
        allergenAssessment: {enabled: true},
      },
    };
    const recipesWithoutAllergens = {
      profile: AnalysisProfile.Fast,
      overrides: {recipeGeneration: {enabled: true}},
    };
    const invoiceCapabilityOnMerchant = {
      profile: AnalysisProfile.Fast,
      overrides: {invoiceSummary: {enabled: true}},
    };
    const unknownInvoiceOverride = {
      profile: AnalysisProfile.Fast,
      overrides: {documentExtraction: {enabled: true}, unsupported: {enabled: true}},
    };
    const unknownRequestField = {
      profile: AnalysisProfile.Fast,
      overrides: {},
      unsupported: true,
    };
    const undefinedOverride = {
      profile: AnalysisProfile.Fast,
      overrides: {documentExtraction: undefined},
    };
    const outputOnlyCustomProfile = {
      profile: "custom",
      overrides: {},
    };

    // Assert
    expect(isAnalyzeInvoiceRequest(disabledAllFastCapabilities)).toBe(false);
    expect(isAnalyzeInvoiceRequest(disabledRecipeWithCap)).toBe(false);
    expect(isAnalyzeInvoiceRequest(allergenWithoutProducts)).toBe(false);
    expect(isAnalyzeInvoiceRequest(recipesWithoutAllergens)).toBe(false);
    expect(isAnalyzeMerchantRequest(invoiceCapabilityOnMerchant)).toBe(false);
    expect(isAnalyzeInvoiceRequest(unknownInvoiceOverride)).toBe(false);
    expect(isAnalyzeInvoiceRequest(unknownRequestField)).toBe(false);
    expect(isAnalyzeInvoiceRequest(undefinedOverride)).toBe(false);
    expect(isAnalyzeInvoiceRequest(outputOnlyCustomProfile)).toBe(false);
  });

  it("accepts a custom acknowledgement with non-empty, unique, target-appropriate capabilities", () => {
    // Arrange
    const response = {
      runId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      targetType: AnalysisTargetType.Invoice,
      targetId: invoiceIdentifier,
      status: "queued",
      profile: "custom",
      acceptedCapabilities: fastInvoiceCapabilities,
      acceptedAt: "2026-08-17T19:40:42.187Z",
    };

    // Assert
    expect(isAnalysisAcceptedResponse(response)).toBe(true);
  });

  it("rejects acknowledgement GUID, date, capability, and target contract violations", () => {
    // Arrange
    const validResponse = {
      runId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      targetType: AnalysisTargetType.Invoice,
      targetId: invoiceIdentifier,
      status: "queued",
      profile: AnalysisProfile.Fast,
      acceptedCapabilities: fastInvoiceCapabilities,
      acceptedAt: "2026-08-17T19:40:42.187Z",
    };

    // Assert
    expect(isAnalysisAcceptedResponse({...validResponse, runId: "not-a-guid"})).toBe(false);
    expect(isAnalysisAcceptedResponse({...validResponse, targetId: "not-a-guid"})).toBe(false);
    expect(isAnalysisAcceptedResponse({...validResponse, acceptedAt: "2026-02-30T19:40:42Z"})).toBe(false);
    expect(isAnalysisAcceptedResponse({...validResponse, acceptedAt: "2026-08-17 19:40:42Z"})).toBe(false);
    expect(isAnalysisAcceptedResponse({...validResponse, acceptedCapabilities: []})).toBe(false);
    expect(
      isAnalysisAcceptedResponse({
        ...validResponse,
        acceptedCapabilities: [AnalysisCapability.DocumentExtraction, AnalysisCapability.DocumentExtraction],
      }),
    ).toBe(false);
    expect(
      isAnalysisAcceptedResponse({
        ...validResponse,
        acceptedCapabilities: [AnalysisCapability.MerchantClassification],
      }),
    ).toBe(false);
  });

  it("matches acknowledgements to the resolved request with case-insensitive GUID comparison", () => {
    // Arrange
    const resolvedRequest = resolveAnalysisRequest(AnalysisTargetType.Invoice, {
      profile: AnalysisProfile.Fast,
      overrides: {},
    });
    const response = {
      runId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      targetType: AnalysisTargetType.Invoice,
      targetId: invoiceIdentifier,
      status: "queued",
      profile: AnalysisProfile.Fast,
      acceptedCapabilities: fastInvoiceCapabilities,
      acceptedAt: "2026-08-17T19:40:42.187Z",
    };

    if (resolvedRequest === null) {
      throw new Error("The fast invoice request must resolve.");
    }

    // Assert
    expect(
      isAnalysisAcceptedResponseForRequest(response, {
        targetType: AnalysisTargetType.Invoice,
        targetIdentifier: invoiceIdentifier.toUpperCase(),
        resolvedRequest,
      }),
    ).toBe(true);
    expect(
      isAnalysisAcceptedResponseForRequest(
        {...response, acceptedCapabilities: [AnalysisCapability.DocumentExtraction]},
        {
          targetType: AnalysisTargetType.Invoice,
          targetIdentifier: invoiceIdentifier,
          resolvedRequest,
        },
      ),
    ).toBe(false);
    expect(
      isAnalysisAcceptedResponseForRequest(
        {...response, targetType: AnalysisTargetType.Merchant, targetId: merchantIdentifier},
        {
          targetType: AnalysisTargetType.Invoice,
          targetIdentifier: invoiceIdentifier,
          resolvedRequest,
        },
      ),
    ).toBe(false);
  });
});
