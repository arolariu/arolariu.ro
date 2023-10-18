using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;

using System.Collections.Concurrent;

namespace arolariu.Backend.Core.DAL.Database;

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
    /// <param name="configuration">The configuration object.</param>
    /// <exception cref="ArgumentNullException">Thrown when the <paramref name="configuration"/> is null.</exception>
    public NoSqlDbConnectionFactory(IConfiguration configuration)
    {
        var connectionString = configuration["Azure:NoSQL-DB:ConnectionString"]
            ?? throw new ArgumentNullException(nameof(configuration));

        _connectionString ??= connectionString;
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