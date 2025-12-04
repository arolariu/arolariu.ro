/**
 * @fileoverview Audit metadata contract for entity traceability and compliance.
 * @module types/DDD/Entities/IAuditable
 */

/**
 * Comprehensive audit trail contract for domain entities requiring lifecycle tracking.
 *
 * @remarks
 * **Purpose:** Ensures consistent audit metadata across all domain entities for:
 * - Compliance and regulatory requirements
 * - Debugging and troubleshooting (who changed what when)
 * - Data lineage and provenance tracking
 * - User activity auditing
 *
 * **Implementation:** Mix this interface into entity types that need audit trails.
 * Typically all persistent domain entities should implement IAuditable.
 *
 * **Metadata Categories:**
 *
 * 1. **Creation Tracking:**
 *    - `createdAt`: Timestamp of entity creation
 *    - `createdBy`: User identifier who created the entity
 *
 * 2. **Modification Tracking:**
 *    - `lastUpdatedAt`: Timestamp of most recent update
 *    - `lastUpdatedBy`: User identifier who made last update
 *    - `numberOfUpdates`: Counter of total modifications (versioning)
 *
 * 3. **Lifecycle Flags:**
 *    - `isImportant`: User-defined priority/favorite flag
 *    - `isSoftDeleted`: Logical deletion without physical data removal
 *
 * **Soft Delete Pattern:**
 * Instead of physically removing records, set `isSoftDeleted = true`.
 * This preserves data for:
 * - Audit trails and compliance
 * - Accidental deletion recovery
 * - Historical reporting
 * - Foreign key integrity
 *
 * **Query Considerations:**
 * Default queries should filter `isSoftDeleted = false`.
 * Admin/audit queries may include soft-deleted records.
 *
 * @example
 * ```typescript
 * interface Product extends IAuditable {
 *   id: string;
 *   name: string;
 *   price: number;
 * }
 *
 * const product: Product = {
 *   id: "product-123",
 *   name: "Organic Milk",
 *   price: 4.99,
 *   createdAt: new Date("2024-01-01T10:00:00Z"),
 *   createdBy: "user-456",
 *   lastUpdatedAt: new Date("2024-01-15T14:30:00Z"),
 *   lastUpdatedBy: "user-789",
 *   numberOfUpdates: 3,
 *   isImportant: false,
 *   isSoftDeleted: false
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Soft delete pattern
 * function softDelete(entity: IAuditable, userId: string): void {
 *   entity.isSoftDeleted = true;
 *   entity.lastUpdatedAt = new Date();
 *   entity.lastUpdatedBy = userId;
 *   entity.numberOfUpdates++;
 * }
 *
 * // Query with soft delete filter
 * function getActiveEntities<T extends IAuditable>(entities: T[]): T[] {
 *   return entities.filter(e => !e.isSoftDeleted);
 * }
 * ```
 *
 * @see {@link BaseEntity} which extends this interface
 */
export interface IAuditable {
  /**
   * Timestamp when the entity was first created.
   *
   * @remarks
   * **Immutability:** Should never change after initial creation.
   *
   * **Timezone:** Store in UTC; convert to user timezone for display.
   *
   * **Precision:** Typically ISO 8601 format (e.g., "2024-01-01T10:00:00Z").
   */
  readonly createdAt: Date;

  /**
   * Identifier of the user who created this entity.
   *
   * @remarks
   * **Format:** Typically UUID string or numeric user ID.
   *
   * **Immutability:** Should never change after initial creation.
   *
   * **Anonymous Users:** Use sentinel value like "system" or "anonymous".
   *
   * @example
   * - "user-550e8400-e29b-41d4-a716-446655440000" (UUID)
   * - "system" (automated process)
   * - "admin" (administrative user)
   */
  readonly createdBy: string;

  /**
   * Timestamp of the most recent modification to this entity.
   *
   * @remarks
   * **Updates:** Should be updated on every entity modification.
   *
   * **Initial Value:** Set equal to `createdAt` on creation.
   *
   * **Timezone:** Store in UTC; convert to user timezone for display.
   */
  lastUpdatedAt: Date;

  /**
   * Identifier of the user who most recently modified this entity.
   *
   * @remarks
   * **Format:** Typically UUID string or numeric user ID.
   *
   * **Updates:** Should be updated on every entity modification.
   *
   * **Initial Value:** Set equal to `createdBy` on creation.
   *
   * @example
   * - "user-650e8400-e29b-41d4-a716-446655440000" (UUID)
   * - "system" (automated update)
   */
  lastUpdatedBy: string;

  /**
   * Total count of modifications made to this entity.
   *
   * @remarks
   * **Versioning:** Increment by 1 on each update operation.
   *
   * **Initial Value:** Set to 0 on creation.
   *
   * **Optimistic Locking:** Can be used to detect concurrent modifications.
   *
   * **Use Cases:**
   * - Audit trail reporting
   * - Version history tracking
   * - Conflict detection in concurrent updates
   */
  numberOfUpdates: number;

  /**
   * User-defined flag marking entity as important or favorite.
   *
   * @remarks
   * **Purpose:** Allows users to star/favorite/prioritize entities.
   *
   * **UI Treatment:** Important entities may appear first in lists or have special styling.
   *
   * **Initial Value:** Typically `false` on creation.
   *
   * **Use Cases:**
   * - Favorite merchants for quick access
   * - Important invoices requiring attention
   * - Pinned items in lists
   */
  isImportant: boolean;

  /**
   * Logical deletion flag preserving data without physical removal.
   *
   * @remarks
   * **Soft Delete Pattern:** Mark as deleted instead of removing from database.
   *
   * **Benefits:**
   * - Preserves audit trails and history
   * - Allows "undo delete" functionality
   * - Maintains foreign key integrity
   * - Supports compliance/legal data retention
   *
   * **Query Pattern:** Filter by `isSoftDeleted = false` in default queries.
   *
   * **Initial Value:** `false` on creation.
   *
   * **Restoration:** Set back to `false` to restore deleted entity.
   *
   * @example
   * ```typescript
   * // Default query excludes soft-deleted
   * const activeInvoices = invoices.filter(i => !i.isSoftDeleted);
   *
   * // Admin view includes soft-deleted
   * const allInvoices = invoices; // No filter
   * ```
   */
  isSoftDeleted: boolean;
}
