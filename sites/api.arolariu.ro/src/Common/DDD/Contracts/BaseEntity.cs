namespace arolariu.Backend.Common.DDD.Contracts;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

/// <summary>
/// Provides a foundational abstract base class for all domain entities in the system.
/// This class implements common entity characteristics including identity, auditing, and soft deletion capabilities.
/// </summary>
/// <typeparam name="T">
/// The type of the entity's primary key. Common types include <see cref="Guid"/>, <see cref="int"/>, and <see cref="string"/>.
/// The type must be compatible with the underlying data store's identifier requirements.
/// </typeparam>
/// <remarks>
/// <para>
/// This base entity follows Domain-Driven Design (DDD) principles and provides essential entity infrastructure:
/// </para>
/// <para>
/// <strong>Identity Management:</strong>
/// - Generic primary key support for different identifier types
/// - Immutable identity once set (init-only property)
/// - JSON serialization order control for consistent API responses
/// </para>
/// <para>
/// <strong>Audit Trail:</strong>
/// - Automatic creation and modification tracking
/// - User identification for all changes
/// - Update counter for optimistic concurrency scenarios
/// </para>
/// <para>
/// <strong>Soft Deletion:</strong>
/// - Logical deletion support to preserve data integrity
/// - Prevents accidental data loss while maintaining referential integrity
/// - Allows for data recovery and audit trail preservation
/// </para>
/// <para>
/// <strong>Data Store Compatibility:</strong>
/// - Optimized for Azure Cosmos DB with specific naming conventions
/// - JSON serialization attributes for consistent API representation
/// - Property ordering ensures predictable serialization output
/// </para>
/// <para>
/// All entities in the system should inherit from this base class to ensure consistent
/// behavior across the entire domain model and maintain audit requirements.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// // Example entity implementation
/// public class Product : BaseEntity&lt;Guid&gt;
/// {
///     public override required Guid id { get; init; } = Guid.NewGuid();
///     public string Name { get; set; } = string.Empty;
///     public decimal Price { get; set; }
/// }
///
/// // Usage with audit tracking
/// var product = new Product
/// {
///     Name = "Sample Product",
///     Price = 29.99m,
///     CreatedBy = userId
/// };
/// </code>
/// </example>
public abstract class BaseEntity<T> : IAuditable
{
  /// <summary>
  /// Gets or initializes the unique identifier for this entity.
  /// This property serves as the primary key and must be unique within the entity's context.
  /// </summary>
  /// <value>
  /// The entity's unique identifier of type <typeparamref name="T"/>.
  /// Can be null for new entities that haven't been persisted yet.
  /// Once set, the identifier is immutable to maintain entity identity integrity.
  /// </value>
  /// <remarks>
  /// <para>
  /// The identifier property follows specific conventions:
  /// - Uses lowercase 'id' for Cosmos DB compatibility requirements
  /// - Marked as virtual to allow derived classes to override with specific initialization logic
  /// - Ordered first in JSON serialization for consistent API responses
  /// - Suppresses naming style warnings due to data store constraints
  /// </para>
  /// <para>
  /// Common identifier types:
  /// - <see cref="Guid"/>: Recommended for distributed systems and global uniqueness
  /// - <see cref="int"/>: Suitable for sequential, auto-incrementing scenarios
  /// - <see cref="string"/>: Used for natural keys or external system identifiers
  /// </para>
  /// </remarks>
  [JsonPropertyOrder(0)]
  [SuppressMessage("Style", "IDE1006:Naming Styles", Justification = "Cosmos DB requires lowercase 'id' property name for document identification.")]
  public virtual T? id { get; init; } = default;

  /// <inheritdoc/>
  /// <remarks>
  /// Automatically set to the current UTC time when the entity is created.
  /// This timestamp is immutable after entity creation to maintain audit integrity.
  /// Ordered near the end of JSON serialization to separate business data from metadata.
  /// </remarks>
  [JsonPropertyOrder(byte.MaxValue - 10)]
  public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;

  /// <inheritdoc/>
  /// <remarks>
  /// Should be set to the identifier of the user or system creating this entity.
  /// This value is immutable after entity creation for audit trail preservation.
  /// </remarks>
  [JsonPropertyOrder(byte.MaxValue - 09)]
  public Guid CreatedBy { get; init; }

  /// <inheritdoc/>
  /// <remarks>
  /// Automatically updated whenever the entity is modified through the application.
  /// This timestamp should be updated by the business logic layer before persistence.
  /// Used for optimistic concurrency control and change tracking.
  /// </remarks>
  [JsonPropertyOrder(byte.MaxValue - 08)]
  public DateTimeOffset LastUpdatedAt { get; protected set; } = DateTimeOffset.UtcNow;

  /// <inheritdoc/>
  /// <remarks>
  /// Should be updated to reflect the identifier of the user or system making changes.
  /// Protected setter ensures updates are controlled through business logic methods.
  /// </remarks>
  [JsonPropertyOrder(byte.MaxValue - 07)]
  public Guid LastUpdatedBy { get; protected set; }

  /// <inheritdoc/>
  /// <remarks>
  /// Incremented each time the entity is modified, useful for:
  /// - Optimistic concurrency control
  /// - Change frequency analysis
  /// - Audit trail completeness verification
  /// Public setter allows external systems to manage this counter if needed.
  /// </remarks>
  [JsonPropertyOrder(byte.MaxValue - 06)]
  public int NumberOfUpdates { get; set; } = 0;

  /// <inheritdoc/>
  /// <remarks>
  /// Business-level flag to mark entities that require special attention or handling.
  /// Can be used for prioritization, special processing rules, or enhanced monitoring.
  /// The specific meaning of "important" is defined by the business domain context.
  /// </remarks>
  [JsonPropertyOrder(byte.MaxValue - 05)]
  public bool IsImportant { get; set; } = false;

  /// <inheritdoc/>
  /// <remarks>
  /// Indicates whether this entity has been logically deleted without physical removal.
  /// Protected setter ensures soft deletion is controlled through the SoftDelete method.
  /// Soft-deleted entities should be filtered out of normal business operations.
  /// </remarks>
  [JsonPropertyOrder(byte.MaxValue - 04)]
  public bool IsSoftDeleted { get; protected set; } = false;

  /// <summary>
  /// Marks this entity as logically deleted without removing it from the data store.
  /// This method preserves the entity for audit purposes while excluding it from normal operations.
  /// </summary>
  /// <remarks>
  /// <para>
  /// Soft deletion provides several benefits:
  /// - Maintains referential integrity by keeping referenced entities
  /// - Preserves complete audit trails for compliance and analysis
  /// - Allows for data recovery in case of accidental deletion
  /// - Supports business rules that require historical data preservation
  /// </para>
  /// <para>
  /// After calling this method:
  /// - The entity should be excluded from normal business queries
  /// - Related entities may need to handle the soft-deleted state
  /// - The entity remains accessible for audit and recovery purposes
  /// - Consider updating LastUpdatedAt and LastUpdatedBy in derived implementations
  /// </para>
  /// <para>
  /// This method is marked as virtual to allow derived classes to implement
  /// additional soft deletion logic, such as cascading soft deletes or
  /// business-specific cleanup operations.
  /// </para>
  /// </remarks>
  /// <example>
  /// <code>
  /// // Soft delete an entity
  /// entity.SoftDelete();
  ///
  /// // Verify deletion status
  /// if (entity.IsSoftDeleted)
  /// {
  ///     // Handle soft-deleted entity
  ///     logger.LogInformation("Entity {Id} has been soft deleted", entity.id);
  /// }
  /// </code>
  /// </example>
  public virtual void SoftDelete() => IsSoftDeleted = true;
}
