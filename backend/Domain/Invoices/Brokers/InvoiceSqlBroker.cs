using arolariu.Backend.Domain.General.Services.Database;
using arolariu.Backend.Domain.Invoices.Models;
using Dapper;
using System;
using System.Data;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers
{
    /// <summary>
    /// The invoice SQL broker.
    /// </summary>
    public class InvoiceSqlBroker : IInvoiceSqlBroker
    {
        /// <inheritdoc/>
        public IDbConnection DbConnection { get; }

        /// <summary>
        /// Constructor.
        /// </summary>
        /// <param name="dbConnectionFactory"></param>
        public InvoiceSqlBroker(IDbConnectionFactory<IDbConnection> dbConnectionFactory)
        {
            DbConnection = dbConnectionFactory.CreateConnection();
        }

        /// <inheritdoc/>
        public async Task<Invoice> ReadInvoiceAsync(Guid invoiceIdentifier)
        {
            using (DbConnection)
            {
                return await DbConnection.QueryFirstOrDefaultAsync<Invoice>(
                                "SELECT * FROM Invoices WHERE InvoiceIdentifier = @InvoiceIdentifier",
                                new { InvoiceIdentifier = invoiceIdentifier });
            }
        }

        /// <inheritdoc/>
        public async Task<int> CreateInvoiceAsync(Invoice invoice)
        {
            using (DbConnection)
            {
                var sql = @$"INSERT INTO BonFiscal VALUES (@Value1, @Value2)";
                return await DbConnection.ExecuteAsync(sql, new { Value1 = invoice.InvoiceId.ToString(), Value2 = invoice.InvoiceImageBlobUri.ToString() });
            }
        }
    }
}
