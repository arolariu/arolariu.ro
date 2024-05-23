/** @format */

/**
 * Represents a base entity from the Domain-Driven Design concepts.
 */
export default interface BaseEntity<T> {
  id: T;
  createdAt: Date;
  createdBy: string;
  lastUpdatedAt: Date;
  lastUpdatedBy: string;
  numberOfUpdates: number;
  isImportant: boolean;
  isSoftDeleted: boolean;
}
