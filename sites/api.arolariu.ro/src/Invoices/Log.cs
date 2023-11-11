using Microsoft.Extensions.Logging;

namespace arolariu.Backend.Domain.Invoices;

/// <summary>
/// Auto-generated class for logging different events in the invoice domain.
/// </summary>
public static partial class Log
{
    #region Orchestration Logging Methods

    /// <summary>
    /// Auto-generated method for logging the invoice orchestration validation exception.
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="exceptionMessage"></param>
    [LoggerMessage(0, LogLevel.Error, "The invoice orchestration service encountered a validation exception: {exceptionMessage}")]
    public static partial void LogInvoiceOrchestrationValidationException(this ILogger logger, string exceptionMessage);

    /// <summary>
    /// Auto-generated method for logging the invoice orchestration dependency exception.
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="exceptionMessage"></param>
    [LoggerMessage(1, LogLevel.Error, "The invoice orchestration service encountered a dependency exception: {exceptionMessage}")]
    public static partial void LogInvoiceOrchestrationDependencyException(this ILogger logger, string exceptionMessage);

    /// <summary>
    /// Auto-generated method for logging the invoice orchestration dependency validation exception.
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="exceptionMessage"></param>
    [LoggerMessage(2, LogLevel.Error, "The invoice orchestration service encountered a dependency validation exception: {exceptionMessage}")]
    public static partial void LogInvoiceOrchestrationDependencyValidationException(this ILogger logger, string exceptionMessage);

    /// <summary>
    /// Auto-generated method for logging the invoice orchestration service exception.
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="exceptionMessage"></param>
    [LoggerMessage(3, LogLevel.Error, "The invoice orchestration service encountered a service exception: {exceptionMessage}")]
    public static partial void LogInvoiceOrchestrationServiceException(this ILogger logger, string exceptionMessage);

    #endregion

    #region Invoice Analysis Logging Methods

    /// <summary>
    /// Auto-generated method for logging the invoice analysis validation exception.
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="exceptionMessage"></param>
    [LoggerMessage(4, LogLevel.Error, "The invoice analysis service encountered a validation exception: {exceptionMessage}")]
    public static partial void LogInvoiceAnalysisValidationException(this ILogger logger, string exceptionMessage);

    /// <summary>
    /// Auto-generated method for logging the invoice analysis dependency exception.
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="exceptionMessage"></param>
    [LoggerMessage(5, LogLevel.Error, "The invoice analysis service encountered a dependency exception: {exceptionMessage}")]
    public static partial void LogInvoiceAnalysisDependencyException(this ILogger logger, string exceptionMessage);

    /// <summary>
    /// Auto-generated method for logging the invoice analysis dependency validation exception.
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="exceptionMessage"></param>
    [LoggerMessage(6, LogLevel.Error, "The invoice analysis service encountered a dependency validation exception: {exceptionMessage}")]
    public static partial void LogInvoiceAnalysisDependencyValidationException(this ILogger logger, string exceptionMessage);

    /// <summary>
    /// Auto-generated method for logging the invoice analysis service exception.
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="exceptionMessage"></param>
    [LoggerMessage(7, LogLevel.Error, "The invoice analysis service encountered a service exception: {exceptionMessage}")]
    public static partial void LogInvoiceAnalysisServiceException(this ILogger logger, string exceptionMessage);

    #endregion

    #region Invoice Storage Logging Methods

    /// <summary>
    /// Auto-generated method for logging the invoice storage validation exception.
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="exceptionMessage"></param>
    [LoggerMessage(8, LogLevel.Error, "The invoice storage service encountered a validation exception: {exceptionMessage}")]
    public static partial void LogInvoiceStorageValidationException(this ILogger logger, string exceptionMessage);

    /// <summary>
    /// Auto-generated method for logging the invoice storage dependency exception.
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="exceptionMessage"></param>
    [LoggerMessage(9, LogLevel.Error, "The invoice storage service encountered a dependency exception: {exceptionMessage}")]
    public static partial void LogInvoiceStorageDependencyException(this ILogger logger, string exceptionMessage);

    /// <summary>
    /// Auto-generated method for logging the invoice storage dependency validation exception.
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="exceptionMessage"></param>
    [LoggerMessage(10, LogLevel.Error, "The invoice storage service encountered a dependency validation exception: {exceptionMessage}")]
    public static partial void LogInvoiceStorageDependencyValidationException(this ILogger logger, string exceptionMessage);

    /// <summary>
    /// Auto-generated method for logging the invoice storage service exception.
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="exceptionMessage"></param>
    [LoggerMessage(11, LogLevel.Error, "The invoice storage service encountered a service exception: {exceptionMessage}")]
    public static partial void LogInvoiceStorageServiceException(this ILogger logger, string exceptionMessage);

    #endregion
}
