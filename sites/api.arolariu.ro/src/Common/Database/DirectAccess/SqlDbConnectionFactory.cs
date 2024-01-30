using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

using System;
using System.Collections.Concurrent;
using System.Data;

namespace arolariu.Backend.Common.Database.DirectAccess;

/// <summary>
/// The database connection factory.
/// This factory is specific to the SQL database.
/// This factory is used to create and release connections to the SQL database.
/// The connections are stored in a connection pool.
/// The connection pool is a <see cref="ConcurrentBag{T}"/> of <see cref="SqlConnection"/> instances.
/// </summary>
public class SqlDbConnectionFactory : IDbConnectionFactory<IDbConnection>
{
    private readonly SqlConnectionStringBuilder _sqlConnectionStringBuilder;
    private readonly ConcurrentBag<SqlConnection> _connectionPool = new();

    /// <summary>
    /// DbConnectionFactory constructor.
    /// </summary>
    /// <param name="configuration">The configuration object.</param>
    public SqlDbConnectionFactory(IConfiguration configuration)
    {
        if (configuration is not null)
        {
            var connectionString = configuration["Azure:SQL-DB:ConnectionString"]
                ?? throw new ArgumentNullException(nameof(configuration));

            _sqlConnectionStringBuilder = new SqlConnectionStringBuilder(connectionString);
        }
        else throw new ArgumentNullException(nameof(configuration));
    }

    /// <inheritdoc/>
    public IDbConnection CreateConnection()
    {
        if (_connectionPool.TryTake(out var connection))
        {
            if (connection.State == ConnectionState.Closed)
            {
                connection.Open();
            }
            return connection;
        }

        var newConnection = new SqlConnection(_sqlConnectionStringBuilder.ConnectionString);
        newConnection.Open();
        return newConnection;
    }

    /// <inheritdoc/>
    public void ReleaseConnection(IDbConnection connection)
    {
        if (connection is SqlConnection sqlConnection)
        {
            if (sqlConnection.State == ConnectionState.Open)
            {
                _connectionPool.Add(sqlConnection);
            }
            else
            {
                sqlConnection.Dispose();
            }
        }
        else
        {
            connection?.Dispose();
        }
    }
}