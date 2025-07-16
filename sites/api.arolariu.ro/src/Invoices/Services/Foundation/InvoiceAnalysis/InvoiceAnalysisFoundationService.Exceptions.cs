namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;

public partial class InvoiceAnalysisFoundationService
{
	private delegate Task<Invoice> ReturningAnalysisFunction();

	private async Task<Invoice> TryCatchAsync(ReturningAnalysisFunction returningAnalysisFunction)
	{
		try
		{
			return await returningAnalysisFunction().ConfigureAwait(false);
		}
		catch (Exception exception)
		{
			throw CreateAndLogServiceException(exception);
		}
	}

	[SuppressMessage("Major Code Smell", "S1144:Unused private types or members should be removed", Justification = "<Pending>")]
	[SuppressMessage("Style", "IDE0051:Remove unused private members", Justification = "<Pending>")]
	private InvoiceFoundationValidationException CreateAndLogValidationException(Exception exception)
	{
		var invoiceFoundationValidationException = new InvoiceFoundationValidationException(exception);
		var exceptionMessage = invoiceFoundationValidationException.Message;
		logger.LogInvoiceAnalysisValidationException(exceptionMessage);
		return invoiceFoundationValidationException;
	}

	[SuppressMessage("Major Code Smell", "S1144:Unused private types or members should be removed", Justification = "<Pending>")]
	[SuppressMessage("Style", "IDE0051:Remove unused private members", Justification = "<Pending>")]
	private InvoiceFoundationDependencyException CreateAndLogDependencyException(Exception exception)
	{
		var invoiceFoundationDependencyException = new InvoiceFoundationDependencyException(exception);
		var exceptionMessage = invoiceFoundationDependencyException.Message;
		logger.LogInvoiceAnalysisDependencyException(exceptionMessage);
		return invoiceFoundationDependencyException;
	}

	[SuppressMessage("Major Code Smell", "S1144:Unused private types or members should be removed", Justification = "<Pending>")]
	[SuppressMessage("Style", "IDE0051:Remove unused private members", Justification = "<Pending>")]
	private InvoiceFoundationDependencyValidationException CreateAndLogDependencyValidationException(Exception exception)
	{
		var invoiceFoundationDependencyValidationException = new InvoiceFoundationDependencyValidationException(exception);
		var exceptionMessage = invoiceFoundationDependencyValidationException.Message;
		logger.LogInvoiceAnalysisDependencyValidationException(exceptionMessage);
		return invoiceFoundationDependencyValidationException;
	}

	private InvoiceFoundationServiceException CreateAndLogServiceException(Exception exception)
	{
		var invoiceFoundationServiceException = new InvoiceFoundationServiceException(exception);
		var exceptionMessage = invoiceFoundationServiceException.Message;
		logger.LogInvoiceAnalysisServiceException(exceptionMessage);
		return invoiceFoundationServiceException;
	}
}
