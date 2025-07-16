namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;

using Microsoft.EntityFrameworkCore;

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
		catch (DbUpdateConcurrencyException exception)
		{
			throw CreateAndLogDependencyException(exception);
		}
		catch (DbUpdateException exception)
		{
			throw CreateAndLogDependencyException(exception);
		}
		catch (OperationCanceledException exception)
		{
			throw CreateAndLogDependencyException(exception);
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
		catch (InvoiceDescriptionNotSetException exception)
		{
			throw CreateAndLogValidationException(exception);
		}
		catch (InvoicePaymentInformationNotCorrectException exception)
		{
			throw CreateAndLogValidationException(exception);
		}
		catch (InvoiceTimeInformationNotCorrectException exception)
		{
			throw CreateAndLogValidationException(exception);
		}
		catch (InvoicePhotoLocationNotCorrectException exception)
		{
			throw CreateAndLogValidationException(exception);
		}
		catch (DbUpdateConcurrencyException exception)
		{
			throw CreateAndLogDependencyException(exception);
		}
		catch (DbUpdateException exception)
		{
			throw CreateAndLogDependencyException(exception);
		}
		catch (OperationCanceledException exception)
		{
			throw CreateAndLogDependencyException(exception);
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
		catch (OperationCanceledException exception)
		{
			throw CreateAndLogDependencyException(exception);
		}
		catch (ArgumentNullException exception)
		{
			throw CreateAndLogDependencyValidationException(exception);
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

	private InvoiceFoundationDependencyException CreateAndLogDependencyException(Exception exception)
	{
		var invoiceFoundationDependencyException = new InvoiceFoundationDependencyException(exception);
		var exceptionMessage = invoiceFoundationDependencyException.Message;
		logger.LogInvoiceStorageDependencyException(exceptionMessage);
		return invoiceFoundationDependencyException;
	}

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
