using Microsoft.Azure.Cosmos;

using System.Data;

namespace arolariu.Backend.Common.Database.DirectAccess;

/// <summary>
/// Interface that handles the database connection.
/// Since we are currently using both a NoSQL and a SQL connection, this connection factory class is generic - thus able to create connections for both SQL and NoSQL databases.
/// This interface is used by the <see cref="SqlDbConnectionFactory"/> and <see cref="NoSqlDbConnectionFactory"/> classes.
/// </summary>
/// <typeparam name="T">The type of database connection, which can be <see cref="IDbConnection"/> or <see cref="CosmosClient"/>.</typeparam>
public interface IDbConnectionFactory<T> where T : class
{
    /// <summary>
    /// Gets the database connection.
    /// This database connection is used to interact with the database.
    /// The database connection can be either a SQL connection or a NoSQL connection.
    /// </summary>
    /// <returns>The <typeparamref name="T"/> database connection.</returns>
    public T CreateConnection();

    /// <summary>
    /// Releases the database connection.
    /// This method will be called after the database connection is no longer needed.
    /// The released database connection can be either a SQL connection or a NoSQL connection.
    /// </summary>
    /// <param name="connection">The <typeparamref name="T"/> database connection to release.</param>
    public void ReleaseConnection(T connection);
}
