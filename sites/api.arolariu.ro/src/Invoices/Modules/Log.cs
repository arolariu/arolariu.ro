namespace arolariu.Backend.Domain.Invoices;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using Microsoft.Extensions.Logging;

/// <summary>
/// Auto-generated class for logging different events in the invoice domain.
/// </summary>
public static partial class Log
{
  #region Broker Logging Methods
  /// <summary>Logs the start of a structured generative provider request without recording request content.</summary>
  [LoggerMessage(600_100, LogLevel.Debug, "A structured generative analysis provider call is starting.")]
  public static partial void LogStructuredGenerationStarted(this ILogger logger);

  /// <summary>
  /// Logs the start of an Azure Storage Queue Broker operation without recording message contents.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="operationName">The bounded Broker operation name.</param>
  [LoggerMessage(
    600_101,
    LogLevel.Debug,
    "Azure Storage Queue Broker operation {OperationName} is starting.")]
  public static partial void LogQueueOperationStarted(this ILogger logger, string operationName);
  #endregion

  #region Management Service Logging Methods
  /// <summary>Logs an invoice Management validation exception.</summary>
  [LoggerMessage(500_100, LogLevel.Error, "The invoice Management service encountered a validation exception.")]
  public static partial void LogInvoiceManagementValidationException(this ILogger logger);

  /// <summary>Logs an invoice Management dependency-validation exception.</summary>
  [LoggerMessage(500_101, LogLevel.Error, "The invoice Management service encountered a dependency-validation exception.")]
  public static partial void LogInvoiceManagementDependencyValidationException(this ILogger logger);

  /// <summary>Logs an invoice Management dependency exception.</summary>
  [LoggerMessage(500_102, LogLevel.Error, "The invoice Management service encountered a dependency exception.")]
  public static partial void LogInvoiceManagementDependencyException(this ILogger logger);

  /// <summary>Logs an invoice Management service exception.</summary>
  [LoggerMessage(500_103, LogLevel.Error, "The invoice Management service encountered a service exception.")]
  public static partial void LogInvoiceManagementServiceException(this ILogger logger);
  #endregion

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
  /// Auto-generated method for logging the CRUD processing service exception.
  /// </summary>
  /// <param name="logger"></param>
  /// <param name="exceptionMessage"></param>
  [LoggerMessage(300_103, LogLevel.Error, "The invoice processing service encountered a service exception: {exceptionMessage}")]
  public static partial void LogInvoiceProcessingServiceException(this ILogger logger, string exceptionMessage);
  #endregion

  #region Analysis Workflow Logging Methods
  /// <summary>
  /// Logs the loss of an analysis run lease while the run was still executing.
  /// </summary>
  /// <param name="logger">The logger.</param>
  /// <param name="runId">The identifier of the affected run.</param>
  [LoggerMessage(300_210, LogLevel.Warning, "The analysis run '{runId}' lost its lease during execution.")]
  public static partial void LogAnalysisProcessingLeaseLost(this ILogger logger, Guid runId);

  /// <summary>
  /// Logs a failure to persist the analyzed target of an analysis run.
  /// </summary>
  /// <param name="logger">The logger.</param>
  /// <param name="runId">The identifier of the affected run.</param>
  [LoggerMessage(300_211, LogLevel.Error, "The analysis run '{runId}' could not persist its analyzed target.")]
  public static partial void LogAnalysisProcessingTargetPersistenceFailed(this ILogger logger, Guid runId);

  /// <summary>
  /// Logs the durable failure of an analysis run.
  /// </summary>
  /// <param name="logger">The logger.</param>
  /// <param name="runId">The identifier of the affected run.</param>
  /// <param name="failureReason">The bounded failure reason recorded for the run.</param>
  [LoggerMessage(300_212, LogLevel.Error, "The analysis run '{runId}' was marked as failed with reason '{failureReason}'.")]
  public static partial void LogAnalysisProcessingRunFailed(
    this ILogger logger,
    Guid runId,
    AnalysisFailureReason failureReason);

  /// <summary>Logs terminal deletion of a malformed analysis queue payload without recording its contents.</summary>
  [LoggerMessage(300_217, LogLevel.Error, "Malformed analysis message '{messageId}' was deleted on delivery {dequeueCount} with reason '{failureReason}'.")]
  public static partial void LogMalformedAnalysisMessageDeleted(
    this ILogger logger,
    string messageId,
    long dequeueCount,
    AnalysisFailureReason failureReason);

  /// <summary>
  /// Logs an unexpected failure inside the analysis worker's polling loop.
  /// </summary>
  /// <param name="logger">The logger.</param>
  [LoggerMessage(300_213, LogLevel.Error, "The analysis worker iteration failed and will retry.")]
  public static partial void LogAnalysisWorkerIterationFailed(this ILogger logger);

  /// <summary>
  /// Logs the analysis worker starting its polling loop.
  /// </summary>
  /// <param name="logger">The logger.</param>
  [LoggerMessage(300_214, LogLevel.Information, "The analysis worker started polling for queued runs.")]
  public static partial void LogAnalysisWorkerStarted(this ILogger logger);

  /// <summary>
  /// Logs a best-effort queue-depth refresh failure without exposing provider failure content.
  /// </summary>
  /// <param name="logger">The logger.</param>
  [LoggerMessage(300_216, LogLevel.Warning, "The analysis queue-depth refresh failed; the previous gauge sample remains until it expires.")]
  public static partial void LogAnalysisQueueDepthRefreshFailed(this ILogger logger);

  /// <summary>Logs an Analysis Queue Foundation validation exception.</summary>
  [LoggerMessage(300_340, LogLevel.Error, "The analysis queue Foundation encountered a validation exception.")]
  public static partial void LogAnalysisQueueValidationException(this ILogger logger);

  /// <summary>Logs an Analysis Queue Foundation dependency-validation exception.</summary>
  [LoggerMessage(300_341, LogLevel.Error, "The analysis queue Foundation encountered a dependency-validation exception.")]
  public static partial void LogAnalysisQueueDependencyValidationException(this ILogger logger);

  /// <summary>Logs an Analysis Queue Foundation dependency exception.</summary>
  [LoggerMessage(300_342, LogLevel.Error, "The analysis queue Foundation encountered a dependency exception.")]
  public static partial void LogAnalysisQueueDependencyException(this ILogger logger);

  /// <summary>Logs an Analysis Queue Foundation service exception.</summary>
  [LoggerMessage(300_343, LogLevel.Error, "The analysis queue Foundation encountered a service exception.")]
  public static partial void LogAnalysisQueueServiceException(this ILogger logger);
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
  [LoggerMessage(200_300, LogLevel.Error, "The analysis orchestration service encountered a validation exception.")]
  public static partial void LogAnalysisOrchestrationValidationException(this ILogger logger);

  /// <summary>
  /// Auto-generated method for logging the analysis orchestration dependency exception.
  /// </summary>
  /// <param name="logger"></param>
  [LoggerMessage(200_301, LogLevel.Error, "The analysis orchestration service encountered a dependency exception.")]
  public static partial void LogAnalysisOrchestrationDependencyException(this ILogger logger);

  /// <summary>
  /// Auto-generated method for logging the analysis orchestration dependency validation exception.
  /// </summary>
  /// <param name="logger"></param>
  [LoggerMessage(200_302, LogLevel.Error, "The analysis orchestration service encountered a dependency validation exception.")]
  public static partial void LogAnalysisOrchestrationDependencyValidationException(this ILogger logger);

  /// <summary>
  /// Auto-generated method for logging the analysis orchestration service exception.
  /// </summary>
  /// <param name="logger"></param>
  [LoggerMessage(200_303, LogLevel.Error, "The analysis orchestration service encountered a service exception.")]
  public static partial void LogAnalysisOrchestrationServiceException(this ILogger logger);
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

  #region Document Analysis Foundation Logging Methods
  /// <summary>
  /// Auto-generated method for logging the document analysis validation exception.
  /// </summary>
  /// <param name="logger"></param>
  [LoggerMessage(100_410, LogLevel.Error, "The document analysis service encountered a validation exception.")]
  public static partial void LogDocumentAnalysisValidationException(this ILogger logger);

  /// <summary>
  /// Auto-generated method for logging the document analysis dependency exception.
  /// </summary>
  /// <param name="logger"></param>
  [LoggerMessage(100_411, LogLevel.Error, "The document analysis service encountered a dependency exception.")]
  public static partial void LogDocumentAnalysisDependencyException(this ILogger logger);

  /// <summary>
  /// Auto-generated method for logging the document analysis dependency validation exception.
  /// </summary>
  /// <param name="logger"></param>
  [LoggerMessage(100_412, LogLevel.Error, "The document analysis service encountered a dependency validation exception.")]
  public static partial void LogDocumentAnalysisDependencyValidationException(this ILogger logger);

  /// <summary>
  /// Auto-generated method for logging the document analysis service exception.
  /// </summary>
  /// <param name="logger"></param>
  [LoggerMessage(100_413, LogLevel.Error, "The document analysis service encountered a service exception.")]
  public static partial void LogDocumentAnalysisServiceException(this ILogger logger);
  #endregion

  #region Generative Analysis Foundation Logging Methods
  /// <summary>
  /// Auto-generated method for logging the generative analysis validation exception.
  /// </summary>
  /// <param name="logger"></param>
  [LoggerMessage(100_420, LogLevel.Error, "The generative analysis service encountered a validation exception.")]
  public static partial void LogGenerativeAnalysisValidationException(this ILogger logger);

  /// <summary>
  /// Auto-generated method for logging the generative analysis dependency exception.
  /// </summary>
  /// <param name="logger"></param>
  [LoggerMessage(100_421, LogLevel.Error, "The generative analysis service encountered a dependency exception.")]
  public static partial void LogGenerativeAnalysisDependencyException(this ILogger logger);

  /// <summary>
  /// Auto-generated method for logging the generative analysis dependency validation exception.
  /// </summary>
  /// <param name="logger"></param>
  [LoggerMessage(100_422, LogLevel.Error, "The generative analysis service encountered a dependency validation exception.")]
  public static partial void LogGenerativeAnalysisDependencyValidationException(this ILogger logger);

  /// <summary>
  /// Auto-generated method for logging the generative analysis service exception.
  /// </summary>
  /// <param name="logger"></param>
  [LoggerMessage(100_423, LogLevel.Error, "The generative analysis service encountered a service exception.")]
  public static partial void LogGenerativeAnalysisServiceException(this ILogger logger);
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

  #region Analysis Pipeline Observability Logging Methods
  // NOTE: every log method below accepts only bounded, non-sensitive dimensions: run identifiers (GUIDs), the
  // AnalysisTargetType / AnalysisCapability / AnalysisOutcome / AnalysisFailureReason / ClassificationSystem enums,
  // model identifiers, and numeric counts or durations. None accept product names, merchant names, OCR text, scan
  // URLs, prompts, or model responses. See AnalysisTelemetryTests.AnalysisLogMethods_NeverAcceptSensitiveParameters.

  /// <summary>
  /// Logs an analysis message being accepted into the queue.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="correlationId">The analysis correlation identifier.</param>
  /// <param name="targetType">The analysis target type.</param>
  [LoggerMessage(300_220, LogLevel.Information, "Analysis message '{correlationId}' of target type '{targetType}' was queued.")]
  public static partial void LogAnalysisMessageQueued(this ILogger logger, Guid correlationId, AnalysisTargetType targetType);

  /// <summary>
  /// Logs the outcome and duration of a single analysis capability invocation.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="runId">The analysis run identifier.</param>
  /// <param name="capability">The analysis capability.</param>
  /// <param name="outcome">The outcome.</param>
  /// <param name="durationMs">Duration in milliseconds.</param>
  [LoggerMessage(300_224, LogLevel.Information, "Analysis run '{runId}' capability '{capability}' completed with outcome '{outcome}' in {durationMs} ms.")]
  public static partial void LogAnalysisCapabilityOutcomeObserved(this ILogger logger, Guid runId, AnalysisCapability capability, AnalysisOutcome outcome, double durationMs);

  /// <summary>
  /// Logs the bounded failure reason attributed to a failed analysis capability invocation.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="runId">The analysis run identifier.</param>
  /// <param name="capability">The analysis capability.</param>
  /// <param name="failureReason">The bounded failure reason.</param>
  [LoggerMessage(300_225, LogLevel.Warning, "Analysis run '{runId}' capability '{capability}' failed with reason '{failureReason}'.")]
  public static partial void LogAnalysisCapabilityFailureReasonObserved(this ILogger logger, Guid runId, AnalysisCapability capability, AnalysisFailureReason failureReason);

  /// <summary>
  /// Logs a transient-failure retry attempt for an analysis capability call.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="capability">The analysis capability.</param>
  /// <param name="attempt">The 1-based retry attempt number.</param>
  [LoggerMessage(300_226, LogLevel.Warning, "Analysis capability '{capability}' is retrying after a transient dependency failure (attempt {attempt}).")]
  public static partial void LogAnalysisCapabilityRetryAttempted(this ILogger logger, AnalysisCapability capability, int attempt);

  /// <summary>
  /// Logs an AI content filter or refusal event for an analysis capability call.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="capability">The analysis capability.</param>
  [LoggerMessage(300_227, LogLevel.Warning, "Analysis capability '{capability}' was blocked by a provider content filter or refusal.")]
  public static partial void LogAnalysisContentFilterOrRefusalTriggered(this ILogger logger, AnalysisCapability capability);

  /// <summary>
  /// Logs an invalid structured output event for an analysis capability call.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="capability">The analysis capability.</param>
  [LoggerMessage(300_228, LogLevel.Warning, "Analysis capability '{capability}' returned structured output that violated the published contract.")]
  public static partial void LogAnalysisInvalidStructuredOutputDetected(this ILogger logger, AnalysisCapability capability);

  /// <summary>
  /// Logs a taxonomy code validation failure encountered during analysis or manual classification.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="classificationSystem">The classification system whose code failed validation.</param>
  [LoggerMessage(300_229, LogLevel.Warning, "A taxonomy code failed validation against classification system '{classificationSystem}'.")]
  public static partial void LogAnalysisTaxonomyValidationFailed(this ILogger logger, ClassificationSystem classificationSystem);

  /// <summary>
  /// Logs the recovery of an analysis run whose previous worker lease expired.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="runId">The analysis run identifier.</param>
  /// <param name="targetType">The analysis target type.</param>
  /// <param name="attemptCount">The run's total claim/recovery attempt count after this recovery.</param>
  [LoggerMessage(300_230, LogLevel.Warning, "Analysis run '{runId}' of target type '{targetType}' was recovered from an expired lease (attempt {attemptCount}).")]
  public static partial void LogAnalysisLeaseRecovered(this ILogger logger, Guid runId, AnalysisTargetType targetType, int attemptCount);

  /// <summary>
  /// Logs an in-flight analysis run losing its worker lease because renewal failed.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="runId">The analysis run identifier.</param>
  /// <param name="targetType">The analysis target type.</param>
  [LoggerMessage(300_231, LogLevel.Warning, "Analysis run '{runId}' of target type '{targetType}' lost its worker lease and was aborted before persistence.")]
  public static partial void LogAnalysisLeaseLost(this ILogger logger, Guid runId, AnalysisTargetType targetType);

  /// <summary>Logs publication of a failed-only replacement message.</summary>
  [LoggerMessage(300_236, LogLevel.Information, "Analysis run '{correlationId}' queued replacement attempt {attemptNumber}.")]
  public static partial void LogAnalysisReplacementMessageQueued(
    this ILogger logger,
    Guid correlationId,
    int attemptNumber);

  /// <summary>Logs terminal discard after the logical attempt limit.</summary>
  [LoggerMessage(300_237, LogLevel.Warning, "Analysis run '{correlationId}' discarded remaining failures after attempt {attemptNumber}.")]
  public static partial void LogAnalysisMessageDiscardedAfterMaximumAttempts(
    this ILogger logger,
    Guid correlationId,
    int attemptNumber);

  /// <summary>Logs a target persistence failure without recording aggregate content.</summary>
  [LoggerMessage(300_238, LogLevel.Error, "Analysis run '{correlationId}' could not persist its analyzed target; queue policy will continue.")]
  public static partial void LogAnalysisTargetPersistenceFailed(
    this ILogger logger,
    Guid correlationId);

  /// <summary>Logs a replacement enqueue failure after the current message was deleted.</summary>
  [LoggerMessage(300_239, LogLevel.Error, "Analysis run '{correlationId}' could not queue replacement attempt {attemptNumber} after deleting the current message.")]
  public static partial void LogAnalysisReplacementMessageEnqueueFailed(
    this ILogger logger,
    Guid correlationId,
    int attemptNumber);

  /// <summary>
  /// Logs bounded non-sensitive token usage metadata observed for a successful generative analysis capability call.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  /// <param name="telemetryMetadata">The trusted bounded capability, schema, prompt, and taxonomy metadata.</param>
  /// <param name="modelId">The normalized bounded model identifier.</param>
  /// <param name="inputTokens">The input token count, when available.</param>
  /// <param name="outputTokens">The output token count, when available.</param>
  internal static void LogAnalysisTokenUsageObserved(
    this ILogger logger,
    GenerativeTelemetryMetadata telemetryMetadata,
    string modelId,
    long? inputTokens,
    long? outputTokens)
  {
    ArgumentNullException.ThrowIfNull(logger);

    LogAnalysisTokenUsageObservedCore(
      logger,
      telemetryMetadata.Capability,
      modelId,
      telemetryMetadata.SchemaVersion,
      telemetryMetadata.PromptVersion,
      telemetryMetadata.TaxonomyVersion,
      inputTokens,
      outputTokens);
  }

  [LoggerMessage(
    300_232,
    LogLevel.Information,
    "Analysis capability '{capability}' used model '{modelId}' with schema '{schemaVersion}', prompt '{promptVersion}', taxonomy '{taxonomyVersion}' ({inputTokens} input / {outputTokens} output tokens; outcome success).")]
  private static partial void LogAnalysisTokenUsageObservedCore(
    ILogger logger,
    AnalysisCapability capability,
    string modelId,
    string schemaVersion,
    string promptVersion,
    string taxonomyVersion,
    long? inputTokens,
    long? outputTokens);

  /// <summary>
  /// Logs a validation failure inside the classification analysis foundation.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  [LoggerMessage(300_233, LogLevel.Warning, "Classification analysis foundation validation failed.")]
  public static partial void LogClassificationAnalysisValidationException(this ILogger logger);

  /// <summary>
  /// Logs a dependency-validation failure inside the classification analysis foundation.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  [LoggerMessage(300_234, LogLevel.Warning, "Classification analysis foundation dependency validation failed.")]
  public static partial void LogClassificationAnalysisDependencyValidationException(this ILogger logger);

  /// <summary>
  /// Logs an unexpected service failure inside the classification analysis foundation.
  /// </summary>
  /// <param name="logger">The logger instance.</param>
  [LoggerMessage(300_235, LogLevel.Error, "Classification analysis foundation service failed.")]
  public static partial void LogClassificationAnalysisServiceException(this ILogger logger);

  #endregion
}
