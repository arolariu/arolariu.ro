namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;

public partial class MerchantOrchestrationService
{
	private delegate Task CallbackFunctionWithNoReturn();

	private delegate Task<Merchant> CallbackFunctionForMerchant();

	private delegate Task<IEnumerable<Merchant>> CallbackFunctionForMerchantList();

	private async Task TryCatchAsync(CallbackFunctionWithNoReturn callbackFunction)
	{
		try
		{
			await callbackFunction().ConfigureAwait(false);
		}
		catch (MerchantFoundationServiceValidationException exception)
		{
			throw CreateAndLogValidationException(exception.InnerException!);
		}
		catch (MerchantFoundationServiceDependencyException exception)
		{
			throw CreateAndLogDependencyException(exception.InnerException!);
		}
		catch (MerchantFoundationServiceDependencyValidationException exception)
		{
			throw CreateAndLogDependencyValidationException(exception.InnerException!);
		}
		catch (MerchantFoundationServiceException exception)
		{
			throw CreateAndLogServiceException(exception.InnerException!);
		}
		catch (Exception exception)
		{
			throw CreateAndLogServiceException(exception);
		}
	}

	private async Task<Merchant> TryCatchAsync(CallbackFunctionForMerchant callbackFunction)
	{
		try
		{
			return await callbackFunction().ConfigureAwait(false);
		}
		catch (MerchantFoundationServiceValidationException exception)
		{
			throw CreateAndLogValidationException(exception.InnerException!);
		}
		catch (MerchantFoundationServiceDependencyException exception)
		{
			throw CreateAndLogDependencyException(exception.InnerException!);
		}
		catch (MerchantFoundationServiceDependencyValidationException exception)
		{
			throw CreateAndLogDependencyValidationException(exception.InnerException!);
		}
		catch (MerchantFoundationServiceException exception)
		{
			throw CreateAndLogServiceException(exception.InnerException!);
		}
		catch (Exception exception)
		{
			throw CreateAndLogServiceException(exception);
		}
	}

	private async Task<IEnumerable<Merchant>> TryCatchAsync(CallbackFunctionForMerchantList callbackFunction)
	{
		try
		{
			return await callbackFunction().ConfigureAwait(false);
		}
		catch (MerchantFoundationServiceValidationException exception)
		{
			throw CreateAndLogValidationException(exception.InnerException!);
		}
		catch (MerchantFoundationServiceDependencyException exception)
		{
			throw CreateAndLogDependencyException(exception.InnerException!);
		}
		catch (MerchantFoundationServiceDependencyValidationException exception)
		{
			throw CreateAndLogDependencyValidationException(exception.InnerException!);
		}
		catch (MerchantFoundationServiceException exception)
		{
			throw CreateAndLogServiceException(exception.InnerException!);
		}
		catch (Exception exception)
		{
			throw CreateAndLogServiceException(exception);
		}
	}

	private MerchantOrchestrationServiceValidationException CreateAndLogValidationException(Exception exception)
	{
		var merchantOrchestrationServiceValidationException = new MerchantOrchestrationServiceValidationException(exception);
		var exceptionMessage = merchantOrchestrationServiceValidationException.Message;
		logger.LogMerchantOrchestrationValidationException(exceptionMessage);
		return merchantOrchestrationServiceValidationException;
	}

	private MerchantOrchestrationServiceDependencyException CreateAndLogDependencyException(Exception exception)
	{
		var merchantOrchestrationServiceDependencyException = new MerchantOrchestrationServiceDependencyException(exception);
		var exceptionMessage = merchantOrchestrationServiceDependencyException.Message;
		logger.LogMerchantOrchestrationDependencyException(exceptionMessage);
		return merchantOrchestrationServiceDependencyException;
	}

	private MerchantOrchestrationServiceDependencyValidationException CreateAndLogDependencyValidationException(Exception exception)
	{
		var merchantOrchestrationServiceDependencyValidationException = new MerchantOrchestrationServiceDependencyValidationException(exception);
		var exceptionMessage = merchantOrchestrationServiceDependencyValidationException.Message;
		logger.LogMerchantOrchestrationDependencyValidationException(exceptionMessage);
		return merchantOrchestrationServiceDependencyValidationException;
	}

	private MerchantOrchestrationServiceException CreateAndLogServiceException(Exception exception)
	{
		var merchantOrchestrationServiceException = new MerchantOrchestrationServiceException(exception);
		var exceptionMessage = merchantOrchestrationServiceException.Message;
		logger.LogMerchantOrchestrationServiceException(exceptionMessage);
		return merchantOrchestrationServiceException;
	}
}
