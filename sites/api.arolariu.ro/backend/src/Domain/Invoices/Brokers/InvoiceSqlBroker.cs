using arolariu.Backend.Core.Domain.General.Services.Database;
using arolariu.Backend.Core.Domain.Invoices.Models;

using Dapper;

using Newtonsoft.Json;

using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Brokers;

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
    /// <param name="dbConnectionFactory">The database connection factory used to create the database connection.</param>
    public InvoiceSqlBroker(IDbConnectionFactory<IDbConnection> dbConnectionFactory)
    {
        DbConnection = dbConnectionFactory.CreateConnection();
    }

    /// <inheritdoc/>
    public async ValueTask<IEnumerable<Invoice>> RetrieveAllInvoices()
    {
        const string procedureName = "RetrieveAllInvoicesProcedure";
        var parameters = new DynamicParameters();
        var result = await DbConnection.QueryAsync<DatabaseInvoice>(procedureName, parameters, commandType: CommandType.StoredProcedure);

        var invoices = result.Select(InvoiceMapper.MapDbInvoiceToDomainInvoice);
        return invoices;
    }

    /// <inheritdoc/>
    public async ValueTask<bool> InsertNewInvoice(Invoice invoice)
    {
        const string procedureName = "InsertNewInvoiceProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoice.InvoiceId);
        parameters.Add("InvoicePhotoURI", invoice.InvoiceImageURI.ToString());
        await DbConnection.ExecuteAsync(procedureName, parameters, commandType: CommandType.StoredProcedure);
        return true;
    }

    /// <inheritdoc/>
    public async ValueTask<Invoice> RetrieveSpecificInvoice(Guid invoiceIdentifier)
    {
        const string procedureName = "RetrieveSpecificInvoiceProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);
        var databaseInvoice =
            await DbConnection.QueryFirstOrDefaultAsync<DatabaseInvoice>(procedureName, parameters, commandType: CommandType.StoredProcedure);

        if (databaseInvoice is not null)
        {
            var invoice = InvoiceMapper.MapDbInvoiceToDomainInvoice(databaseInvoice);
            return invoice;
        }
        return Invoice.CreateNullInvoice();
    }

    /// <inheritdoc/>
    public async ValueTask<bool> DeleteSpecificInvoice(Guid invoiceIdentifier)
    {
        const string procedureName = "DeleteSpecificInvoiceProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);
        var invoiceWasDeletedSuccessfully =
            await DbConnection.ExecuteAsync(procedureName, parameters, commandType: CommandType.StoredProcedure);
        return invoiceWasDeletedSuccessfully > 0;
    }

    /// <inheritdoc/>
    public async ValueTask<InvoiceMetadata> RetrieveSpecificInvoiceMetadata(Guid invoiceIdentifier)
    {
        const string procedureName = "RetrieveSpecificInvoiceMetadataProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);

        // TODO: This is a hack. In theory, we should have a procedure for metadata bag and another procedure for metadata.
        // This is in order to respect the InvoiceMetadata record structure schema.
        var resultDictionary = new Dictionary<string, object>();
        using (var metadataBag = await DbConnection.QueryMultipleAsync(procedureName, parameters, commandType: CommandType.StoredProcedure))
        {
            var rows = await metadataBag.ReadAsync();

            foreach (var row in rows)
            {
                var key = row.Key;
                var value = row.Value;

                resultDictionary.Add(key, value);
            }
        }
        return new InvoiceMetadata() { MetadataBag = resultDictionary };
    }

    /// <inheritdoc/>
    public async ValueTask<bool> UpdateSpecificInvoiceMetadata(Guid invoiceIdentifier, string key, object value)
    {
        const string procedureName = "UpdateSpecificInvoiceMetadataProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);

        parameters.Add("MetadataKey", key);
        parameters.Add("MetadataValue", value.ToString());
        var metadataBagWasUpdated = await DbConnection.ExecuteAsync(procedureName, parameters, commandType: CommandType.StoredProcedure);
        return metadataBagWasUpdated > 0;
    }

    /// <inheritdoc/>
    public async ValueTask<bool> DeleteSpecificInvoiceMetadata(Guid invoiceIdentifier, string metadataKey)
    {
        const string procedureName = "DeleteSpecificInvoiceMetadataProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);
        parameters.Add("MetadataBagKey", metadataKey);
        var deleteWasSuccessful = await DbConnection.ExecuteAsync(procedureName, parameters, commandType: CommandType.StoredProcedure);

        return deleteWasSuccessful > 0;
    }

    /// <inheritdoc/>
    public async ValueTask<Invoice> UpdateSpecificInvoice(Invoice invoice)
    {
        var itemsInfo = invoice.Items;
        var merchantInfo = invoice.MerchantInformation;
        var timeInfo = invoice.InvoiceTime;

        await UpdateInvoiceItems(invoice.InvoiceId, itemsInfo);
        await UpdateMerchantInformation(invoice.InvoiceId, merchantInfo);
        await UpdateTimeInformation(invoice.InvoiceId, timeInfo);

        var updatedInvoice = await RetrieveSpecificInvoice(invoice.InvoiceId);
        return updatedInvoice;
    }

    /// <inheritdoc/>
    public async ValueTask<bool> UpdateMerchantInformation(Guid invoiceIdentifier, InvoiceMerchantInformation merchantInformation)
    {
        const string procedureName = "UpdateInvoiceMerchantInformationProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);
        parameters.Add("MerchantName", merchantInformation.MerchantName);
        parameters.Add("MerchantAddress", merchantInformation.MerchantAddress);
        parameters.Add("MerchantPhoneNumber", merchantInformation.MerchantPhoneNumber);

        var updateWasSuccessful = await DbConnection.ExecuteAsync(procedureName, parameters, commandType: CommandType.StoredProcedure);
        return updateWasSuccessful != 0;
    }

    /// <inheritdoc/>
    public async ValueTask<bool> UpdateTimeInformation(Guid invoiceIdentifier, InvoiceTimeInformation timeInformation)
    {
        const string procedureName = "UpdateSpecificInvoiceTimeInformationProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);
        parameters.Add("InvoiceIdentifiedDate", timeInformation.InvoiceIdentifiedDate);
        parameters.Add("InvoiceSubmittedDate", timeInformation.InvoiceSubmittedDate);
        var timeInformationWasUpdated = await DbConnection.ExecuteAsync(procedureName, parameters, commandType: CommandType.StoredProcedure);
        return timeInformationWasUpdated != 0;
    }

    /// <inheritdoc/>
    public async ValueTask<InvoiceMerchantInformation> RetrieveMerchantInformation(Guid invoiceIdentifier)
    {
        const string procedureName = "RetrieveSpecificMerchantInformationProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);
        var merchantInformation =
            await DbConnection.QueryFirstOrDefaultAsync<InvoiceMerchantInformation>(procedureName, parameters, commandType: CommandType.StoredProcedure);

        return InvoiceMerchantInformation.CheckInvoiceMerchantInformationStructIsNull(merchantInformation)
            ? InvoiceMerchantInformation.CreateNullInvoiceMerchantInformation()
            : merchantInformation;
    }

    /// <inheritdoc/>
    public async ValueTask<bool> DeleteMerchantInformation(Guid invoiceIdentifier)
    {
        const string procedureName = "DeleteSpecificInvoiceMerchantInformationProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);

        var merchantInformationWasDeleted = await DbConnection.ExecuteAsync(procedureName, parameters, commandType: CommandType.StoredProcedure);
        return merchantInformationWasDeleted > 0;
    }

    /// <inheritdoc/>
    public async ValueTask<InvoiceTimeInformation> RetrieveTimeInformation(Guid invoiceIdentifier)
    {
        const string procedureName = "RetrieveSpecificTimeInformationProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);
        var timeInformation =
            await DbConnection.QueryFirstOrDefaultAsync<InvoiceTimeInformation>(procedureName, parameters, commandType: CommandType.StoredProcedure);

        return InvoiceTimeInformation.CheckInvoiceTimeInformationStructIsNull(timeInformation)
            ? InvoiceTimeInformation.CreateNullInvoiceTimeInformation()
            : timeInformation;
    }

    /// <inheritdoc/>
    public async ValueTask<bool> DeleteTimeInformation(Guid invoiceIdentifier)
    {
        const string procedureName = "DeleteSpecificInvoiceTimeInformationProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);
        var timeInformationWasDeleted = await DbConnection.ExecuteAsync(procedureName, parameters, commandType: CommandType.StoredProcedure);
        return timeInformationWasDeleted > 0;
    }

    /// <inheritdoc/>
    public async ValueTask<InvoiceItemsInformation> RetrieveInvoiceItems(Guid invoiceIdentifier)
    {
        const string procedureName = "RetrieveSpecificInvoiceItemsProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);
        var (BoughtItems, DiscountedItems) =
            await DbConnection.QueryFirstOrDefaultAsync<(string, string)>(procedureName, parameters, commandType: CommandType.StoredProcedure);

        if (BoughtItems is not null && DiscountedItems is not null)
        {
            var boughtItems = JsonConvert.DeserializeObject<List<KeyValuePair<string, decimal>>>(BoughtItems)!;
            var discountedItems = JsonConvert.DeserializeObject<List<KeyValuePair<string, decimal>>>(DiscountedItems)!;

            return new InvoiceItemsInformation()
            {
                BoughtItems = boughtItems,
                DiscountedItems = discountedItems
            };
        }
        return InvoiceItemsInformation.CreateNullInvoiceItemsInformation();
    }

    /// <inheritdoc/>
    public async ValueTask<bool> DeleteInvoiceItems(Guid invoiceIdentifier)
    {
        const string procedureName = "DeleteSpecificInvoiceItemsProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);
        var invoiceItemsWereDeleted = await DbConnection.ExecuteAsync(procedureName, parameters, commandType: CommandType.StoredProcedure);
        return invoiceItemsWereDeleted > 0;
    }

    /// <inheritdoc/>
    public async ValueTask<InvoiceStatus> RetrieveInvoiceStatus(Guid invoiceIdentifier)
    {
        const string procedureName = "RetrieveSpecificInvoiceStatusProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);
        var invoiceStatus =
            await DbConnection.QueryFirstOrDefaultAsync<InvoiceStatus>(procedureName, parameters, commandType: CommandType.StoredProcedure);

        return InvoiceStatus.CheckInvoiceStatusStructIsNull(invoiceStatus)
           ? InvoiceStatus.CreateNullInvoiceStatus()
           : invoiceStatus;
    }

    /// <inheritdoc/>
    public async ValueTask<bool> UpdateInvoiceStatus(Invoice invoice, InvoiceStatus invoiceStatus)
    {
        const string procedureName = "UpdateSpecificInvoiceStatusProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoice.InvoiceId);
        parameters.Add("IsCompleteInvoice", Invoice.VerifyInvoiceIsComplete(invoice));
        parameters.Add("IsAnalyzed", invoiceStatus.IsAnalyzed);
        parameters.Add("AnalyzedDate", invoiceStatus.AnalyzedDate);
        var invoiceStatusWasUpdated = await DbConnection.ExecuteAsync(procedureName, parameters, commandType: CommandType.StoredProcedure);
        return invoiceStatusWasUpdated > 0;
    }

    /// <inheritdoc/>
    public async ValueTask<bool> UpdateInvoiceItems(Guid invoiceIdentifier, InvoiceItemsInformation invoiceItemsInformation)
    {
        const string procedureName = "UpdateSpecificInvoiceItemsProcedure";
        var parameters = new DynamicParameters();
        parameters.Add("InvoiceIdentifier", invoiceIdentifier);

        var boughtItems = JsonConvert.SerializeObject(invoiceItemsInformation.BoughtItems);
        var discountedItems = JsonConvert.SerializeObject(invoiceItemsInformation.DiscountedItems);
        parameters.Add("BoughtItems", boughtItems);
        parameters.Add("DiscountedItems", discountedItems);

        var invoiceItemsWereUpdated = await DbConnection.ExecuteAsync(procedureName, parameters, commandType: CommandType.StoredProcedure);
        return invoiceItemsWereUpdated > 0;
    }
}
