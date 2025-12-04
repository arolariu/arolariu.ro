/**
 * @fileoverview Shared Kernel value objects used across bounded contexts.
 * @module types/DDD/SharedKernel
 *
 * @remarks
 * **Shared Kernel Concept:** Types shared across multiple bounded contexts in DDD.
 *
 * **Current Exports:**
 * - **Currency**: Value object for monetary currency representation
 *
 * **Value Object Characteristics:**
 * - Immutable structures
 * - Equality by value, not identity
 * - No lifecycle management
 * - Shared definitions across domains
 *
 * @see {@link Currency}
 */

export type {Currency} from "./Currency";
