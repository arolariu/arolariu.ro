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
