/**
 * @fileoverview Merchant type definitions for vendor/retailer tracking.
 * @module types/invoices/Merchant
 *
 * @remarks
 * This module defines merchant (vendor/retailer) types used for tracking
 * where purchases are made. Merchants are shared across invoices and users,
 * enabling analytics and vendor management.
 *
 * **Merchant Hierarchy:**
 * Merchants can belong to parent companies (e.g., local Lidl store → Lidl GmbH).
 * This enables corporate-level reporting while maintaining store-level detail.
 *
 * **Data Sources:**
 * - AI extraction from invoice headers/footers
 * - User manual entry
 * - Public business registry lookups
 *
 * @see {@link Invoice.merchantReference} for merchant linkage
 * @see {@link NamedEntity} for base entity contract
 */

import type {NamedEntity} from "../DDD";

/**
 * Categorizes merchants by their business type and scale.
 *
 * @remarks
 * Used for filtering, reporting, and analytics. Categories help users
 * understand spending patterns across different retail channels.
 *
 * **Numeric Values:**
 * Values are spaced by 100 to allow future subcategory insertion.
 * `NOT_DEFINED` (0) is the default for unclassified merchants.
 *
 * **Category Definitions:**
 * - `LOCAL_SHOP`: Small independent retailers, corner stores
 * - `SUPERMARKET`: Medium-sized grocery chains (e.g., Penny, Profi)
 * - `HYPERMARKET`: Large-format stores (e.g., Carrefour, Kaufland)
 * - `ONLINE_SHOP`: E-commerce platforms and online retailers
 *
 * @example
 * ```typescript
 * const merchant: Merchant = {
 *   category: MerchantCategory.SUPERMARKET,
 *   // ... other properties
 * };
 *
 * // Filter by category for spending reports
 * const supermarkets = merchants.filter(m => m.category === MerchantCategory.SUPERMARKET);
 * ```
 *
 * @see {@link InvoiceCategory} for invoice-level categorization
 */
export enum MerchantCategory {
  NOT_DEFINED = 0,
  LOCAL_SHOP = 100,
  SUPERMARKET = 200,
  HYPERMARKET = 300,
  ONLINE_SHOP = 400,
  OTHER = 9999,
}

/**
 * Contact information value object matching backend's ContactInformation.
 *
 * @remarks
 * Contains various ways to contact or identify a merchant location.
 * All fields are optional strings that may be empty.
 *
 * @example
 * ```typescript
 * const contact: ContactInformation = {
 *   fullName: "Lidl Romania SRL",
 *   address: "Str. Iuliu Maniu 220, Bucharest",
 *   phoneNumber: "+40 21 123 4567",
 *   emailAddress: "contact@lidl.ro",
 *   website: "https://www.lidl.ro"
 * };
 * ```
 */
export interface ContactInformation {
  /** Full legal name or display name */
  fullName: string;
  /** Physical street address */
  address: string;
  /** Contact phone number */
  phoneNumber: string;
  /** Contact email address */
  emailAddress: string;
  /** Website URL */
  website: string;
}

/**
 * Represents a merchant (vendor/retailer) in the invoice system.
 *
 * @remarks
 * **Domain Concept:**
 * A merchant is a shared entity across invoices representing where
 * purchases are made. Multiple invoices can reference the same merchant,
 * enabling vendor-level spending analytics.
 *
 * **Identity:**
 * - `id`: Immutable UUIDv7 string assigned at creation
 * - `name`: Human-readable merchant name (e.g., "Lidl Bucharest Sector 3")
 * - `parentCompanyId`: Links to parent corporation (optional)
 *
 * **Deduplication:**
 * The system attempts to match new merchants with existing entries
 * using name similarity, address matching, and phone number lookups.
 *
 * **Hierarchy:**
 * Merchants can form a tree structure via `parentCompanyId`:
 * ```
 * Lidl GmbH (parent)
 * ├── Lidl Romania (regional parent)
 * │   ├── Lidl Bucharest Store 1
 * │   └── Lidl Bucharest Store 2
 * ```
 *
 * @example
 * ```typescript
 * const merchant: Merchant = {
 *   id: "merchant-uuid-here",
 *   name: "Lidl Bucharest Militari",
 *   description: "Lidl supermarket in Militari neighborhood",
 *   category: MerchantCategory.SUPERMARKET,
 *   address: "Str. Iuliu Maniu 220, Bucharest",
 *   phoneNumber: "+40 21 123 4567",
 *   parentCompanyId: "lidl-romania-uuid",
 *   createdAt: new Date(),
 *   lastUpdatedAt: new Date(),
 *   isDeleted: false
 * };
 * ```
 *
 * @see {@link NamedEntity} for inherited properties (id, name, description, audit fields)
 * @see {@link MerchantCategory} for category options
 */
export interface Merchant extends NamedEntity<string> {
  /** The category of the merchant. */
  category: MerchantCategory;

  /** The contact information and address of the merchant. */
  address: ContactInformation;

  /** The unique identifier of the parent company. */
  parentCompanyId: string;
}

/**
 * DTO payload for creating a new merchant entry.
 *
 * @remarks
 * **Required Fields:**
 * - `name`: Unique merchant identifier for UI display
 * - `description`: Additional context for the merchant
 * - `address`: Physical location for geo-based features
 * - `parentCompanyId`: Links to parent (use empty string for root merchants)
 *
 * **Deduplication:**
 * Before creating, the API checks for existing merchants with similar
 * names and addresses to prevent duplicates. If a match is found,
 * the existing merchant ID is returned instead.
 *
 * @example
 * ```typescript
 * const payload: CreateMerchantDtoPayload = {
 *   name: "Carrefour Orhideea",
 *   description: "Carrefour hypermarket in AFI Cotroceni mall",
 *   address: "Bd. Vasile Milea 4, Bucharest",
 *   parentCompanyId: "carrefour-romania-uuid"
 * };
 *
 * const response = await fetch("/api/merchants", {
 *   method: "POST",
 *   body: JSON.stringify(payload)
 * });
 * ```
 *
 * @see {@link Merchant} for the created entity structure
 */
export type CreateMerchantDtoPayload = {
  /** The name of the merchant. */
  readonly name: string;

  /** The description of the merchant. */
  readonly description: string;

  /** The address of the merchant. */
  readonly address: string;

  /** The unique identifier of the parent company. */
  readonly parentCompanyId: string;
};

/**
 * DTO payload for updating an existing merchant.
 *
 * @remarks
 * **Partial Updates:**
 * Only provided fields are updated. The `id` is required for lookup.
 *
 * **Immutable Fields:**
 * - `id`: Cannot be changed after creation
 * - `createdAt`: Audit timestamp is immutable
 *
 * **Impact:**
 * Updating a merchant affects all invoices referencing it.
 * Changes are reflected immediately across all user views.
 *
 * @typeParam T - The type of the merchant identifier. Defaults to `string`.
 *
 * @example
 * ```typescript
 * const updatePayload: UpdateMerchantDtoPayload = {
 *   id: "merchant-uuid",
 *   category: MerchantCategory.HYPERMARKET,
 *   phoneNumber: "+40 21 999 8888"
 * };
 *
 * await fetch(`/api/merchants/${updatePayload.id}`, {
 *   method: "PATCH",
 *   body: JSON.stringify(updatePayload)
 * });
 * ```
 *
 * @see {@link Merchant} for the entity structure
 */
export type UpdateMerchantDtoPayload<T = string> = {
  /** The unique identifier of the merchant. */
  readonly id: T;
} & Partial<Omit<Merchant, "id">>;

/**
 * DTO payload for deleting a merchant entry.
 *
 * @remarks
 * **Soft Delete:**
 * Merchants are soft-deleted and excluded from normal queries.
 * Historical invoice references remain valid for audit purposes.
 *
 * **Authorization:**
 * Requires `parentCompanyId` to validate hierarchical delete permissions.
 * Root-level merchants may require admin privileges to delete.
 *
 * **Cascade Behavior:**
 * Deleting a merchant does NOT cascade to child merchants.
 * Child merchants become orphaned (parentCompanyId points to deleted entity).
 *
 * @typeParam T - The type of the merchant identifier. Defaults to `string`.
 *
 * @example
 * ```typescript
 * const deletePayload: DeleteMerchantDtoPayload = {
 *   id: "merchant-uuid-to-delete",
 *   parentCompanyId: "parent-company-uuid"
 * };
 *
 * await fetch(`/api/merchants/${deletePayload.id}`, {
 *   method: "DELETE",
 *   body: JSON.stringify(deletePayload)
 * });
 * ```
 *
 * @see {@link Merchant} for the entity being deleted
 */
export type DeleteMerchantDtoPayload<T = string> = {
  /** The unique identifier of the merchant. */
  readonly id: T;

  /** The unique identifier of the parent company. */
  readonly parentCompanyId: string;
};
