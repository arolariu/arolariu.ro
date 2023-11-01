using arolariu.Backend.Core.DAL.Database;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using Microsoft.Azure.Cosmos;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Net;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers.InvoiceSqlBroker;

/// <summary>
/// The Invoice NoSQL broker class represents the invoice NoSQL broker.
/// This class is used to interact with the database.
/// The broker is used to perform CRUD operations on the database.
/// </summary>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
public class InvoiceNoSqlBroker : IInvoiceNoSqlBroker
{
    private readonly Container invoiceContainer;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="dbConnectionFactory"></param>
    public InvoiceNoSqlBroker(IDbConnectionFactory<CosmosClient> dbConnectionFactory)
    {
        ArgumentNullException.ThrowIfNull(dbConnectionFactory);
        var cosmosClient = dbConnectionFactory.CreateConnection();
        invoiceContainer = cosmosClient.GetContainer("arolariu", "invoices");
    }

    /// <inheritdoc/>
    public async ValueTask CreateInvoiceAsync(CreateInvoiceDto invoiceDto)
    {
        Console.WriteLine(invoiceDto);
        var invoice = Invoice.CreateNullInvoice(); // TODO: map the invoice dto to the invoice entity.

        var transactionResponse = await invoiceContainer
            .CreateItemAsync(invoice)
            .ConfigureAwait(false);

        ValidateTransactionResponseStatusCodeWas(transactionResponse, HttpStatusCode.Created);
    }

    /// <inheritdoc/>
    public async ValueTask<Invoice> DeleteInvoiceAsync(Guid invoiceIdentifier)
    {
        var invoiceIdentifierAsString = invoiceIdentifier.ToString();

        var deletedInvoice = await ReadInvoiceAsync(invoiceIdentifier)
            .ConfigureAwait(false);

        var transactionResponse = await invoiceContainer
            .DeleteItemAsync<Invoice>(
                invoiceIdentifierAsString,
                new(Guid.Empty.ToString()))
            .ConfigureAwait(false);
        //TODO: this needs to have as the partition key the user identifier.

        ValidateTransactionResponseStatusCodeWas(transactionResponse, HttpStatusCode.NoContent);
        return deletedInvoice;
    }

    /// <inheritdoc/>
    public async ValueTask<Invoice> ReadInvoiceAsync(Guid invoiceIdentifier)
    {
        var invoiceIdentifierAsString = invoiceIdentifier.ToString();
        var transactionResponse = await invoiceContainer
            .ReadItemAsync<Invoice>(
               invoiceIdentifierAsString,
                new(Guid.Empty.ToString()))
           .ConfigureAwait(false);
        //TODO: this needs to have as the partition key the user identifier.

        ValidateTransactionResponseStatusCodeWas(transactionResponse, HttpStatusCode.OK);
        var invoice = transactionResponse.Resource;
        return invoice;
    }

    /// <inheritdoc/>
    public async ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync()
    {
        var invoices = new List<Invoice>();
        var query = new QueryDefinition("SELECT * FROM invoices");
        using var iterator = invoiceContainer.GetItemQueryIterator<Invoice>(query);

        while (iterator.HasMoreResults)
        {
            var response = await iterator.
                ReadNextAsync()
                .ConfigureAwait(false);

            var invoiceEnumerable = response.Resource;
            invoices.AddRange(invoiceEnumerable);
        }

        return invoices;
    }

    /// <inheritdoc/>
    public async ValueTask<Invoice> UpdateInvoiceAsync(Invoice invoice)
    {
        var transactionResponse = await invoiceContainer
            .UpsertItemAsync(invoice)
            .ConfigureAwait(false);

        ValidateTransactionResponseStatusCodeWas(transactionResponse, HttpStatusCode.OK);
        var updatedInvoice = transactionResponse.Resource;
        return updatedInvoice;
    }

    private static void ValidateTransactionResponseStatusCodeWas(
        ItemResponse<Invoice> transactionResponse,
        HttpStatusCode statusCode)
    {
        if (transactionResponse.StatusCode != statusCode)
        {
            throw new CosmosException(
                transactionResponse.ToString(),
                transactionResponse.StatusCode,
                0,
                transactionResponse.ActivityId,
                transactionResponse.RequestCharge);
        }
    }
}
