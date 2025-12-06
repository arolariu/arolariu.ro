/**
 * @fileoverview Allergen type definitions for food safety and dietary tracking.
 * @module types/invoices/Allergen
 *
 * @remarks
 * This module defines allergen types used for tracking food allergens in
 * products. Allergens are detected during AI analysis of invoice items and
 * help users identify potentially harmful ingredients.
 *
 * **Regulatory Context:**
 * Allergen tracking aligns with EU Regulation 1169/2011 which mandates
 * declaration of 14 major allergens in food products.
 *
 * **Data Source:**
 * Allergen data is populated through:
 * 1. AI-powered product label analysis
 * 2. Product database lookups (barcode matching)
 * 3. Manual user annotations
 *
 * @see {@link Product} for how allergens are attached to products
 */

/**
 * Represents a food allergen detected in a product.
 *
 * @remarks
 * Allergens are identified during invoice processing and attached to
 * individual products. Each allergen provides educational information
 * to help users understand potential health impacts.
 *
 * **Common Allergens:**
 * - Gluten (wheat, rye, barley)
 * - Dairy (milk, lactose)
 * - Nuts (peanuts, tree nuts)
 * - Shellfish, eggs, soy, etc.
 *
 * **UI Display:**
 * Allergens are displayed with warning icons in the product detail view.
 * The `learnMoreAddress` links to authoritative health resources.
 *
 * @example
 * ```typescript
 * const glutenAllergen: Allergen = {
 *   name: "Gluten",
 *   description: "Found in wheat, rye, barley, and related grains",
 *   learnMoreAddress: "https://www.who.int/allergens/gluten"
 * };
 *
 * // Check if product contains allergens
 * const hasAllergens = product.detectedAllergens.length > 0;
 * ```
 *
 * @see {@link Product.detectedAllergens} for allergen attachment
 */
export type Allergen = {
  /** The name of the allergen. */
  name: string;

  /** A description of the allergen. */
  description: string;

  /** A URL to learn more about the allergen. */
  learnMoreAddress: string;
};

/**
 * DTO payload for creating a new allergen entry.
 *
 * @remarks
 * **Partial Fields:**
 * All fields are optional during creation as allergens may be
 * partially identified by AI and enriched later.
 *
 * **Validation:**
 * If `learnMoreAddress` is provided, it must be a valid HTTPS URL
 * pointing to a trusted health information source.
 *
 * @example
 * ```typescript
 * const payload: CreateAllergenDtoPayload = {
 *   name: "Peanuts",
 *   description: "Tree nut allergen"
 * };
 * ```
 *
 * @see {@link Allergen} for the created entity structure
 */
export type CreateAllergenDtoPayload = Partial<Allergen>;

/**
 * DTO payload for updating an existing allergen entry.
 *
 * @remarks
 * **Partial Updates:**
 * Only provided fields are updated. Omitted fields retain current values.
 *
 * **Use Cases:**
 * - Correcting AI-detected allergen information
 * - Adding missing descriptions or references
 * - Updating educational resource links
 *
 * @example
 * ```typescript
 * const updatePayload: UpdateAllergenDtoPayload = {
 *   description: "Updated description with more details",
 *   learnMoreAddress: "https://new-resource.example.com"
 * };
 * ```
 *
 * @see {@link Allergen} for the entity structure
 */
export type UpdateAllergenDtoPayload = Partial<Allergen>;

/**
 * DTO payload for deleting an allergen entry.
 *
 * @remarks
 * Allergens are identified by name for deletion since they don't have
 * a separate GUID identifier. The name must exactly match the existing
 * allergen entry (case-sensitive).
 *
 * **Cascade Behavior:**
 * Deleting an allergen removes it from the master list but does NOT
 * remove references from products. Products retain historical allergen
 * data for audit purposes.
 *
 * @example
 * ```typescript
 * const deletePayload: DeleteAllergenDtoPayload = {
 *   name: "Gluten"
 * };
 * ```
 *
 * @see {@link Allergen} for the entity being deleted
 */
export type DeleteAllergenDtoPayload = {
  /** The name of the allergen. */
  readonly name: string;
};
