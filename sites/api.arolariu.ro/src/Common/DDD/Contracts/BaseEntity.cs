using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace arolariu.Backend.Common.DDD.Contracts;

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
    public T? Id { get; init; }

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
    public int NumberOfUpdates { get; protected set; }

    /// <inheritdoc/>
    [JsonPropertyOrder(byte.MaxValue - 05)]
    public bool IsImportant { get; set; }

    /// <inheritdoc/>
    [JsonPropertyOrder(byte.MaxValue - 04)]
    public bool IsSoftDeleted { get; protected set; }

    /// <inheritdoc/>
    [JsonPropertyOrder(byte.MaxValue - 03)]
    public IReadOnlyDictionary<string, object> IndividualUpdates { get; protected set; } = new Dictionary<string, object>();
}
