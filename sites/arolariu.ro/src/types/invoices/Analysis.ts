/**
 * @fileoverview Runtime-safe analysis enqueue contracts for the invoices domain.
 * @module types/invoices/Analysis
 *
 * @remarks
 * The analysis API accepts named profiles with optional capability overrides and
 * acknowledges a durable asynchronous run. The guards in this module validate
 * server-action inputs and untrusted backend acknowledgement JSON.
 */

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
 * Represents the recipe-generation override and its optional bounded result cap.
 */
export interface RecipeGenerationOverride extends AnalysisCapabilityOverride {
  /** Maximum recipes to generate when enabled, from one through three. */
  readonly maximumRecipes?: 1 | 2 | 3;
}

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
  readonly profile: AnalysisProfile;
  /** The capabilities persisted for the accepted run. */
  readonly acceptedCapabilities: readonly AnalysisCapability[];
  /** The ISO-8601 instant at which the run was accepted. */
  readonly acceptedAt: string;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(record: Readonly<Record<string, unknown>>, allowedKeys: readonly string[]): boolean {
  return Object.keys(record).every((key) => allowedKeys.includes(key));
}

function isGuid(value: unknown): value is string {
  return typeof value === "string" && /^[\da-f]{8}-[\da-f]{4}-[47][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/iu.test(value);
}

function isCapabilityOverride(value: unknown): value is AnalysisCapabilityOverride {
  return isRecord(value) && hasOnlyKeys(value, ["enabled"]) && typeof value["enabled"] === "boolean";
}

function isRecipeGenerationOverride(value: unknown): value is RecipeGenerationOverride {
  if (!isRecord(value) || !hasOnlyKeys(value, ["enabled", "maximumRecipes"]) || typeof value["enabled"] !== "boolean") {
    return false;
  }

  const maximumRecipes = value["maximumRecipes"];
  return maximumRecipes === undefined || maximumRecipes === 1 || maximumRecipes === 2 || maximumRecipes === 3;
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
    (value["documentExtraction"] === undefined || isCapabilityOverride(value["documentExtraction"]))
    && (value["merchantResolution"] === undefined || isCapabilityOverride(value["merchantResolution"]))
    && (value["invoiceSummary"] === undefined || isCapabilityOverride(value["invoiceSummary"]))
    && (value["productClassification"] === undefined || isCapabilityOverride(value["productClassification"]))
    && (value["allergenAssessment"] === undefined || isCapabilityOverride(value["allergenAssessment"]))
    && (value["invoiceClassification"] === undefined || isCapabilityOverride(value["invoiceClassification"]))
    && (value["recipeGeneration"] === undefined || isRecipeGenerationOverride(value["recipeGeneration"]))
  );
}

function isMerchantAnalysisOverrides(value: unknown): value is MerchantAnalysisOverrides {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["merchantClassification", "descriptionGeneration"])
    && (value["merchantClassification"] === undefined || isCapabilityOverride(value["merchantClassification"]))
    && (value["descriptionGeneration"] === undefined || isCapabilityOverride(value["descriptionGeneration"]))
  );
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
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["profile", "overrides"])
    && isAnalysisProfile(value["profile"])
    && isInvoiceAnalysisOverrides(value["overrides"])
  );
}

/**
 * Determines whether a value is an exact merchant-analysis request payload.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is an {@link AnalyzeMerchantRequest}.
 */
export function isAnalyzeMerchantRequest(value: unknown): value is AnalyzeMerchantRequest {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["profile", "overrides"])
    && isAnalysisProfile(value["profile"])
    && isMerchantAnalysisOverrides(value["overrides"])
  );
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
    || !isAnalysisProfile(value["profile"])
    || !Array.isArray(value["acceptedCapabilities"])
    || !value["acceptedCapabilities"].every(isAnalysisCapability)
    || typeof value["acceptedAt"] !== "string"
    || Number.isNaN(Date.parse(value["acceptedAt"]))
  ) {
    return false;
  }

  return true;
}
