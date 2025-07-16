namespace arolariu.Backend.Common.DDD.Contracts;

using System;

/// <summary>
/// Interface for the audit information.
/// </summary>
public interface IAuditable
{
	/// <summary>
	/// The date and time when the entity was created.
	/// </summary>
	public DateTimeOffset CreatedAt { get; init; }

	/// <summary>
	/// The user (user identifier) who last updated the entity.
	/// </summary>
	public Guid CreatedBy { get; init; }

	/// <summary>
	/// The date and time when the entity was last updated.
	/// </summary>
	public DateTimeOffset LastUpdatedAt { get; }

	/// <summary>
	/// The user (user identifier) who last updated the entity.
	/// </summary>
	public Guid LastUpdatedBy { get; }

	/// <summary>
	/// The number of times the entity has been updated.
	/// </summary>
	public int NumberOfUpdates { get; }

	/// <summary>
	/// Is the entity soft deleted?
	/// </summary>
	public bool IsSoftDeleted { get; }

	/// <summary>
	/// Is the entity important to the user / system?
	/// </summary>
	public bool IsImportant { get; set; }
}
