namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

public partial class InvoiceOrchestrationService
{
	private delegate Task ReturningAnalysisFunction();

	private delegate Task<Invoice> ReturningInvoiceFunction();

	private delegate Task<IEnumerable<Invoice>> ReturningInvoicesFunction();

	private async Task TryCatchAsync(ReturningAnalysisFunction returningAnalysisFunction)
	{
		try
		{
			await returningAnalysisFunction().ConfigureAwait(false);
		}
		catch (InvoiceFoundationValidationException exception)
		{
			throw CreateAndLogDependencyValidationException(exception.InnerException!);
		}
		catch (InvoiceFoundationDependencyException exception)
		{
			throw CreateAndLogDependencyException(exception.InnerException!);
		}
		catch (InvoiceFoundationDependencyValidationException exception)
		{
			throw CreateAndLogDependencyValidationException(exception.InnerException!);
		}
		catch (InvoiceFoundationServiceException exception)
		{
			throw CreateAndLogServiceException(exception.InnerException!);
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
		catch (InvoiceFoundationValidationException exception)
		{
			throw CreateAndLogDependencyValidationException(exception.InnerException!);
		}
		catch (InvoiceFoundationDependencyException exception)
		{
			throw CreateAndLogDependencyException(exception.InnerException!);
		}
		catch (InvoiceFoundationDependencyValidationException exception)
		{
			throw CreateAndLogDependencyValidationException(exception.InnerException!);
		}
		catch (InvoiceFoundationServiceException exception)
		{
			throw CreateAndLogServiceException(exception.InnerException!);
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
		catch (InvoiceFoundationValidationException exception)
		{
			throw CreateAndLogDependencyValidationException(exception.InnerException!);
		}
		catch (InvoiceFoundationDependencyException exception)
		{
			throw CreateAndLogDependencyException(exception.InnerException!);
		}
		catch (InvoiceFoundationDependencyValidationException exception)
		{
			throw CreateAndLogDependencyValidationException(exception.InnerException!);
		}
		catch (InvoiceFoundationServiceException exception)
		{
			throw CreateAndLogServiceException(exception.InnerException!);
		}
		catch (Exception exception)
		{
			throw CreateAndLogServiceException(exception);
		}
	}

	[SuppressMessage("Major Code Smell", "S1144:Unused private types or members should be removed", Justification = "<Pending>")]
	private InvoiceOrchestrationValidationException CreateAndLogValidationException(Exception exception)
	{
		var invoiceOrchestrationValidationException = new InvoiceOrchestrationValidationException(exception);
		var exceptionMessage = invoiceOrchestrationValidationException.Message;
		logger.LogInvoiceOrchestrationValidationException(exceptionMessage);
		return invoiceOrchestrationValidationException;
	}

	private InvoiceOrchestrationDependencyException CreateAndLogDependencyException(Exception exception)
	{
		var invoiceOrchestrationDependencyException = new InvoiceOrchestrationDependencyException(exception);
		var exceptionMessage = invoiceOrchestrationDependencyException.Message;
		logger.LogInvoiceOrchestrationDependencyException(exceptionMessage);
		return invoiceOrchestrationDependencyException;
	}

	private InvoiceOrchestrationDependencyValidationException CreateAndLogDependencyValidationException(Exception exception)
	{
		var invoiceOrchestrationDependencyValidationException = new InvoiceOrchestrationDependencyValidationException(exception);
		var exceptionMessage = invoiceOrchestrationDependencyValidationException.Message;
		logger.LogInvoiceOrchestrationDependencyValidationException(exceptionMessage);
		return invoiceOrchestrationDependencyValidationException;
	}

	private InvoiceOrchestrationServiceException CreateAndLogServiceException(Exception exception)
	{
		var invoiceOrchestrationServiceException = new InvoiceOrchestrationServiceException(exception);
		var exceptionMessage = invoiceOrchestrationServiceException.Message;
		logger.LogInvoiceOrchestrationServiceException(exceptionMessage);
		return invoiceOrchestrationServiceException;
	}
}
