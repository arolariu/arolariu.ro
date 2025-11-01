/**
 * Provides a consistent audit metadata contract for domain entities, ensuring creation,
 * modification, and lifecycle details are captured for traceability and compliance.
 * @remarks
 * Implement this interface on domain entities that require audit trails. It tracks the
 * creator, the most recent modifier, update counts, and state flags commonly used in
 * enterprise auditing scenarios.
 */
export interface IAuditable {
  /** The date and time when the entity was created. */
  createdAt: Date;

  /** The identifier of the user who created the entity. */
  createdBy: string;

  /** The date and time when the entity was last updated. */
  lastUpdatedAt: Date;

  /** The identifier of the user who last updated the entity. */
  lastUpdatedBy: string;

  /** The total number of updates made to the entity. */
  numberOfUpdates: number;

  /** Indicates whether the entity is marked as important. */
  isImportant: boolean;

  /** Indicates whether the entity has been soft deleted. */
  isSoftDeleted: boolean;
}
