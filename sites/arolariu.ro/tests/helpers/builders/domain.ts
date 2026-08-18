/**
 * @fileoverview Deterministic builders for canonical invoice-domain contracts.
 * @module tests/helpers/builders/domain
 */

import {
  AllergenAssessmentStatus,
  AllergenCode,
  AllergenEvidenceLevel,
  AnalysisProfile,
  ClassificationOrigin,
  ClassificationSystem,
  InvoiceScanType,
  PaymentType,
  RecipeDifficulty,
  type AllergenAssessment,
  type AllergenEvidence,
  type AllergenSignal,
  type AnalyzeInvoiceRequest,
  type AnalyzeMerchantRequest,
  type ClassificationSelection,
  type ContactInformation,
  type CreateInvoiceDtoPayload,
  type CreateInvoiceScanDtoPayload,
  type Invoice,
  type InvoiceScan,
  type Merchant,
  type PaymentInformation,
  type Product,
  type RecipeSuggestion,
  type StandardClassification,
} from "../../../src/types/invoices";
import type {Scan} from "../../../src/types/scans";
import {ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, ScanStatus, ScanType} from "../../../src/types/scans";

const testDate = new Date("2026-01-01T00:00:00.000Z");

/** Builds a canonical standard classification suitable for response tests. */
export function buildClassification(overrides: Partial<StandardClassification> = {}): StandardClassification {
  const system = overrides.system ?? ClassificationSystem.EcoicopV2;
  const code = overrides.code ?? "01.1";
  const officialLabel = overrides.officialLabel ?? "Food";
  const origin = overrides.origin ?? ClassificationOrigin.Analysis;
  return {
    system,
    version: "2026.08",
    code,
    officialLabel,
    hierarchy: [{level: "group", code, officialLabel}],
    origin,
    confidence: origin === ClassificationOrigin.Manual ? null : 0.9,
    evidence: [],
    ...overrides,
  };
}

/** Builds an identity-free product response DTO. */
export function buildProduct(overrides: Partial<Product> = {}): Product {
  const quantity = overrides.quantity ?? 1;
  const price = overrides.price ?? 10;
  return {
    name: "Test Product",
    classification: null,
    quantity,
    quantityUnit: "pcs",
    productCode: "",
    price,
    totalPrice: price * quantity,
    allergenAssessment: null,
    metadata: {isEdited: false, isComplete: true, isSoftDeleted: false, confidence: 1},
    ...overrides,
  };
}

/** Builds one evidence fragment for a structured allergen assessment. */
export function buildAllergenEvidence(overrides: Partial<AllergenEvidence> = {}): AllergenEvidence {
  return {source: "ingredients", value: "Contains milk", ...overrides};
}

/** Builds one EU-14 allergen signal with reviewable evidence. */
export function buildAllergenSignal(overrides: Partial<AllergenSignal> = {}): AllergenSignal {
  return {
    code: AllergenCode.Milk,
    evidenceLevel: AllergenEvidenceLevel.Explicit,
    confidence: 0.9,
    evidence: [buildAllergenEvidence()],
    ...overrides,
  };
}

/**
 * Builds a complete allergen assessment without turning no-signals into a
 * food-safety claim.
 */
export function buildAllergenAssessment(overrides: Partial<AllergenAssessment> = {}): AllergenAssessment {
  const status = overrides.status ?? AllergenAssessmentStatus.NoSignals;
  return {
    status,
    signals: status === AllergenAssessmentStatus.Detected ? [buildAllergenSignal()] : [],
    ...overrides,
  };
}

/** Builds public merchant contact information. */
export function buildContactInformation(overrides: Partial<ContactInformation> = {}): ContactInformation {
  return {
    fullName: "Test Merchant",
    address: "123 Test Street",
    phoneNumber: "+40 700 000 000",
    emailAddress: "merchant@example.test",
    website: "https://merchant.example.test",
    ...overrides,
  };
}

/** Builds a complete merchant response DTO. */
export function buildMerchant(overrides: Partial<Merchant> = {}): Merchant {
  return {
    id: "11111111-1111-7111-8111-111111111111",
    name: "Test Merchant",
    description: "Test merchant description",
    classification: null,
    address: buildContactInformation(),
    parentCompanyId: "00000000-0000-0000-0000-000000000000",
    referencedInvoiceCount: 0,
    referencedInvoiceIds: [],
    additionalMetadata: {},
    createdAt: testDate,
    createdBy: "22222222-2222-7222-8222-222222222222",
    lastUpdatedAt: testDate,
    lastUpdatedBy: "22222222-2222-7222-8222-222222222222",
    numberOfUpdates: 0,
    isImportant: false,
    isSoftDeleted: false,
    ...overrides,
  };
}

/** Builds a public invoice scan response DTO. */
export function buildInvoiceScan(overrides: Partial<InvoiceScan> = {}): InvoiceScan {
  return {type: InvoiceScanType.JPEG, location: "https://storage.example.test/receipt.jpg", ...overrides};
}

/** Builds a structured recipe suggestion. */
export function buildRecipe(overrides: Partial<RecipeSuggestion> = {}): RecipeSuggestion {
  return {
    name: "Test recipe",
    description: "A deterministic recipe suggestion.",
    servings: 2,
    preparationMinutes: 10,
    cookingMinutes: 15,
    totalMinutes: 25,
    difficulty: RecipeDifficulty.Easy,
    purchasedIngredients: [],
    assumedPantryStaples: [],
    missingOptionalIngredients: [],
    steps: [],
    allergenWarnings: [],
    ...overrides,
  };
}

/** Builds a valid invoice analysis enqueue request. */
export function buildInvoiceAnalysisRequest(overrides: Partial<AnalyzeInvoiceRequest> = {}): AnalyzeInvoiceRequest {
  return {profile: AnalysisProfile.Balanced, overrides: {}, ...overrides};
}

/** Builds a valid merchant analysis enqueue request. */
export function buildMerchantAnalysisRequest(overrides: Partial<AnalyzeMerchantRequest> = {}): AnalyzeMerchantRequest {
  return {profile: AnalysisProfile.Balanced, overrides: {}, ...overrides};
}

/** Builds a complete public invoice response DTO. */
export function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "33333333-3333-7333-8333-333333333333",
    userIdentifier: "22222222-2222-7222-8222-222222222222",
    sharedWith: [],
    name: "Test Invoice",
    description: "Test invoice description",
    classification: null,
    scans: [buildInvoiceScan()],
    paymentInformation: buildPaymentInformation(),
    merchantReference: "00000000-0000-0000-0000-000000000000",
    items: [],
    possibleRecipes: [],
    additionalMetadata: {},
    receiptType: "",
    countryRegion: "",
    taxDetails: [],
    payments: [],
    createdAt: testDate,
    createdBy: "22222222-2222-7222-8222-222222222222",
    lastUpdatedAt: testDate,
    lastUpdatedBy: "22222222-2222-7222-8222-222222222222",
    numberOfUpdates: 0,
    isImportant: false,
    isSoftDeleted: false,
    ...overrides,
  };
}

/** Builds valid payment information. */
export function buildPaymentInformation(overrides: Partial<PaymentInformation> = {}): PaymentInformation {
  return {
    transactionDate: testDate,
    paymentType: PaymentType.Card,
    currency: {name: "Romanian Leu", code: "RON", symbol: "lei"},
    totalCostAmount: 10,
    totalTaxAmount: 2,
    subtotalAmount: 8,
    tipAmount: 0,
    ...overrides,
  };
}

/** Builds the legacy create scan input shape consumed by the current create action. */
export function buildCreateInvoiceScanPayload(overrides: Partial<CreateInvoiceScanDtoPayload> = {}): CreateInvoiceScanDtoPayload {
  return {scanType: InvoiceScanType.JPEG, location: "https://storage.example.test/receipt.jpg", metadata: {}, ...overrides};
}

/** Builds the current create invoice input shape. */
export function buildCreateInvoicePayload(overrides: Partial<CreateInvoiceDtoPayload> = {}): CreateInvoiceDtoPayload {
  return {
    userIdentifier: "22222222-2222-7222-8222-222222222222",
    initialScan: buildCreateInvoiceScanPayload(),
    metadata: {},
    ...overrides,
  };
}

/** Builds a scan-store record for upload and invoice-create tests. */
export function buildScan(overrides: Partial<Scan> = {}): Scan {
  return {
    id: "scan-001",
    userIdentifier: "22222222-2222-7222-8222-222222222222",
    name: "receipt.jpg",
    scanType: ScanType.JPEG,
    status: ScanStatus.READY,
    blobUrl: "https://storage.example.test/receipt.jpg",
    mimeType: "image/jpeg",
    sizeInBytes: 100,
    uploadedAt: testDate,
    metadata: {
      scanId: "scan-001",
      ownerId: "22222222-2222-7222-8222-222222222222",
      documentKind: ScanDocumentKind.RECEIPT,
      documentRole: ScanDocumentRole.PRIMARY,
      status: ScanMetadataStatus.READY,
      uploadedAt: testDate,
      uploadedBy: "22222222-2222-7222-8222-222222222222",
    },
    ...overrides,
  };
}

/** Builds a mutation-safe classification selection. */
export function buildClassificationSelection(overrides: Partial<ClassificationSelection> = {}): ClassificationSelection {
  return {system: ClassificationSystem.EcoicopV2, code: "01.1", ...overrides};
}
