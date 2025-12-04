/**
 * @fileoverview Named entity interface for entities with human-readable labels and descriptions.
 * @module types/DDD/Entities/NamedEntity
 */

import type {BaseEntity} from "./";

/**
 * Entity with human-readable name and description extending base entity capabilities.
 *
 * @typeParam T - Type of the unique identifier (typically string UUID or number)
 *
 * @remarks
 * **Use Case:** Entities that need user-facing labels beyond technical identifiers.
 *
 * **Extends BaseEntity:** Inherits identity (id) and full audit metadata (IAuditable).
 *
 * **Additional Properties:**
 * - `name`: User-facing label for display in UI (e.g., "Invoice #12345", "SuperMart")
 * - `description`: Longer explanatory text providing context (e.g., "Monthly grocery purchase")
 *
 * **Common Examples:**
 * - Invoices: Name = "Invoice #12345", Description = "Grocery shopping at SuperMart"
 * - Merchants: Name = "SuperMart Downtown", Description = "Large supermarket in city center"
 * - Products: Name = "Organic Bananas", Description = "Fresh organic bananas from local farms"
 * - Categories: Name = "Electronics", Description = "Consumer electronics and gadgets"
 *
 * **Searchability:** Name and description fields typically used for full-text search.
 *
 * **Display:** Name is primary label in lists/dropdowns; description provides tooltip/detail text.
 *
 * @example
 * ```typescript
 * interface Merchant extends NamedEntity<string> {
 *   category: MerchantCategory;
 *   address: string;
 * }
 *
 * const merchant: Merchant = {
 *   id: "merchant-uuid",
 *   name: "Whole Foods Market",
 *   description: "Organic grocery chain specializing in natural and organic foods",
 *   category: MerchantCategory.SUPERMARKET,
 *   address: "123 Main St, Austin TX",
 *   createdAt: new Date("2024-01-01"),
 *   createdBy: "admin-user",
 *   lastUpdatedAt: new Date("2024-01-01"),
 *   lastUpdatedBy: "admin-user",
 *   numberOfUpdates: 0,
 *   isImportant: true,
 *   isSoftDeleted: false
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Searchable entity
 * function searchEntities(query: string, entities: NamedEntity<string>[]) {
 *   return entities.filter(
 *     e => e.name.toLowerCase().includes(query.toLowerCase())
 *       || e.description.toLowerCase().includes(query.toLowerCase())
 *   );
 * }
 * ```
 *
 * @see {@link BaseEntity} for base entity with identity and audit metadata
 */
export interface NamedEntity<T> extends BaseEntity<T> {
  /**
   * Human-readable name for display in user interfaces.
   *
   * @remarks
   * **Usage:**
   * - Primary label in lists, dropdowns, and cards
   * - Searchable field for user queries
   * - Typically shorter than description (e.g., 50-100 chars)
   *
   * **Examples:**
   * - "Invoice #12345"
   * - "Whole Foods Market"
   * - "Organic Bananas"
   */
  name: string;

  /**
   * Detailed description providing context and additional information.
   *
   * @remarks
   * **Usage:**
   * - Tooltip text in UI
   * - Detail view content
   * - Searchable secondary field
   * - Typically longer than name (e.g., 100-500 chars)
   *
   * **Examples:**
   * - "Monthly grocery shopping at Whole Foods Market on 2024-01-15"
   * - "Organic grocery chain specializing in natural and organic foods"
   * - "Fresh organic bananas sourced from local farms in Central America"
   */
  description: string;
}
