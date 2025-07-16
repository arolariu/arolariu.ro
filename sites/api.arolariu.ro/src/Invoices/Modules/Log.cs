namespace arolariu.Backend.Domain.Invoices;

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
	[LoggerMessage(100_301, LogLevel.Error, "The invoice processing service encountered a validation exception: {exceptionMessage}")]
	public static partial void LogInvoiceProcessingValidationException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the invoice processing dependency exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_302, LogLevel.Error, "The invoice processing service encountered a dependency exception: {exceptionMessage}")]
	public static partial void LogInvoiceProcessingDependencyException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the invoice processing dependency validation exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_303, LogLevel.Error, "The invoice processing service encountered a dependency validation exception: {exceptionMessage}")]
	public static partial void LogInvoiceProcessingDependencyValidationException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the invoice processing service exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_304, LogLevel.Error, "The invoice processing service encountered a service exception: {exceptionMessage}")]
	public static partial void LogInvoiceProcessingServiceException(this ILogger logger, string exceptionMessage);
	#endregion

	#region Orchestration Services Logging Methods (Invoice + Merchant)

	/// <summary>
	/// Auto-generated method for logging the invoice orchestration validation exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_201, LogLevel.Error, "The invoice orchestration service encountered a validation exception: {exceptionMessage}")]
	public static partial void LogInvoiceOrchestrationValidationException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the invoice orchestration dependency exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_202, LogLevel.Error, "The invoice orchestration service encountered a dependency exception: {exceptionMessage}")]
	public static partial void LogInvoiceOrchestrationDependencyException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the invoice orchestration dependency validation exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_203, LogLevel.Error, "The invoice orchestration service encountered a dependency validation exception: {exceptionMessage}")]
	public static partial void LogInvoiceOrchestrationDependencyValidationException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the invoice orchestration service exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_204, LogLevel.Error, "The invoice orchestration service encountered a service exception: {exceptionMessage}")]
	public static partial void LogInvoiceOrchestrationServiceException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the merchant orchestration validation exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_205, LogLevel.Error, "The invoice orchestration service encountered a validation exception: {exceptionMessage}")]
	public static partial void LogMerchantOrchestrationValidationException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the merchant orchestration dependency exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_206, LogLevel.Error, "The merchant orchestration service encountered a dependency exception: {exceptionMessage}")]
	public static partial void LogMerchantOrchestrationDependencyException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the merchant orchestration dependency validation exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_207, LogLevel.Error, "The merchant orchestration service encountered a dependency validation exception: {exceptionMessage}")]
	public static partial void LogMerchantOrchestrationDependencyValidationException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the merchant orchestration service exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_208, LogLevel.Error, "The merchant orchestration service encountered a service exception: {exceptionMessage}")]
	public static partial void LogMerchantOrchestrationServiceException(this ILogger logger, string exceptionMessage);
	#endregion

	#region Foundation Services Logging Methods (Invoice + Merchant)
	#region Invoice Analysis Logging Methods

	/// <summary>
	/// Auto-generated method for logging the invoice analysis validation exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_101, LogLevel.Error, "The invoice analysis service encountered a validation exception: {exceptionMessage}")]
	public static partial void LogInvoiceAnalysisValidationException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the invoice analysis dependency exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_102, LogLevel.Error, "The invoice analysis service encountered a dependency exception: {exceptionMessage}")]
	public static partial void LogInvoiceAnalysisDependencyException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the invoice analysis dependency validation exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_103, LogLevel.Error, "The invoice analysis service encountered a dependency validation exception: {exceptionMessage}")]
	public static partial void LogInvoiceAnalysisDependencyValidationException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the invoice analysis service exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_104, LogLevel.Error, "The invoice analysis service encountered a service exception: {exceptionMessage}")]
	public static partial void LogInvoiceAnalysisServiceException(this ILogger logger, string exceptionMessage);
	#endregion

	#region Invoice Storage Logging Methods
	/// <summary>
	/// Auto-generated method for logging the invoice storage validation exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_105, LogLevel.Error, "The invoice storage service encountered a validation exception: {exceptionMessage}")]
	public static partial void LogInvoiceStorageValidationException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the invoice storage dependency exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_106, LogLevel.Error, "The invoice storage service encountered a dependency exception: {exceptionMessage}")]
	public static partial void LogInvoiceStorageDependencyException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the invoice storage dependency validation exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_107, LogLevel.Error, "The invoice storage service encountered a dependency validation exception: {exceptionMessage}")]
	public static partial void LogInvoiceStorageDependencyValidationException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the invoice storage service exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_108, LogLevel.Error, "The invoice storage service encountered a service exception: {exceptionMessage}")]
	public static partial void LogInvoiceStorageServiceException(this ILogger logger, string exceptionMessage);
	#endregion

	#region Merchant Storage Logging Methods
	/// <summary>
	/// Auto-generated method for logging the merchant storage validation exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_109, LogLevel.Error, "The merchant storage service encountered a validation exception: {exceptionMessage}")]
	public static partial void LogMerchantStorageServiceValidationException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the merchant storage dependency exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_110, LogLevel.Error, "The merchant storage service encountered a dependency exception: {exceptionMessage}")]
	public static partial void LogMerchantStorageServiceDependencyException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the merchant storage dependency validation exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_111, LogLevel.Error, "The merchant storage service encountered a dependency validation exception: {exceptionMessage}")]
	public static partial void LogMerchantStorageServiceDependencyValidationException(this ILogger logger, string exceptionMessage);

	/// <summary>
	/// Auto-generated method for logging the merchant storage service exception.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="exceptionMessage"></param>
	[LoggerMessage(100_112, LogLevel.Error, "The merchant storage service encountered a service exception: {exceptionMessage}")]
	public static partial void LogMerchantStorageServiceException(this ILogger logger, string exceptionMessage);
	#endregion
	#endregion
}
