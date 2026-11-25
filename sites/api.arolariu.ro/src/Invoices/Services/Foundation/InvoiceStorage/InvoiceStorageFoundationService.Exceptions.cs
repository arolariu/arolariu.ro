namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Modules;

public partial class InvoiceStorageFoundationService
{
  private delegate Task ReturningTaskFunction();

  private async Task TryCatchAsync(ReturningTaskFunction returningTaskFunction)
  {
    try
    {
      await returningTaskFunction().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      // Cancellation is not a fault. Bare rethrow preserves the original stack trace.
      throw;
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  private async Task<TResult> TryCatchAsync<TResult>(Func<Task<TResult>> operation)
  {
    try
    {
      return await operation().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      // Cancellation is not a fault. Bare rethrow preserves the original stack trace.
      throw;
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  private Exception Classify(Exception exception) => exception switch
  {
    ArgumentNullException { ParamName: "invoice" or "product" }
      or ArgumentOutOfRangeException { ParamName: "category" }
      or InvoiceIdNotSetException
      or InvoiceDescriptionNotSetException
      or InvoicePaymentInformationNotCorrectException
      or InvoiceTimeInformationNotCorrectException
      or InvoicePhotoLocationNotCorrectException
      => LogAndWrapValidation(exception),

    InvoiceNotFoundException
      or InvoiceAlreadyExistsException
      or InvoiceLockedException
      or InvoiceCosmosDbRateLimitException
      or InvoiceUnauthorizedAccessException
      or InvoiceForbiddenAccessException
      => LogAndWrapDependencyValidation(exception),

    InvoiceFailedStorageException
      => LogAndWrapDependency(exception),

    _ => LogAndWrapService(exception),
  };

  private InvoiceFoundationValidationException LogAndWrapValidation(Exception exception)
  {
    var outer = new InvoiceFoundationValidationException(exception);
    logger.LogInvoiceStorageValidationException(outer.Message);
    return outer;
  }

  private InvoiceFoundationDependencyException LogAndWrapDependency(Exception exception)
  {
    var outer = new InvoiceFoundationDependencyException(exception);
    logger.LogInvoiceStorageDependencyException(outer.Message);
    return outer;
  }

  private InvoiceFoundationDependencyValidationException LogAndWrapDependencyValidation(Exception exception)
  {
    var outer = new InvoiceFoundationDependencyValidationException(exception);
    logger.LogInvoiceStorageDependencyValidationException(outer.Message);
    return outer;
  }

  private InvoiceFoundationServiceException LogAndWrapService(Exception exception)
  {
    var outer = new InvoiceFoundationServiceException(exception);
    logger.LogInvoiceStorageServiceException(outer.Message);
    return outer;
  }
}
