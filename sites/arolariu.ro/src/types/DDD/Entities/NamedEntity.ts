/** @format */

import type {BaseEntity} from "./";

/**
 * Represents a named entity from the Domain-Driven Design concepts.
 */
export interface NamedEntity<T> extends BaseEntity<T> {
  name: string;
  description: string;
}
