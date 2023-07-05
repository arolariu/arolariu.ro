using Microsoft.Azure.Cosmos;

using System;
using System.Collections.Concurrent;

namespace arolariu.Backend.Core.Domain.General.Services.Database;

/// <summary>
/// The NoSQL Db Connection Factory class.
/// This factory is used to create and release connections to the NoSQL database.
/// </summary>
public class NoSqlDbConnectionFactory : IDbConnectionFactory<CosmosClient>
{
    private readonly string _connectionString;
    private readonly ConcurrentBag<CosmosClient> _connectionPool = new();

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="connectionString">The connection string for the NoSQL database.</param>
    /// <exception cref="ArgumentNullException">Thrown when the <paramref name="connectionString"/> is null.</exception>
    public NoSqlDbConnectionFactory(string connectionString)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
    }

    /// <inheritdoc/>
    /// <returns>A <see cref="CosmosClient"/> instance representing the connection to the NoSQL database.</returns>
    public CosmosClient CreateConnection()
    {
        if (_connectionPool.TryTake(out var connection))
        {
            return connection;
        }
        return new CosmosClient(_connectionString);
    }

    /// <inheritdoc/>
    /// <param name="connection">The <see cref="CosmosClient"/> connection to release.</param>
    public void ReleaseConnection(CosmosClient connection)
    {
        _connectionPool.Add(connection);
    }
}

