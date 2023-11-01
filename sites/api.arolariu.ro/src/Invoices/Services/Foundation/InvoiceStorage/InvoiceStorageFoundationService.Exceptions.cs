using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

public partial class InvoiceStorageFoundationService
{
    private delegate Task<Invoice> ReturningInvoiceFunction();

    private delegate Task<IEnumerable<Invoice>> ReturningInvoicesFunction();

    [SuppressMessage("Performance", "CA1822:Mark members as static", Justification = "<Pending>")]
    private async Task<Invoice> TryCatchAsync(ReturningInvoiceFunction returningInvoiceFunction)
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

    [SuppressMessage("Performance", "CA1822:Mark members as static", Justification = "<Pending>")]
    private async Task<IEnumerable<Invoice>> TryCatchAsync(ReturningInvoicesFunction returningInvoicesFunction)
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
