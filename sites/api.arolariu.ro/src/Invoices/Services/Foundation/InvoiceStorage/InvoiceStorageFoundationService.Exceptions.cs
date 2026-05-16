namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Modules;

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
      throw Classify(exception);
    }
  }

  private async Task<Invoice> TryCatchAsync(ReturningInvoiceFunction returningInvoiceFunction)
  {
    try
    {
      return await returningInvoiceFunction().ConfigureAwait(false);
    }
    catch (Exception exception)
    {
      throw Classify(exception);
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
      throw Classify(exception);
    }
  }

  private Exception Classify(Exception exception) => exception switch
  {
    InvoiceIdNotSetException
      or InvoiceDescriptionNotSetException
      or InvoicePaymentInformationNotCorrectException
      or InvoiceTimeInformationNotCorrectException
      or InvoicePhotoLocationNotCorrectException
      => LogAndWrapValidation(exception),

    // Pass through broker exceptions that already implement correct HTTP classification markers
    // (INotFoundException → 404, IAlreadyExistsException → 409, ILockedException → 423, etc.)
    // Wrapping these in DependencyValidation would mask their intended HTTP status codes.
    InvoiceNotFoundException
      or InvoiceAlreadyExistsException
      or InvoiceLockedException
      or InvoiceCosmosDbRateLimitException
      or InvoiceUnauthorizedAccessException
      or InvoiceForbiddenAccessException
      => LogAndPassThrough(exception),

    InvoiceFailedStorageException
      or OperationCanceledException
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

  private Exception LogAndPassThrough(Exception exception)
  {
    // Log at Foundation layer for observability, but preserve the original exception
    // with its classification marker interface (INotFoundException, ILockedException, etc.)
    // so ExceptionToHttpResultMapper can produce the correct HTTP status code.
    logger.LogInvoiceStorageDependencyValidationException(exception.Message);
    return exception;
  }

  private InvoiceFoundationServiceException LogAndWrapService(Exception exception)
  {
    var outer = new InvoiceFoundationServiceException(exception);
    logger.LogInvoiceStorageServiceException(outer.Message);
    return outer;
  }
}
