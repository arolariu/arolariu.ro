using Microsoft.Azure.Cosmos;

using System.Data;

namespace arolariu.Backend.Core.Domain.General.Services.Database;

/// <summary>
/// Interface that handles the database connection.
/// This interface is used by the <see cref="SqlDbConnectionFactory"/> and <see cref="NoSqlDbConnectionFactory"/> classes.
/// </summary>
/// <typeparam name="T">The type of database connection, which can be <see cref="IDbConnection"/> or <see cref="CosmosClient"/>.</typeparam>
public interface IDbConnectionFactory<T> where T : class
{
    /// <summary>
    /// Gets the database connection.
    /// </summary>
    /// <returns>The <typeparamref name="T"/> database connection.</returns>
    public T CreateConnection();

    /// <summary>
    /// Releases the database connection.
    /// </summary>
    /// <param name="connection">The <typeparamref name="T"/> database connection to release.</param>
    public void ReleaseConnection(T connection);
}
