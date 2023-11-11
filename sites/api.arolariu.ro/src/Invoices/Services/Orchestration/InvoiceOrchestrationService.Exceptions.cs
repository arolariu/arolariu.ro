using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.Orchestration;

public partial class InvoiceOrchestrationService
{
    private delegate Task ReturningAnalysisFunction();

    private delegate Task<Invoice> ReturningInvoiceFunction();

    private delegate Task<IEnumerable<Invoice>> ReturningInvoicesFunction();

    private static async Task TryCatchAsync(ReturningAnalysisFunction returningAnalysisFunction)
    {
        try
        {
            await returningAnalysisFunction().ConfigureAwait(false);
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
