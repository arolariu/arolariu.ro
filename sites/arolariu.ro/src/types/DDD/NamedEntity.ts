/** @format */

import BaseEntity from "./BaseEntity";

/**
 * Represents a named entity from the Domain-Driven Design concepts.
 */
export default interface NamedEntity<T> extends BaseEntity<T> {
  name: string;
  description: string;
}
