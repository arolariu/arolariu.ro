using Microsoft.Azure.Cosmos;
using System.Collections.Concurrent;
using System.Data;

namespace ContainerBackend.Domain.General.Services.Database
{
    /// <summary>
    /// The NoSQL Db Connection Factory class.
    /// </summary>
    public class NoSqlDbConnectionFactory : IDbConnectionFactory<CosmosClient>
    {
        private readonly string _connectionString;
        private readonly ConcurrentBag<CosmosClient> _connectionPool;


        /// <summary>
        /// Constructor.
        /// </summary>
        /// <param name="connectionString"></param>
        public NoSqlDbConnectionFactory(string connectionString)
        {
            _connectionString = connectionString;
            _connectionPool = new ConcurrentBag<CosmosClient>();
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
}
