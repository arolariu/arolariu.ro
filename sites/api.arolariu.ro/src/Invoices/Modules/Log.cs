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
