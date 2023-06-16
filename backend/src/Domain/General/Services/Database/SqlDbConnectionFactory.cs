using System.Collections.Concurrent;
using System.Data;
using System.Data.SqlClient;

namespace arolariu.Backend.Domain.General.Services.Database;

/// <summary>
/// The database connection factory.
/// This factory is used to create and release connections to the SQL database.
/// </summary>
public class SqlDbConnectionFactory : IDbConnectionFactory<IDbConnection>
{
    private readonly SqlConnectionStringBuilder _sqlConnectionStringBuilder;
    private readonly ConcurrentBag<SqlConnection> _connectionPool = new();

    /// <summary>
    /// DbConnectionFactory constructor.
    /// </summary>
    /// <param name="connectionString">The connection string for the SQL database.</param>
    public SqlDbConnectionFactory(string connectionString)
    {
        _sqlConnectionStringBuilder = new SqlConnectionStringBuilder(connectionString);
    }

    /// <inheritdoc/>
    /// <returns>An <see cref="IDbConnection"/> instance representing the connection to the SQL database.</returns>
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
    /// <param name="connection">The <see cref="IDbConnection"/> connection to release.</param>
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
            connection.Dispose();
        }
    }
}

