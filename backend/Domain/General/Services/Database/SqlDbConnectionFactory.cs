using System.Collections.Concurrent;
using System.Data;
using System.Data.SqlClient;

namespace arolariu.Backend.Domain.General.Services.Database
{
    /// <summary>
    /// The database connection factory.
    /// </summary>
    public class SqlDbConnectionFactory : IDbConnectionFactory<IDbConnection>
    {
        private readonly SqlConnectionStringBuilder _sqlConnectionStringBuilder;
        private readonly ConcurrentBag<SqlConnection> _connectionPool;

        /// <summary>
        /// DbConnectionFactory constructor.
        /// </summary>
        /// <param name="connectionString"></param>
        public SqlDbConnectionFactory(string connectionString)
        {
            _sqlConnectionStringBuilder = new SqlConnectionStringBuilder(connectionString);
            _connectionPool = new ConcurrentBag<SqlConnection>();
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
                connection.Dispose();
            }
        }

    }
}
