import type {IAuditable} from "./";

/**
 * Represents a base entity from the Domain-Driven Design concepts.
 */
export interface BaseEntity<T> extends IAuditable {
  /** The unique identifier for the entity, generally a GUID. */
  id: T;
}
