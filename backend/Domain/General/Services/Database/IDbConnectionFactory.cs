using Microsoft.Azure.Cosmos;
using System.Data;

namespace arolariu.Backend.Domain.General.Services.Database
{
    /// <summary>
    /// Interface that handles the database connection.
    /// </summary>
    public interface IDbConnectionFactory<T> where T : class
    {
        /// <summary>
        /// The method that gets the database connection.
        /// </summary>
        /// <returns>
        /// <see cref="IDbConnection"/> SQL database connection.
        /// <see cref="CosmosClient"/> NoSQL database connection.
        /// </returns>
        public T CreateConnection();

        /// <summary>
        /// Release the database connection.
        /// </summary>
        /// <param name="connection"></param>
        public void ReleaseConnection(T connection);
    }
}