namespace arolariu.Backend.Common.DDD.Contracts;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

/// <summary>
/// The base entity abstract base class.
/// </summary>
/// <typeparam name="T"></typeparam>
public abstract class BaseEntity<T> : IAuditable
{
	/// <summary>
	/// The identity of the entity.
	/// </summary>
	[JsonPropertyOrder(0)]
	[SuppressMessage("Style", "IDE1006:Naming Styles", Justification = "Cosmos DB limitation.")]
	public virtual T? id { get; init; } = default(T?);

	/// <inheritdoc/>
	[JsonPropertyOrder(byte.MaxValue - 10)]
	public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;

	/// <inheritdoc/>
	[JsonPropertyOrder(byte.MaxValue - 09)]
	public Guid CreatedBy { get; init; }

	/// <inheritdoc/>
	[JsonPropertyOrder(byte.MaxValue - 08)]
	public DateTimeOffset LastUpdatedAt { get; protected set; } = DateTimeOffset.UtcNow;

	/// <inheritdoc/>
	[JsonPropertyOrder(byte.MaxValue - 07)]
	public Guid LastUpdatedBy { get; protected set; }

	/// <inheritdoc/>
	[JsonPropertyOrder(byte.MaxValue - 06)]
	public int NumberOfUpdates { get; set; } = 0;

	/// <inheritdoc/>
	[JsonPropertyOrder(byte.MaxValue - 05)]
	public bool IsImportant { get; set; } = false;

	/// <inheritdoc/>
	[JsonPropertyOrder(byte.MaxValue - 04)]
	public bool IsSoftDeleted { get; protected set; } = false;

	/// <summary>
	/// Soft delete the entity.
	/// </summary>
	public virtual void SoftDelete() => IsSoftDeleted = true;
}
