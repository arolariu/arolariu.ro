using Dapper;

using System.Data;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Repos;

/// <summary>
/// The Invoices repository.
/// This repository contains all the methods to interact with the Invoices table in the database.
/// </summary>
public class InvoiceRepository
{
    private readonly IDbConnection _dbConnection;

    /// <summary>
    /// The main repository' constructor.
    /// </summary>
    /// <param name="dbConnection"></param>
    public InvoiceRepository(IDbConnection dbConnection)
    {
        _dbConnection = dbConnection;
    }

    /// <summary>
    /// Insert invoice into the database.
    /// </summary>
    /// <param name="blob"></param>
    /// <returns></returns>
    public async Task<int> InsertInvoice(byte[] blob)
    {
        var sql = "INSERT INTO Invoices (InvoiceBlob) VALUES (@InvoiceBlob); SELECT LAST_INSERT_ID();";
        var id = await _dbConnection.ExecuteScalarAsync<int>(sql, new { InvoiceBlob = blob });
        return id;
    }
}
