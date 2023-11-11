using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;

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

    private async Task TryCatchAsync(ReturningTaskFunction returningTaskFunction)
    {
        try
        {
            await returningTaskFunction().ConfigureAwait(false);
        }
        catch (Exception exception)
        {
            throw CreateAndLogServiceException(exception);
        }
    }
    private async Task<Invoice> TryCatchAsync(ReturningInvoiceFunction returningInvoiceFunction)
    {
        try
        {
            return await returningInvoiceFunction().ConfigureAwait(false);
        }
        catch (InvoiceIdNotSetException exception)
        {
            throw CreateAndLogValidationException(exception);
        }
        catch (Exception exception)
        {
            throw CreateAndLogServiceException(exception);
        }
    }

    private async Task<IEnumerable<Invoice>> TryCatchAsync(ReturningInvoicesFunction returningInvoicesFunction)
    {
        try
        {
            return await returningInvoicesFunction().ConfigureAwait(false);
        }
        catch (Exception exception)
        {
            throw CreateAndLogServiceException(exception);
        }
    }

    private InvoiceFoundationValidationException CreateAndLogValidationException(Exception exception)
    {
        var invoiceFoundationValidationException = new InvoiceFoundationValidationException(exception);
        var exceptionMessage = invoiceFoundationValidationException.Message;
        logger.LogInvoiceStorageValidationException(exceptionMessage);
        return invoiceFoundationValidationException;
    }

    [SuppressMessage("Major Code Smell", "S1144:Unused private types or members should be removed", Justification = "<Pending>")]
    private InvoiceFoundationDependencyException CreateAndLogDependencyException(Exception exception)
    {
        var invoiceFoundationDependencyException = new InvoiceFoundationDependencyException(exception);
        var exceptionMessage = invoiceFoundationDependencyException.Message;
        logger.LogInvoiceStorageDependencyException(exceptionMessage);
        return invoiceFoundationDependencyException;
    }

    [SuppressMessage("Major Code Smell", "S1144:Unused private types or members should be removed", Justification = "<Pending>")]
    private InvoiceFoundationDependencyValidationException CreateAndLogDependencyValidationException(Exception exception)
    {
        var invoiceFoundationDependencyValidationException = new InvoiceFoundationDependencyValidationException(exception);
        var exceptionMessage = invoiceFoundationDependencyValidationException.Message;
        logger.LogInvoiceStorageDependencyValidationException(exceptionMessage);
        return invoiceFoundationDependencyValidationException;
    }

    private InvoiceFoundationServiceException CreateAndLogServiceException(Exception exception)
    {
        var invoiceFoundationServiceException = new InvoiceFoundationServiceException(exception);
        var exceptionMessage = invoiceFoundationServiceException.Message;
        logger.LogInvoiceStorageServiceException(exceptionMessage);
        return invoiceFoundationServiceException;
    }
}
