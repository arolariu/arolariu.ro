using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

public partial class InvoiceStorageFoundationService
{
    private delegate Task ReturningTaskFunction();
    private delegate Task<Invoice> ReturningInvoiceFunction();

    private delegate Task<IEnumerable<Invoice>> ReturningInvoicesFunction();

    private static async Task TryCatchAsync(ReturningTaskFunction returningTaskFunction)
    {
        try
        {
            await returningTaskFunction().ConfigureAwait(false);
        }
        catch (Exception exception)
        {
            throw new Exception(message: "test", exception);
        }
    }
    private static async Task<Invoice> TryCatchAsync(ReturningInvoiceFunction returningInvoiceFunction)
    {
        try
        {
            return await returningInvoiceFunction().ConfigureAwait(false);
        }
        catch (Exception exception)
        {
            throw new Exception(message: "test", exception);
        }
    }

    private static async Task<IEnumerable<Invoice>> TryCatchAsync(ReturningInvoicesFunction returningInvoicesFunction)
    {
        try
        {
            return await returningInvoicesFunction().ConfigureAwait(false);
        }
        catch (Exception exception)
        {
            throw new Exception(message: "test", exception);
        }
    }
}
