/**
 * @fileoverview Base entity interface for DDD entities with identity and audit metadata.
 * @module types/DDD/Entities/BaseEntity
 */

import type {IAuditable} from "./";

/**
 * Base entity with unique identity and comprehensive audit metadata.
 *
 * @typeParam T - Type of the unique identifier (typically string UUID or number)
 *
 * @remarks
 * **Domain-Driven Design Concept:** Entity with unique identity that persists across lifecycle.
 *
 * **Key Characteristics:**
 * - Identity (`id`) distinguishes entities even if all other properties match
 * - ID is immutable after entity creation
 * - Includes full audit trail via IAuditable (creation, modification, soft delete)
 * - Generic identifier type allows flexibility (UUID strings, numeric IDs, etc.)
 *
 * **Identity Equality:** Two BaseEntity instances are equal if their IDs match,
 * regardless of other property values.
 *
 * **Lifecycle Management:**
 * - `createdAt`/`createdBy`: Track entity origin
 * - `lastUpdatedAt`/`lastUpdatedBy`: Track most recent modification
 * - `numberOfUpdates`: Audit trail counter
 * - `isSoftDeleted`: Logical deletion without data loss
 * - `isImportant`: User-defined priority/favorite flag
 *
 * @example
 * ```typescript
 * interface Invoice extends BaseEntity<string> {
 *   merchantId: string;
 *   totalAmount: number;
 * }
 *
 * const invoice: Invoice = {
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   merchantId: "merchant-123",
 *   totalAmount: 99.99,
 *   createdAt: new Date(),
 *   createdBy: "user-456",
 *   lastUpdatedAt: new Date(),
 *   lastUpdatedBy: "user-456",
 *   numberOfUpdates: 0,
 *   isImportant: false,
 *   isSoftDeleted: false
 * };
 * ```
 *
 * @see {@link IAuditable} for audit metadata contract
 * @see {@link NamedEntity} for entities with names and descriptions
 */
export interface BaseEntity<T> extends IAuditable {
  /**
   * Unique identifier distinguishing this entity from all others.
   *
   * @remarks
   * **Immutability:** Should not change after entity creation.
   *
   * **Common Types:**
   * - `string`: UUID v4/v7 (e.g., "550e8400-e29b-41d4-a716-446655440000")
   * - `number`: Auto-incrementing database ID
   * - Custom types: Composite keys or domain-specific identifiers
   *
   * **Identity Equality:** Two entities with the same ID are considered the same entity.
   */
  readonly id: T;
}
