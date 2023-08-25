using Microsoft.Azure.Cosmos;

using System;
using System.Collections.Concurrent;

namespace arolariu.Backend.Core.Domain.General.Services.Database;

/// <summary>
/// The NoSQL Db Connection Factory class.
/// This factory is specific to the NoSQL database.
/// This factory is used to create and release connections to the NoSQL database.
/// The connections are stored in a connection pool.
/// The connection pool is a <see cref="ConcurrentBag{T}"/> of <see cref="CosmosClient"/> instances.
/// </summary>
public class NoSqlDbConnectionFactory : IDbConnectionFactory<CosmosClient>
{
    private readonly string _connectionString;
    private readonly ConcurrentBag<CosmosClient> _connectionPool = new();

    /// <summary>
    /// Constructor.
    /// This constructor initializes the connection string.
    /// The constructor is DI-friendly and can be used with the <seealso cref="Microsoft.Extensions.DependencyInjection"/> framework.
    /// </summary>
    /// <param name="connectionString">The connection string for the NoSQL database.</param>
    /// <exception cref="ArgumentNullException">Thrown when the <paramref name="connectionString"/> is null.</exception>
    public NoSqlDbConnectionFactory(string connectionString)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
    }

    /// <inheritdoc/>
    public CosmosClient CreateConnection()
    {
        if (_connectionPool.TryTake(out var connection))
        {
            return connection;
        }
        return new CosmosClient(_connectionString);
    }

    /// <inheritdoc/>
    public void ReleaseConnection(CosmosClient connection)
    {
        _connectionPool.Add(connection);
    }
}