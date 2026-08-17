/**
 * @fileoverview Runtime-safe analysis enqueue contracts for the invoices domain.
 * @module types/invoices/Analysis
 *
 * @remarks
 * The analysis API accepts named profiles with optional capability overrides and
 * acknowledges a durable asynchronous run. The guards in this module validate
 * server-action inputs, resolve their effective options, and validate untrusted
 * backend acknowledgement JSON.
 */

import {isStrictRfc3339Timestamp} from "./transportValidation";

/**
 * Published analysis profiles accepted by invoice and merchant enqueue requests.
 */
export const AnalysisProfile = {
  Fast: "fast",
  Balanced: "balanced",
  Comprehensive: "comprehensive",
} as const;

const analysisProfileValues: readonly string[] = Object.values(AnalysisProfile);

/**
 * Union of published analysis-profile values.
 */
export type AnalysisProfile = (typeof AnalysisProfile)[keyof typeof AnalysisProfile];

/**
 * Effective profiles that the backend may persist on an accepted run.
 *
 * @remarks
 * `custom` is response-only: clients request a named {@link AnalysisProfile};
 * an actual override causes the backend to persist this effective profile.
 */
export const AnalysisAcceptedProfile = {
  ...AnalysisProfile,
  Custom: "custom",
} as const;

const analysisAcceptedProfileValues: readonly string[] = Object.values(AnalysisAcceptedProfile);

/**
 * Union of effective profile values returned by the accepted-run contract.
 */
export type AnalysisAcceptedProfile = (typeof AnalysisAcceptedProfile)[keyof typeof AnalysisAcceptedProfile];

/**
 * Discrete analysis capabilities that may be accepted for a durable run.
 */
export const AnalysisCapability = {
  DocumentExtraction: "documentExtraction",
  MerchantResolution: "merchantResolution",
  InvoiceSummary: "invoiceSummary",
  ProductClassification: "productClassification",
  AllergenAssessment: "allergenAssessment",
  InvoiceClassification: "invoiceClassification",
  RecipeGeneration: "recipeGeneration",
  MerchantClassification: "merchantClassification",
  DescriptionGeneration: "descriptionGeneration",
} as const;

const analysisCapabilityValues: readonly string[] = Object.values(AnalysisCapability);

/**
 * Union of analysis-capability values.
 */
export type AnalysisCapability = (typeof AnalysisCapability)[keyof typeof AnalysisCapability];

/**
 * Analysis targets that the frontend may enqueue.
 */
export const AnalysisTargetType = {
  Invoice: "invoice",
  Merchant: "merchant",
} as const;

const analysisTargetTypeValues: readonly string[] = Object.values(AnalysisTargetType);

/**
 * Union of frontend-supported analysis-target values.
 */
export type AnalysisTargetType = (typeof AnalysisTargetType)[keyof typeof AnalysisTargetType];

/**
 * The only durable run status that an enqueue acknowledgement may report.
 */
export const AnalysisRunStatus = {
  Queued: "queued",
} as const;

const analysisRunStatusValues: readonly string[] = Object.values(AnalysisRunStatus);

/**
 * Union of accepted enqueue-status values.
 */
export type AnalysisRunStatus = (typeof AnalysisRunStatus)[keyof typeof AnalysisRunStatus];

/**
 * Represents an explicit enablement override for a single capability.
 */
export interface AnalysisCapabilityOverride {
  /** Whether the capability should run. */
  readonly enabled: boolean;
}

/**
 * Enables recipe generation and optionally constrains its bounded result count.
 */
export interface RecipeGenerationEnabledOverride {
  /** Enables recipe generation for the accepted run. */
  readonly enabled: true;
  /** Maximum recipes to generate when enabled, from one through three. */
  readonly maximumRecipes?: 1 | 2 | 3;
}

/**
 * Disables recipe generation without carrying a meaningless result cap.
 */
export interface RecipeGenerationDisabledOverride {
  /** Disables recipe generation for the accepted run. */
  readonly enabled: false;
}

/**
 * Represents the recipe-generation override and its valid enablement-specific shape.
 */
export type RecipeGenerationOverride = RecipeGenerationEnabledOverride | RecipeGenerationDisabledOverride;

/**
 * Represents the invoice capabilities that callers may override.
 */
export interface InvoiceAnalysisOverrides {
  /** Overrides document extraction. */
  readonly documentExtraction?: AnalysisCapabilityOverride;
  /** Overrides merchant resolution. */
  readonly merchantResolution?: AnalysisCapabilityOverride;
  /** Overrides invoice-summary generation. */
  readonly invoiceSummary?: AnalysisCapabilityOverride;
  /** Overrides product classification. */
  readonly productClassification?: AnalysisCapabilityOverride;
  /** Overrides allergen assessment. */
  readonly allergenAssessment?: AnalysisCapabilityOverride;
  /** Overrides invoice-wide classification. */
  readonly invoiceClassification?: AnalysisCapabilityOverride;
  /** Overrides recipe generation and its result cap. */
  readonly recipeGeneration?: RecipeGenerationOverride;
}

/**
 * Represents the merchant capabilities that callers may override.
 */
export interface MerchantAnalysisOverrides {
  /** Overrides merchant classification. */
  readonly merchantClassification?: AnalysisCapabilityOverride;
  /** Overrides merchant-description generation. */
  readonly descriptionGeneration?: AnalysisCapabilityOverride;
}

/**
 * Represents the exact request payload for invoice analysis enqueueing.
 */
export interface AnalyzeInvoiceRequest {
  /** The published profile that supplies the baseline capabilities. */
  readonly profile: AnalysisProfile;
  /** Capability overrides layered over the selected profile. */
  readonly overrides: Readonly<InvoiceAnalysisOverrides>;
}

/**
 * Represents the exact request payload for merchant analysis enqueueing.
 */
export interface AnalyzeMerchantRequest {
  /** The published profile that supplies the baseline capabilities. */
  readonly profile: AnalysisProfile;
  /** Merchant-only capability overrides layered over the selected profile. */
  readonly overrides: Readonly<MerchantAnalysisOverrides>;
}

/**
 * Represents the durable acknowledgement returned by a successful enqueue.
 */
export interface AnalysisAcceptedResponse {
  /** The identifier assigned to the durable analysis run. */
  readonly runId: string;
  /** The domain aggregate targeted by the durable run. */
  readonly targetType: AnalysisTargetType;
  /** The identifier of the targeted invoice or merchant. */
  readonly targetId: string;
  /** The durable state immediately after the enqueue is accepted. */
  readonly status: AnalysisRunStatus;
  /** The profile persisted for the accepted run. */
  readonly profile: AnalysisAcceptedProfile;
  /** The capabilities persisted for the accepted run. */
  readonly acceptedCapabilities: readonly AnalysisCapability[];
  /** The ISO-8601 instant at which the run was accepted. */
  readonly acceptedAt: string;
}

/**
 * Effective options resolved from one valid named-profile request.
 *
 * @remarks
 * The resolver mirrors the backend's profile presets and exact capability
 * closure before an acknowledgement is trusted.
 */
export interface ResolvedAnalysisRequest {
  /** The aggregate type whose capabilities were resolved. */
  readonly targetType: AnalysisTargetType;
  /** Named profile for an empty override object, otherwise the effective custom profile. */
  readonly profile: AnalysisAcceptedProfile;
  /** Canonically ordered capabilities the backend must acknowledge. */
  readonly acceptedCapabilities: readonly AnalysisCapability[];
  /** Resolved invoice recipe cap, or zero for merchant requests. */
  readonly maximumRecipes: 0 | 1 | 2 | 3;
}

/**
 * Expected values that bind an acknowledgement to the enqueue request that produced it.
 */
export interface AnalysisAcceptedResponseExpectation {
  /** Target aggregate type used for the request. */
  readonly targetType: AnalysisTargetType;
  /** Caller-supplied GUID for the target aggregate. */
  readonly targetIdentifier: string;
  /** Effective options resolved from the submitted request. */
  readonly resolvedRequest: ResolvedAnalysisRequest;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(record: Readonly<Record<string, unknown>>, allowedKeys: readonly string[]): boolean {
  return Reflect.ownKeys(record).every((key) => typeof key === "string" && allowedKeys.includes(key));
}

function hasOwnKey(record: Readonly<Record<string, unknown>>, key: string): boolean {
  return Object.hasOwn(record, key);
}

function isGuid(value: unknown): value is string {
  return typeof value === "string" && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu.test(value);
}

function hasOptionalValue(record: Readonly<Record<string, unknown>>, key: string, isValidValue: (value: unknown) => boolean): boolean {
  return !hasOwnKey(record, key) || isValidValue(record[key]);
}

function isCapabilityOverride(value: unknown): value is AnalysisCapabilityOverride {
  return isRecord(value) && hasOnlyKeys(value, ["enabled"]) && hasOwnKey(value, "enabled") && typeof value["enabled"] === "boolean";
}

function isRecipeGenerationOverride(value: unknown): value is RecipeGenerationOverride {
  if (
    !isRecord(value)
    || !hasOnlyKeys(value, ["enabled", "maximumRecipes"])
    || !hasOwnKey(value, "enabled")
    || typeof value["enabled"] !== "boolean"
  ) {
    return false;
  }

  if (!value["enabled"]) {
    return !hasOwnKey(value, "maximumRecipes");
  }

  const maximumRecipes = value["maximumRecipes"];
  return !hasOwnKey(value, "maximumRecipes") || maximumRecipes === 1 || maximumRecipes === 2 || maximumRecipes === 3;
}

function isInvoiceAnalysisOverrides(value: unknown): value is InvoiceAnalysisOverrides {
  if (
    !isRecord(value)
    || !hasOnlyKeys(value, [
      "documentExtraction",
      "merchantResolution",
      "invoiceSummary",
      "productClassification",
      "allergenAssessment",
      "invoiceClassification",
      "recipeGeneration",
    ])
  ) {
    return false;
  }

  return (
    hasOptionalValue(value, "documentExtraction", isCapabilityOverride)
    && hasOptionalValue(value, "merchantResolution", isCapabilityOverride)
    && hasOptionalValue(value, "invoiceSummary", isCapabilityOverride)
    && hasOptionalValue(value, "productClassification", isCapabilityOverride)
    && hasOptionalValue(value, "allergenAssessment", isCapabilityOverride)
    && hasOptionalValue(value, "invoiceClassification", isCapabilityOverride)
    && hasOptionalValue(value, "recipeGeneration", isRecipeGenerationOverride)
  );
}

function isMerchantAnalysisOverrides(value: unknown): value is MerchantAnalysisOverrides {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["merchantClassification", "descriptionGeneration"])
    && hasOptionalValue(value, "merchantClassification", isCapabilityOverride)
    && hasOptionalValue(value, "descriptionGeneration", isCapabilityOverride)
  );
}

function isAnalyzeInvoiceRequestShape(value: unknown): value is AnalyzeInvoiceRequest {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["profile", "overrides"])
    && hasOwnKey(value, "profile")
    && hasOwnKey(value, "overrides")
    && isAnalysisProfile(value["profile"])
    && isInvoiceAnalysisOverrides(value["overrides"])
  );
}

function isAnalyzeMerchantRequestShape(value: unknown): value is AnalyzeMerchantRequest {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["profile", "overrides"])
    && hasOwnKey(value, "profile")
    && hasOwnKey(value, "overrides")
    && isAnalysisProfile(value["profile"])
    && isMerchantAnalysisOverrides(value["overrides"])
  );
}

interface InvoiceCapabilitySelection {
  readonly documentExtraction: boolean;
  readonly merchantResolution: boolean;
  readonly invoiceSummary: boolean;
  readonly productClassification: boolean;
  readonly allergenAssessment: boolean;
  readonly invoiceClassification: boolean;
  readonly recipeGeneration: boolean;
  readonly maximumRecipes: 0 | 1 | 2 | 3;
}

interface MerchantCapabilitySelection {
  readonly merchantClassification: boolean;
  readonly descriptionGeneration: boolean;
}

function resolveInvoiceBaseline(profile: AnalysisProfile): InvoiceCapabilitySelection {
  switch (profile) {
    case AnalysisProfile.Fast:
      return {
        documentExtraction: true,
        merchantResolution: true,
        invoiceSummary: false,
        productClassification: true,
        allergenAssessment: false,
        invoiceClassification: true,
        recipeGeneration: false,
        maximumRecipes: 0,
      };
    case AnalysisProfile.Balanced:
      return {
        documentExtraction: true,
        merchantResolution: true,
        invoiceSummary: true,
        productClassification: true,
        allergenAssessment: true,
        invoiceClassification: true,
        recipeGeneration: false,
        maximumRecipes: 0,
      };
    case AnalysisProfile.Comprehensive:
      return {
        documentExtraction: true,
        merchantResolution: true,
        invoiceSummary: true,
        productClassification: true,
        allergenAssessment: true,
        invoiceClassification: true,
        recipeGeneration: true,
        maximumRecipes: 3,
      };
  }
}

function resolveMerchantBaseline(profile: AnalysisProfile): MerchantCapabilitySelection {
  return {
    merchantClassification: true,
    descriptionGeneration: profile !== AnalysisProfile.Fast,
  };
}

function addCapability(capabilities: AnalysisCapability[], enabled: boolean, capability: AnalysisCapability): void {
  if (enabled) {
    capabilities.push(capability);
  }
}

function resolveInvoiceRequest(request: AnalyzeInvoiceRequest): ResolvedAnalysisRequest | null {
  const baseline = resolveInvoiceBaseline(request.profile);
  const overrides = request.overrides;
  const recipeOverride = overrides.recipeGeneration;
  const selection: InvoiceCapabilitySelection = {
    documentExtraction: overrides.documentExtraction?.enabled ?? baseline.documentExtraction,
    merchantResolution: overrides.merchantResolution?.enabled ?? baseline.merchantResolution,
    invoiceSummary: overrides.invoiceSummary?.enabled ?? baseline.invoiceSummary,
    productClassification: overrides.productClassification?.enabled ?? baseline.productClassification,
    allergenAssessment: overrides.allergenAssessment?.enabled ?? baseline.allergenAssessment,
    invoiceClassification: overrides.invoiceClassification?.enabled ?? baseline.invoiceClassification,
    recipeGeneration: recipeOverride?.enabled ?? baseline.recipeGeneration,
    maximumRecipes:
      recipeOverride === undefined ? baseline.maximumRecipes : recipeOverride.enabled ? (recipeOverride.maximumRecipes ?? 3) : 0,
  };

  if (
    (selection.allergenAssessment && !selection.productClassification)
    || (selection.recipeGeneration && (!selection.productClassification || !selection.allergenAssessment))
  ) {
    return null;
  }

  const acceptedCapabilities: AnalysisCapability[] = [];
  addCapability(acceptedCapabilities, selection.documentExtraction, AnalysisCapability.DocumentExtraction);
  addCapability(acceptedCapabilities, selection.merchantResolution, AnalysisCapability.MerchantResolution);
  addCapability(acceptedCapabilities, selection.invoiceSummary, AnalysisCapability.InvoiceSummary);
  addCapability(acceptedCapabilities, selection.productClassification, AnalysisCapability.ProductClassification);
  addCapability(acceptedCapabilities, selection.allergenAssessment, AnalysisCapability.AllergenAssessment);
  addCapability(acceptedCapabilities, selection.invoiceClassification, AnalysisCapability.InvoiceClassification);
  addCapability(acceptedCapabilities, selection.recipeGeneration, AnalysisCapability.RecipeGeneration);

  if (acceptedCapabilities.length === 0) {
    return null;
  }

  return {
    targetType: AnalysisTargetType.Invoice,
    profile: Object.keys(overrides).length === 0 ? request.profile : AnalysisAcceptedProfile.Custom,
    acceptedCapabilities,
    maximumRecipes: selection.maximumRecipes,
  };
}

function resolveMerchantRequest(request: AnalyzeMerchantRequest): ResolvedAnalysisRequest | null {
  const baseline = resolveMerchantBaseline(request.profile);
  const overrides = request.overrides;
  const selection: MerchantCapabilitySelection = {
    merchantClassification: overrides.merchantClassification?.enabled ?? baseline.merchantClassification,
    descriptionGeneration: overrides.descriptionGeneration?.enabled ?? baseline.descriptionGeneration,
  };
  const acceptedCapabilities: AnalysisCapability[] = [];
  addCapability(acceptedCapabilities, selection.merchantClassification, AnalysisCapability.MerchantClassification);
  addCapability(acceptedCapabilities, selection.descriptionGeneration, AnalysisCapability.DescriptionGeneration);

  if (acceptedCapabilities.length === 0) {
    return null;
  }

  return {
    targetType: AnalysisTargetType.Merchant,
    profile: Object.keys(overrides).length === 0 ? request.profile : AnalysisAcceptedProfile.Custom,
    acceptedCapabilities,
    maximumRecipes: 0,
  };
}

/**
 * Determines whether a value is a published analysis profile.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is an {@link AnalysisProfile}.
 */
export function isAnalysisProfile(value: unknown): value is AnalysisProfile {
  return typeof value === "string" && analysisProfileValues.includes(value);
}

/**
 * Determines whether a value is an effective profile returned by an accepted run.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is an {@link AnalysisAcceptedProfile}.
 */
export function isAnalysisAcceptedProfile(value: unknown): value is AnalysisAcceptedProfile {
  return typeof value === "string" && analysisAcceptedProfileValues.includes(value);
}

/**
 * Determines whether a value is a supported analysis capability.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is an {@link AnalysisCapability}.
 */
export function isAnalysisCapability(value: unknown): value is AnalysisCapability {
  return typeof value === "string" && analysisCapabilityValues.includes(value);
}

/**
 * Determines whether a value is a frontend-supported analysis target.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is an {@link AnalysisTargetType}.
 */
export function isAnalysisTargetType(value: unknown): value is AnalysisTargetType {
  return typeof value === "string" && analysisTargetTypeValues.includes(value);
}

/**
 * Determines whether a value is an accepted enqueue status.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is an {@link AnalysisRunStatus}.
 */
export function isAnalysisRunStatus(value: unknown): value is AnalysisRunStatus {
  return typeof value === "string" && analysisRunStatusValues.includes(value);
}

/**
 * Determines whether a value is an exact invoice-analysis request payload.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is an {@link AnalyzeInvoiceRequest}.
 */
export function isAnalyzeInvoiceRequest(value: unknown): value is AnalyzeInvoiceRequest {
  return resolveAnalysisRequest(AnalysisTargetType.Invoice, value) !== null;
}

/**
 * Determines whether a value is an exact merchant-analysis request payload.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is an {@link AnalyzeMerchantRequest}.
 */
export function isAnalyzeMerchantRequest(value: unknown): value is AnalyzeMerchantRequest {
  return resolveAnalysisRequest(AnalysisTargetType.Merchant, value) !== null;
}

/**
 * Resolves one untrusted analysis request to the backend's effective profile, recipe cap, and capability set.
 *
 * @remarks
 * This pure resolver mirrors `AnalysisOptionsResolver` and
 * `InvoiceAnalysisOptions` in the backend: fast, balanced, and comprehensive
 * use their published baselines; an empty override object preserves that named
 * profile; any actual override produces `custom`. It rejects malformed keys,
 * an empty effective set, and the exact invoice dependency closure
 * `recipeGeneration → allergenAssessment → productClassification`.
 *
 * @param targetType - Aggregate type whose transport shape must be resolved.
 * @param request - Untrusted profile-and-overrides request.
 * @returns Effective options, or `null` when the request is structurally or semantically invalid.
 */
export function resolveAnalysisRequest(targetType: AnalysisTargetType, request: unknown): ResolvedAnalysisRequest | null {
  if (targetType === AnalysisTargetType.Invoice) {
    return isAnalyzeInvoiceRequestShape(request) ? resolveInvoiceRequest(request) : null;
  }

  if (targetType === AnalysisTargetType.Merchant) {
    return isAnalyzeMerchantRequestShape(request) ? resolveMerchantRequest(request) : null;
  }

  return null;
}

function hasUniqueCapabilities(capabilities: readonly AnalysisCapability[]): boolean {
  return new Set(capabilities).size === capabilities.length;
}

function hasTargetAppropriateCapabilities(targetType: AnalysisTargetType, capabilities: readonly AnalysisCapability[]): boolean {
  const allowedCapabilities =
    targetType === AnalysisTargetType.Invoice
      ? new Set<AnalysisCapability>([
          AnalysisCapability.DocumentExtraction,
          AnalysisCapability.MerchantResolution,
          AnalysisCapability.InvoiceSummary,
          AnalysisCapability.ProductClassification,
          AnalysisCapability.AllergenAssessment,
          AnalysisCapability.InvoiceClassification,
          AnalysisCapability.RecipeGeneration,
        ])
      : new Set<AnalysisCapability>([AnalysisCapability.MerchantClassification, AnalysisCapability.DescriptionGeneration]);

  return capabilities.every((capability) => allowedCapabilities.has(capability));
}

function satisfiesCapabilityDependencies(targetType: AnalysisTargetType, capabilities: readonly AnalysisCapability[]): boolean {
  if (targetType === AnalysisTargetType.Merchant) {
    return true;
  }

  const enabledCapabilities = new Set(capabilities);
  const hasProductClassification = enabledCapabilities.has(AnalysisCapability.ProductClassification);
  const hasAllergenAssessment = enabledCapabilities.has(AnalysisCapability.AllergenAssessment);
  const hasRecipeGeneration = enabledCapabilities.has(AnalysisCapability.RecipeGeneration);

  return (
    (!hasAllergenAssessment || hasProductClassification) && (!hasRecipeGeneration || (hasAllergenAssessment && hasProductClassification))
  );
}

function areSameCapabilities(left: readonly AnalysisCapability[], right: readonly AnalysisCapability[]): boolean {
  return left.length === right.length && left.every((capability) => right.includes(capability));
}

function areSameGuid(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

/**
 * Determines whether untrusted JSON is a complete analysis enqueue acknowledgement.
 *
 * @param value - Untrusted backend response JSON to validate.
 * @returns Whether the value is an {@link AnalysisAcceptedResponse}.
 */
export function isAnalysisAcceptedResponse(value: unknown): value is AnalysisAcceptedResponse {
  if (
    !isRecord(value)
    || !hasOnlyKeys(value, ["runId", "targetType", "targetId", "status", "profile", "acceptedCapabilities", "acceptedAt"])
    || !isGuid(value["runId"])
    || !isAnalysisTargetType(value["targetType"])
    || !isGuid(value["targetId"])
    || !isAnalysisRunStatus(value["status"])
    || !isAnalysisAcceptedProfile(value["profile"])
    || !Array.isArray(value["acceptedCapabilities"])
    || value["acceptedCapabilities"].length === 0
    || !value["acceptedCapabilities"].every(isAnalysisCapability)
    || !hasUniqueCapabilities(value["acceptedCapabilities"])
    || !hasTargetAppropriateCapabilities(value["targetType"], value["acceptedCapabilities"])
    || !satisfiesCapabilityDependencies(value["targetType"], value["acceptedCapabilities"])
    || !isStrictRfc3339Timestamp(value["acceptedAt"])
  ) {
    return false;
  }

  return true;
}

/**
 * Determines whether an acknowledgement exactly describes a submitted request.
 *
 * @param value - Untrusted backend response JSON to validate.
 * @param expectation - Requested target identifier, target type, and resolved effective options.
 * @returns Whether the acknowledgement is valid and bound to the submitted request.
 */
export function isAnalysisAcceptedResponseForRequest(
  value: unknown,
  expectation: Readonly<AnalysisAcceptedResponseExpectation>,
): value is AnalysisAcceptedResponse {
  return (
    isAnalysisAcceptedResponse(value)
    && isGuid(expectation.targetIdentifier)
    && expectation.resolvedRequest.targetType === expectation.targetType
    && value.targetType === expectation.targetType
    && areSameGuid(value.targetId, expectation.targetIdentifier)
    && value.profile === expectation.resolvedRequest.profile
    && areSameCapabilities(value.acceptedCapabilities, expectation.resolvedRequest.acceptedCapabilities)
  );
}
