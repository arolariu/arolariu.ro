/**
 * @fileoverview DDD entity type definitions barrel export.
 * @module types/DDD/Entities
 *
 * @remarks
 * Exports core entity interfaces for Domain-Driven Design patterns:
 *
 * - **IAuditable**: Audit metadata contract (creation, modification, lifecycle)
 * - **BaseEntity<T>**: Entity with identity and audit metadata
 * - **NamedEntity<T>**: Entity with name, description, and audit metadata
 *
 * **Hierarchy:**
 * ```
 * IAuditable (audit metadata)
 *   └─ BaseEntity<T> (adds id)
 *       └─ NamedEntity<T> (adds name, description)
 * ```
 *
 * @see {@link BaseEntity}
 * @see {@link NamedEntity}
 * @see {@link IAuditable}
 */

export type {BaseEntity} from "./BaseEntity";
export type {IAuditable} from "./IAuditable";
export type {NamedEntity} from "./NamedEntity";
