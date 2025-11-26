/**
 * @fileoverview Domain-Driven Design (DDD) type definitions and building blocks.
 * @module types/DDD
 *
 * @remarks
 * Provides TypeScript type definitions aligned with DDD tactical patterns:
 *
 * **Entities:**
 * - `BaseEntity<T>`: Base entity with identity and audit metadata
 * - `NamedEntity<T>`: Entity with human-readable name and description
 * - `IAuditable`: Audit trail contract for creation, modification, and lifecycle tracking
 *
 * **Shared Kernel:**
 * - `Currency`: Value object for monetary currency representation
 *
 * **Design Principles:**
 * - Strong typing with generic identifiers
 * - Consistent audit metadata across all entities
 * - Immutable identity (ID should not change after creation)
 * - Soft delete support for data retention compliance
 *
 * @see {@link https://martinfowler.com/bliki/DomainDrivenDesign.html|DDD Overview}
 */

export type {BaseEntity, IAuditable, NamedEntity} from "./Entities/index.ts";
export type {Currency} from "./SharedKernel/index.ts";
