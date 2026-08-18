/**
 * @fileoverview Strict merchant response and mutation contracts.
 * @module types/invoices/Merchant
 */

import type {NamedEntity} from "../DDD";
import type {ClassificationSelection, StandardClassification} from "./Classification";

/** Contact information returned for a merchant. */
export interface ContactInformation {
  /** Legal or display name. */
  readonly fullName: string;
  /** Postal address. */
  readonly address: string;
  /** Phone number. */
  readonly phoneNumber: string;
  /** Email address. */
  readonly emailAddress: string;
  /** Public website address. */
  readonly website: string;
}

/** A merchant entity returned by the public REST DTO. */
export interface Merchant extends NamedEntity<string> {
  /** Canonical NACE classification, or null when no classification exists. */
  readonly classification: StandardClassification | null;
  /** Structured merchant contact details. */
  readonly address: ContactInformation;
  /** Parent company identifier, or the empty GUID when no parent exists. */
  readonly parentCompanyId: string;
  /** Number of invoices referencing this merchant. */
  readonly referencedInvoiceCount: number;
  /** IDs of invoices referencing this merchant. */
  readonly referencedInvoiceIds: readonly string[];
  /** Public string metadata retained by the backend. */
  readonly additionalMetadata: Readonly<Record<string, string>>;
}

/** Full merchant update payload accepted by the backend. */
export interface UpdateMerchantDtoPayload {
  /** Merchant identity from the URL path. */
  readonly id: string;
  /** Merchant display name. */
  readonly name: string;
  /** Merchant description. */
  readonly description: string;
  /** New manual NACE selection, or null to retain the persisted classification. */
  readonly classification: ClassificationSelection | null;
  /** Contact information to persist. */
  readonly address: ContactInformation;
  /** Wire-compatible parent company value; backend retains the persisted partition parent. */
  readonly parentCompanyId: string | null;
  /** Public string metadata to replace when non-empty. */
  readonly additionalMetadata: Readonly<Record<string, string>> | null;
}

/** Merchant deletion inputs retained by existing delete actions. */
export type DeleteMerchantDtoPayload = Readonly<{
  /** Merchant identifier. */
  readonly id: string;
  /** Parent company identifier required by existing delete actions. */
  readonly parentCompanyId: string;
}>;
