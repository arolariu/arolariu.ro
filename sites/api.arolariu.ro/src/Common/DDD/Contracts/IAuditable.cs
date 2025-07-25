namespace arolariu.Backend.Common.DDD.Contracts;

using System;

/// <summary>
/// Defines the contract for entities that require comprehensive audit trail capabilities.
/// This interface ensures consistent tracking of entity lifecycle events, user accountability,
/// and change management across the entire domain model.
/// </summary>
/// <remarks>
/// <para>
/// The IAuditable interface provides essential audit functionality for compliance, debugging,
/// and business intelligence purposes. It establishes a standard contract for:
/// </para>
/// <para>
/// <strong>Temporal Auditing:</strong>
/// - Creation and modification timestamps for change tracking
/// - UTC-based timestamps to ensure consistency across time zones
/// - Immutable creation timestamps to preserve original entity state
/// </para>
/// <para>
/// <strong>User Accountability:</strong>
/// - User identification for all create and update operations
/// - Supports both human users and system processes through Guid identifiers
/// - Enables detailed audit trails for security and compliance requirements
/// </para>
/// <para>
/// <strong>Change Metrics:</strong>
/// - Update counters for frequency analysis and optimization
/// - Soft deletion flags for data preservation and recovery
/// - Business importance markers for prioritization and special handling
/// </para>
/// <para>
/// This interface is typically implemented by <see cref="BaseEntity{T}"/> but can be
/// implemented independently for value objects or other constructs that require auditing.
/// All domain entities should implement this interface to ensure consistent audit capabilities.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// // Example implementation in a custom entity
/// public class CustomEntity : IAuditable
/// {
///     public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
///     public Guid CreatedBy { get; init; }
///     public DateTimeOffset LastUpdatedAt { get; private set; } = DateTimeOffset.UtcNow;
///     public Guid LastUpdatedBy { get; private set; }
///     public int NumberOfUpdates { get; private set; } = 0;
///     public bool IsSoftDeleted { get; private set; } = false;
///     public bool IsImportant { get; set; } = false;
///
///     public void UpdateAuditInfo(Guid updatedBy)
///     {
///         LastUpdatedAt = DateTimeOffset.UtcNow;
///         LastUpdatedBy = updatedBy;
///         NumberOfUpdates++;
///     }
/// }
/// </code>
/// </example>
public interface IAuditable
{
	/// <summary>
	/// Gets the date and time when the entity was originally created.
	/// This timestamp is immutable and represents the initial entity creation moment.
	/// </summary>
	/// <value>
	/// A <see cref="DateTimeOffset"/> representing the UTC creation timestamp.
	/// This value should be set once during entity initialization and never modified.
	/// </value>
	/// <remarks>
	/// <para>
	/// The creation timestamp serves multiple purposes:
	/// - Audit trail compliance for regulatory requirements
	/// - Data lifecycle management and archival policies
	/// - Business analytics and reporting on entity creation patterns
	/// - Debugging and troubleshooting by providing creation context
	/// </para>
	/// <para>
	/// This property uses init-only setter to enforce immutability after object construction.
	/// The timestamp should always be in UTC to ensure consistency across different time zones
	/// and deployment environments.
	/// </para>
	/// </remarks>
	public DateTimeOffset CreatedAt { get; init; }

	/// <summary>
	/// Gets the unique identifier of the user or system that created this entity.
	/// This provides accountability and traceability for entity creation operations.
	/// </summary>
	/// <value>
	/// A <see cref="Guid"/> representing the creator's unique identifier.
	/// For system-generated entities, this may be a special system identifier.
	/// For user-created entities, this should be the authenticated user's identifier.
	/// </value>
	/// <remarks>
	/// <para>
	/// The creator identifier enables:
	/// - User accountability for audit and compliance purposes
	/// - Security investigations and access pattern analysis
	/// - Business intelligence on user productivity and system usage
	/// - Data ownership and permission management
	/// </para>
	/// <para>
	/// This property is immutable after entity creation to maintain audit integrity.
	/// System processes should use consistent, documented identifiers to distinguish
	/// automated actions from user-initiated operations.
	/// </para>
	/// </remarks>
	public Guid CreatedBy { get; init; }

	/// <summary>
	/// Gets the date and time when the entity was last modified.
	/// This timestamp is updated automatically whenever the entity undergoes changes.
	/// </summary>
	/// <value>
	/// A <see cref="DateTimeOffset"/> representing the UTC timestamp of the most recent modification.
	/// Initially set to the creation time and updated with each subsequent change.
	/// </value>
	/// <remarks>
	/// <para>
	/// The last updated timestamp supports:
	/// - Optimistic concurrency control to prevent conflicting updates
	/// - Change frequency analysis for performance optimization
	/// - Data freshness validation for caching and synchronization
	/// - Audit trail completeness verification
	/// </para>
	/// <para>
	/// Implementations should update this timestamp whenever any property of the entity
	/// changes, ensuring accurate change tracking. The timestamp should always be in UTC
	/// for consistency across different environments and time zones.
	/// </para>
	/// </remarks>
	public DateTimeOffset LastUpdatedAt { get; }

	/// <summary>
	/// Gets the unique identifier of the user or system that last modified this entity.
	/// This provides accountability for the most recent changes to the entity.
	/// </summary>
	/// <value>
	/// A <see cref="Guid"/> representing the identifier of the user or system that performed
	/// the most recent update operation. Initially set to the creator's identifier.
	/// </value>
	/// <remarks>
	/// <para>
	/// The last updater identifier facilitates:
	/// - Change attribution for audit and accountability purposes
	/// - Security monitoring and access pattern analysis
	/// - Collaborative editing scenarios and conflict resolution
	/// - Performance analysis of user and system operations
	/// </para>
	/// <para>
	/// This identifier should be updated whenever the entity is modified, regardless of
	/// whether the modification is performed by a user or an automated system process.
	/// Consistent identifier management enables accurate audit trails and security monitoring.
	/// </para>
	/// </remarks>
	public Guid LastUpdatedBy { get; }

	/// <summary>
	/// Gets the total number of update operations performed on this entity since creation.
	/// This counter provides insights into entity change frequency and system usage patterns.
	/// </summary>
	/// <value>
	/// An integer representing the cumulative count of update operations.
	/// Starts at 0 for newly created entities and increments with each modification.
	/// </value>
	/// <remarks>
	/// <para>
	/// The update counter enables:
	/// - Optimistic concurrency control in distributed scenarios
	/// - Performance monitoring and optimization opportunities identification
	/// - Business intelligence on data volatility and usage patterns
	/// - Audit trail verification and completeness checking
	/// </para>
	/// <para>
	/// Implementations should increment this counter for each logical update operation,
	/// not for internal system operations like cache refreshes or metadata updates.
	/// The counter helps distinguish between frequently and rarely modified entities
	/// for optimization and archival purposes.
	/// </para>
	/// </remarks>
	public int NumberOfUpdates { get; }

	/// <summary>
	/// Gets a value indicating whether this entity has been logically deleted.
	/// Soft deletion preserves data for audit purposes while excluding it from normal operations.
	/// </summary>
	/// <value>
	/// <c>true</c> if the entity has been logically deleted; otherwise, <c>false</c>.
	/// Soft-deleted entities should be excluded from normal business queries and operations.
	/// </value>
	/// <remarks>
	/// <para>
	/// Soft deletion provides several advantages over physical deletion:
	/// - Preserves referential integrity in complex domain models
	/// - Maintains complete audit trails for compliance requirements
	/// - Enables data recovery in case of accidental deletion
	/// - Supports business rules requiring historical data preservation
	/// </para>
	/// <para>
	/// Applications should implement query filters to automatically exclude soft-deleted
	/// entities from normal operations while preserving access for audit and recovery scenarios.
	/// The soft deletion state should be considered when implementing business logic
	/// and data access patterns.
	/// </para>
	/// </remarks>
	public bool IsSoftDeleted { get; }

	/// <summary>
	/// Gets or sets a value indicating whether this entity is marked as important for business operations.
	/// This flag enables prioritization, special handling, and enhanced monitoring capabilities.
	/// </summary>
	/// <value>
	/// <c>true</c> if the entity is marked as important; otherwise, <c>false</c>.
	/// The specific meaning of "important" is defined by the business domain context.
	/// </value>
	/// <remarks>
	/// <para>
	/// The importance flag supports various business scenarios:
	/// - Prioritization in processing queues and batch operations
	/// - Enhanced monitoring and alerting for critical entities
	/// - Special backup and disaster recovery procedures
	/// - Performance optimization for high-priority data
	/// </para>
	/// <para>
	/// The interpretation of this flag depends on the specific business domain:
	/// - In e-commerce: VIP customers or high-value products
	/// - In healthcare: Critical patient records or urgent cases
	/// - In finance: High-value transactions or regulatory submissions
	/// - In logistics: Priority shipments or time-sensitive deliveries
	/// </para>
	/// <para>
	/// This property has a public setter to allow business rules to dynamically
	/// adjust entity importance based on changing conditions or business requirements.
	/// </para>
	/// </remarks>
	public bool IsImportant { get; set; }
}
