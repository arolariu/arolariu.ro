namespace arolariu.Backend.Domain.Invoices.Services.Management;

using System;
using System.Threading.Tasks;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Management;

public sealed partial class InvoiceManagementService
{
  private async Task TryCatchAsync(Func<Task> operation)
  {
    try
    {
      await operation().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
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
      throw;
    }
    catch (Exception exception)
    {
      throw Classify(exception);
    }
  }

  private Exception Classify(Exception exception) => exception switch
  {
    InvoiceManagementValidationException
      or InvoiceManagementDependencyException
      or InvoiceManagementDependencyValidationException
      or InvoiceManagementServiceException
      => exception,

    _ when ContainsExceptionMarker<IValidationException>(exception)
      => LogAndWrapValidation(exception),

    _ when ContainsExceptionMarker<IDependencyValidationException>(exception)
      || ContainsExceptionMarker<INotFoundException>(exception)
      || ContainsExceptionMarker<IAlreadyExistsException>(exception)
      || ContainsExceptionMarker<ILockedException>(exception)
      || ContainsExceptionMarker<IRateLimitedException>(exception)
      || ContainsExceptionMarker<IUnauthorizedException>(exception)
      || ContainsExceptionMarker<IForbiddenException>(exception)
      => LogAndWrapDependencyValidation(exception),

    _ when ContainsExceptionMarker<IDependencyException>(exception)
      || ContainsExceptionMarker<ITimeoutException>(exception)
      => LogAndWrapDependency(exception),

    _ => LogAndWrapService(exception),
  };

  private InvoiceManagementValidationException LogAndWrapValidation(Exception exception)
  {
    logger.LogInvoiceManagementValidationException();
    return new InvoiceManagementValidationException(exception);
  }

  private InvoiceManagementDependencyValidationException LogAndWrapDependencyValidation(Exception exception)
  {
    logger.LogInvoiceManagementDependencyValidationException();
    return new InvoiceManagementDependencyValidationException(exception);
  }

  private InvoiceManagementDependencyException LogAndWrapDependency(Exception exception)
  {
    logger.LogInvoiceManagementDependencyException();
    return new InvoiceManagementDependencyException(exception);
  }

  private InvoiceManagementServiceException LogAndWrapService(Exception exception)
  {
    logger.LogInvoiceManagementServiceException();
    return new InvoiceManagementServiceException(exception);
  }

  private static bool ContainsExceptionMarker<TMarker>(Exception exception)
    where TMarker : class
  {
    Exception? current = exception;

    while (current is not null)
    {
      if (current is TMarker)
      {
        return true;
      }

      current = current.InnerException;
    }

    return false;
  }
}
