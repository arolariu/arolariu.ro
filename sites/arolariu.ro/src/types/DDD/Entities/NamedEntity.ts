import type {BaseEntity} from "./";

/**
 * Describes an entity with a human-readable name and description in addition to the base entity properties.
 * @typeParam T - Type of the unique identifier inherited from the base entity.
 */
export interface NamedEntity<T> extends BaseEntity<T> {
  /** The human-readable name of the entity. */
  name: string;

  /** The human-readable description of the entity. */
  description: string;
}
