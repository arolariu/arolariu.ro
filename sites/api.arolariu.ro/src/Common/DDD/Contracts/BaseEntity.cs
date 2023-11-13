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
    public T Id { get; init; }

    /// <inheritdoc/>
    [JsonPropertyOrder(995)]
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;

    /// <inheritdoc/>
    [JsonPropertyOrder(996)]
    public Guid CreatedBy { get; init; }

    /// <inheritdoc/>
    [JsonPropertyOrder(997)]
    public DateTimeOffset LastUpdatedAt { get; protected set; } = DateTimeOffset.UtcNow;

    /// <inheritdoc/>
    [JsonPropertyOrder(998)]
    public Guid LastUpdatedBy { get; protected set; }

    /// <inheritdoc/>
    [JsonPropertyOrder(999)]
    public int NumberOfUpdates { get; protected set; } = 0;

    /// <inheritdoc/>
    [JsonPropertyOrder(1000)]
    public bool IsSoftDeleted { get; protected set; } = false;
}
