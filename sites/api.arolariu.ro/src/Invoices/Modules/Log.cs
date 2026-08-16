namespace arolariu.Backend.Domain.Invoices;

using System;

using Microsoft.Extensions.Logging;

/// <summary>
/// Auto-generated class for logging different events in the invoice domain.
/// </summary>
public static partial class Log
{
  #region Processing Service Logging Methods (Invoice Orchestration Service)
  /// <summary>
  /// Auto-generated method for logging the invoice processing validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(300_100, LogLevel.Error, "The invoice processing service encountered a validation exception: {exceptionMessage}")]
  public static partial void LogInvoiceProcessingValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the invoice processing dependency exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(300_101, LogLevel.Error, "The invoice processing service encountered a dependency exception: {exceptionMessage}")]
  public static partial void LogInvoiceProcessingDependencyException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the invoice processing dependency validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(300_102, LogLevel.Error, "The invoice processing service encountered a dependency validation exception: {exceptionMessage}")]
  public static partial void LogInvoiceProcessingDependencyValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the invoice processing service exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(300_103, LogLevel.Error, "The invoice processing service encountered a service exception: {exceptionMessage}")]
  public static partial void LogInvoiceProcessingServiceException(this ILogger logger, string exceptionMessage);
  #endregion

  #region Processing Service Logging Methods (Analysis Processing Service)
  /// <summary>
  /// Logs a validation exception raised by the analysis processing service.
  /// </summary>
  /// <param name="logger">The logger.</param>
  /// <param name="exceptionMessage">The classified exception message.</param>
  [LoggerMessage(300_200, LogLevel.Error, "The analysis processing service encountered a validation exception: {exceptionMessage}")]
  public static partial void LogAnalysisProcessingValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Logs a dependency exception raised by the analysis processing service.
  /// </summary>
  /// <param name="logger">The logger.</param>
  /// <param name="exceptionMessage">The classified exception message.</param>
  [LoggerMessage(300_201, LogLevel.Error, "The analysis processing service encountered a dependency exception: {exceptionMessage}")]
  public static partial void LogAnalysisProcessingDependencyException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Logs a dependency validation exception raised by the analysis processing service.
  /// </summary>
  /// <param name="logger">The logger.</param>
  /// <param name="exceptionMessage">The classified exception message.</param>
  [LoggerMessage(300_202, LogLevel.Error, "The analysis processing service encountered a dependency validation exception: {exceptionMessage}")]
  public static partial void LogAnalysisProcessingDependencyValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Logs a service exception raised by the analysis processing service.
  /// </summary>
  /// <param name="logger">The logger.</param>
  /// <param name="exceptionMessage">The classified exception message.</param>
  [LoggerMessage(300_203, LogLevel.Error, "The analysis processing service encountered a service exception: {exceptionMessage}")]
  public static partial void LogAnalysisProcessingServiceException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Logs the loss of an analysis run lease while the run was still executing.
  /// </summary>
  /// <param name="logger">The logger.</param>
  /// <param name="runId">The identifier of the affected run.</param>
  /// <param name="reason">The underlying renewal failure message.</param>
  [LoggerMessage(300_210, LogLevel.Warning, "The analysis run '{runId}' lost its lease during execution: {reason}")]
  public static partial void LogAnalysisProcessingLeaseLost(this ILogger logger, string runId, string reason);

  /// <summary>
  /// Logs a failure to persist the analyzed target of an analysis run.
  /// </summary>
  /// <param name="logger">The logger.</param>
  /// <param name="runId">The identifier of the affected run.</param>
  /// <param name="reason">The underlying persistence failure message.</param>
  [LoggerMessage(300_211, LogLevel.Error, "The analysis run '{runId}' could not persist its analyzed target: {reason}")]
  public static partial void LogAnalysisProcessingTargetPersistenceFailed(this ILogger logger, string runId, string reason);

  /// <summary>
  /// Logs the durable failure of an analysis run.
  /// </summary>
  /// <param name="logger">The logger.</param>
  /// <param name="runId">The identifier of the affected run.</param>
  /// <param name="failureCode">The stable failure code recorded on the run.</param>
  [LoggerMessage(300_212, LogLevel.Error, "The analysis run '{runId}' was marked as failed with code '{failureCode}'.")]
  public static partial void LogAnalysisProcessingRunFailed(this ILogger logger, string runId, string failureCode);

  /// <summary>
  /// Logs an unexpected failure inside the analysis worker's polling loop.
  /// </summary>
  /// <param name="logger">The logger.</param>
  /// <param name="reason">The underlying failure message.</param>
  [LoggerMessage(300_213, LogLevel.Error, "The analysis worker iteration failed and will retry: {reason}")]
  public static partial void LogAnalysisWorkerIterationFailed(this ILogger logger, string reason);

  /// <summary>
  /// Logs the analysis worker starting its polling loop.
  /// </summary>
  /// <param name="logger">The logger.</param>
  /// <param name="workerId">The stable lease-owner identifier of the worker.</param>
  [LoggerMessage(300_214, LogLevel.Information, "The analysis worker '{workerId}' started polling for queued runs.")]
  public static partial void LogAnalysisWorkerStarted(this ILogger logger, string workerId);

  /// <summary>
  /// Logs a failure to ensure the durable analysis run store during worker startup.
  /// </summary>
  /// <param name="logger">The logger.</param>
  /// <param name="reason">The underlying failure message.</param>
  [LoggerMessage(300_215, LogLevel.Error, "The analysis worker could not ensure the durable run store: {reason}")]
  public static partial void LogAnalysisWorkerStoreInitializationFailed(this ILogger logger, string reason);
  #endregion

  #region Orchestration Services Logging Methods (Invoice + Merchant)

  /// <summary>
  /// Auto-generated method for logging the invoice orchestration validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(200_100, LogLevel.Error, "The invoice orchestration service encountered a validation exception: {exceptionMessage}")]
  public static partial void LogInvoiceOrchestrationValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the invoice orchestration dependency exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(200_101, LogLevel.Error, "The invoice orchestration service encountered a dependency exception: {exceptionMessage}")]
  public static partial void LogInvoiceOrchestrationDependencyException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the invoice orchestration dependency validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(200_102, LogLevel.Error, "The invoice orchestration service encountered a dependency validation exception: {exceptionMessage}")]
  public static partial void LogInvoiceOrchestrationDependencyValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the invoice orchestration service exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(200_103, LogLevel.Error, "The invoice orchestration service encountered a service exception: {exceptionMessage}")]
  public static partial void LogInvoiceOrchestrationServiceException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the merchant orchestration validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(200_200, LogLevel.Error, "The merchant orchestration service encountered a validation exception: {exceptionMessage}")]
  public static partial void LogMerchantOrchestrationValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the merchant orchestration dependency exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(200_201, LogLevel.Error, "The merchant orchestration service encountered a dependency exception: {exceptionMessage}")]
  public static partial void LogMerchantOrchestrationDependencyException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the merchant orchestration dependency validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(200_202, LogLevel.Error, "The merchant orchestration service encountered a dependency validation exception: {exceptionMessage}")]
  public static partial void LogMerchantOrchestrationDependencyValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the merchant orchestration service exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(200_203, LogLevel.Error, "The merchant orchestration service encountered a service exception: {exceptionMessage}")]
  public static partial void LogMerchantOrchestrationServiceException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the analysis orchestration validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(200_300, LogLevel.Error, "The analysis orchestration service encountered a validation exception: {exceptionMessage}")]
  public static partial void LogAnalysisOrchestrationValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the analysis orchestration dependency exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(200_301, LogLevel.Error, "The analysis orchestration service encountered a dependency exception: {exceptionMessage}")]
  public static partial void LogAnalysisOrchestrationDependencyException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the analysis orchestration dependency validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(200_302, LogLevel.Error, "The analysis orchestration service encountered a dependency validation exception: {exceptionMessage}")]
  public static partial void LogAnalysisOrchestrationDependencyValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the analysis orchestration service exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(200_303, LogLevel.Error, "The analysis orchestration service encountered a service exception: {exceptionMessage}")]
  public static partial void LogAnalysisOrchestrationServiceException(this ILogger logger, string exceptionMessage);
  #endregion

  #region Foundation Services Logging Methods (Invoice + Merchant)
  #region Invoice Analysis Logging Methods

  /// <summary>
  /// Auto-generated method for logging the invoice analysis validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_100, LogLevel.Error, "The invoice analysis service encountered a validation exception: {exceptionMessage}")]
  public static partial void LogInvoiceAnalysisValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the invoice analysis dependency exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_101, LogLevel.Error, "The invoice analysis service encountered a dependency exception: {exceptionMessage}")]
  public static partial void LogInvoiceAnalysisDependencyException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the invoice analysis dependency validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_102, LogLevel.Error, "The invoice analysis service encountered a dependency validation exception: {exceptionMessage}")]
  public static partial void LogInvoiceAnalysisDependencyValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the invoice analysis service exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_103, LogLevel.Error, "The invoice analysis service encountered a service exception: {exceptionMessage}")]
  public static partial void LogInvoiceAnalysisServiceException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging that no analysis has been performed on the invoice.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="invoiceId"></param>
  [LoggerMessage(100_104, LogLevel.Warning, "No analysis has been performed on the invoice with ID: {invoiceId}")]
  public static partial void LogInvoiceAnalysisNoAnalysisHasBeenPerformed(this ILogger logger, Guid invoiceId);
  #endregion

  #region Invoice Storage Logging Methods
  /// <summary>
  /// Auto-generated method for logging the invoice storage validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_200, LogLevel.Error, "The invoice storage service encountered a validation exception: {exceptionMessage}")]
  public static partial void LogInvoiceStorageValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the invoice storage dependency exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_201, LogLevel.Error, "The invoice storage service encountered a dependency exception: {exceptionMessage}")]
  public static partial void LogInvoiceStorageDependencyException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the invoice storage dependency validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_202, LogLevel.Error, "The invoice storage service encountered a dependency validation exception: {exceptionMessage}")]
  public static partial void LogInvoiceStorageDependencyValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the invoice storage service exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_203, LogLevel.Error, "The invoice storage service encountered a service exception: {exceptionMessage}")]
  public static partial void LogInvoiceStorageServiceException(this ILogger logger, string exceptionMessage);
  #endregion

  #region Merchant Storage Logging Methods
  /// <summary>
  /// Auto-generated method for logging the merchant storage validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_300, LogLevel.Error, "The merchant storage service encountered a validation exception: {exceptionMessage}")]
  public static partial void LogMerchantStorageServiceValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the merchant storage dependency exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_301, LogLevel.Error, "The merchant storage service encountered a dependency exception: {exceptionMessage}")]
  public static partial void LogMerchantStorageServiceDependencyException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the merchant storage dependency validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_302, LogLevel.Error, "The merchant storage service encountered a dependency validation exception: {exceptionMessage}")]
  public static partial void LogMerchantStorageServiceDependencyValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the merchant storage service exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_303, LogLevel.Error, "The merchant storage service encountered a service exception: {exceptionMessage}")]
  public static partial void LogMerchantStorageServiceException(this ILogger logger, string exceptionMessage);
  #endregion

  #region Analysis Run Foundation Logging Methods
  /// <summary>
  /// Auto-generated method for logging the analysis run validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_400, LogLevel.Error, "The analysis run service encountered a validation exception: {exceptionMessage}")]
  public static partial void LogAnalysisRunValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the analysis run dependency exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_401, LogLevel.Error, "The analysis run service encountered a dependency exception: {exceptionMessage}")]
  public static partial void LogAnalysisRunDependencyException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the analysis run dependency validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_402, LogLevel.Error, "The analysis run service encountered a dependency validation exception: {exceptionMessage}")]
  public static partial void LogAnalysisRunDependencyValidationException(this ILogger logger, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the analysis run service exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_403, LogLevel.Error, "The analysis run service encountered a service exception: {exceptionMessage}")]
  public static partial void LogAnalysisRunServiceException(this ILogger logger, string exceptionMessage);
  #endregion

  #region Document Analysis Foundation Logging Methods
  /// <summary>
  /// Auto-generated method for logging the document analysis validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exception"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_410, LogLevel.Error, "The document analysis service encountered a validation exception: {exceptionMessage}")]
  public static partial void LogDocumentAnalysisValidationException(this ILogger logger, Exception exception, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the document analysis dependency exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exception"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_411, LogLevel.Error, "The document analysis service encountered a dependency exception: {exceptionMessage}")]
  public static partial void LogDocumentAnalysisDependencyException(this ILogger logger, Exception exception, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the document analysis dependency validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exception"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_412, LogLevel.Error, "The document analysis service encountered a dependency validation exception: {exceptionMessage}")]
  public static partial void LogDocumentAnalysisDependencyValidationException(this ILogger logger, Exception exception, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the document analysis service exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exception"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_413, LogLevel.Error, "The document analysis service encountered a service exception: {exceptionMessage}")]
  public static partial void LogDocumentAnalysisServiceException(this ILogger logger, Exception exception, string exceptionMessage);
  #endregion

  #region Generative Analysis Foundation Logging Methods
  /// <summary>
  /// Auto-generated method for logging the generative analysis validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exception"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_420, LogLevel.Error, "The generative analysis service encountered a validation exception: {exceptionMessage}")]
  public static partial void LogGenerativeAnalysisValidationException(this ILogger logger, Exception exception, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the generative analysis dependency exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exception"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_421, LogLevel.Error, "The generative analysis service encountered a dependency exception: {exceptionMessage}")]
  public static partial void LogGenerativeAnalysisDependencyException(this ILogger logger, Exception exception, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the generative analysis dependency validation exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exception"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_422, LogLevel.Error, "The generative analysis service encountered a dependency validation exception: {exceptionMessage}")]
  public static partial void LogGenerativeAnalysisDependencyValidationException(this ILogger logger, Exception exception, string exceptionMessage);

  /// <summary>
  /// Auto-generated method for logging the generative analysis service exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exception"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(100_423, LogLevel.Error, "The generative analysis service encountered a service exception: {exceptionMessage}")]
  public static partial void LogGenerativeAnalysisServiceException(this ILogger logger, Exception exception, string exceptionMessage);
  #endregion
  #endregion

  #region General Validation and Exception Logging Methods
  /// <summary>
  /// Auto-generated method for logging the user identifier not set warning.
  /// </summary>
  /// <param name="logger"></param>
  [LoggerMessage(900_100, LogLevel.Warning, "User identifier is not set in the current context.")]
  public static partial void LogUserIdentifierNotSetWarning(this ILogger logger);
  #endregion

  #region Classifier Broker Logging Methods

  /// <summary>
  /// Logs when a GPT method fails with an exception.
  /// </summary>
  [LoggerMessage(400_100, LogLevel.Error, "[Classifier] {MethodName} failed: {ErrorMessage}")]
  public static partial void LogGptMethodFailed(this ILogger logger, string methodName, string errorMessage);

  /// <summary>
  /// Logs when a GPT method fails with context-specific information.
  /// </summary>
  [LoggerMessage(400_101, LogLevel.Error, "[Classifier] {MethodName} failed for '{Context}': {ErrorMessage}")]
  public static partial void LogGptMethodFailedWithContext(this ILogger logger, string methodName, string context, string errorMessage);

  /// <summary>
  /// Logs when Azure OpenAI content filter triggers.
  /// </summary>
  [LoggerMessage(400_102, LogLevel.Warning, "[Classifier] {MethodName}: Content filter triggered")]
  public static partial void LogContentFilterTriggered(this ILogger logger, string methodName);

  /// <summary>
  /// Logs when Azure OpenAI content filter triggers with context.
  /// </summary>
  [LoggerMessage(400_103, LogLevel.Warning, "[Classifier] {MethodName}: Content filter triggered for '{Context}'")]
  public static partial void LogContentFilterTriggeredWithContext(this ILogger logger, string methodName, string context);

  /// <summary>
  /// Logs the start of GPT analysis workflow.
  /// </summary>
  [LoggerMessage(400_104, LogLevel.Information, "[Classifier] Starting GPT analysis with model: {ModelName}")]
  public static partial void LogGptAnalysisStarted(this ILogger logger, string modelName);

  /// <summary>
  /// Logs when a hallucinated allergen text is skipped during parsing.
  /// </summary>
  [LoggerMessage(400_105, LogLevel.Warning, "[Classifier] Skipping hallucinated allergen text: '{AllergenName}'")]
  public static partial void LogAllergenHallucinationSkipped(this ILogger logger, string allergenName);

  /// <summary>
  /// Logs when an unrecognized allergen is skipped (not in EU 14 whitelist).
  /// </summary>
  [LoggerMessage(400_106, LogLevel.Warning, "[Classifier] Skipping unrecognized allergen '{AllergenName}' for product '{ProductName}'")]
  public static partial void LogAllergenUnrecognizedSkipped(this ILogger logger, string allergenName, string productName);

  #endregion
}
