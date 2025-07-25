namespace arolariu.Backend.Common.Telemetry.Logging;

using Microsoft.Extensions.Logging;

/// <summary>
/// Provides high-performance logging methods using .NET source generators for configuration management scenarios.
/// This class defines compile-time generated logging methods with optimized performance and structured logging support.
/// </summary>
/// <remarks>
/// This class uses the LoggerMessage source generator to create zero-allocation logging methods:
/// - Compile-time code generation for optimal performance
/// - Structured logging with parameter extraction
/// - Type-safe logging with compile-time validation
/// - Consistent log formatting across the application
/// </remarks>
/// <example>
/// <code>
/// // Usage in configuration loading scenarios
/// public class ConfigurationLoader
/// {
///     private readonly ILogger&lt;ConfigurationLoader&gt; _logger;
///
///     public void LoadOption(string propertyName)
///     {
///         if (configValue != null)
///         {
///             _logger.LogOptionValueFromConfiguration(propertyName);
///         }
///         else if (keyVaultValue != null)
///         {
///             _logger.LogOptionValueFromKeyVault(propertyName, "MyKeyVault");
///         }
///         else
///         {
///             _logger.LogOptionValueIsCompletelyMissing(propertyName, "MyKeyVault");
///         }
///     }
/// }
/// </code>
/// </example>
public static partial class Log
{
	/// <summary>
	/// Logs a critical error when a required configuration option is missing from both configuration files and Key Vault.
	/// This indicates a serious configuration problem that prevents application startup or proper operation.
	/// </summary>
	/// <param name="logger">The logger instance to write the message to.</param>
	/// <param name="propertyName">The name of the missing configuration property.</param>
	/// <param name="keyVaultName">The name of the Key Vault that was checked for the missing value.</param>
	/// <remarks>
	/// This method logs at Critical level because missing required configuration typically prevents application functionality.
	/// The log entry includes structured data for property name and Key Vault name to facilitate troubleshooting.
	/// </remarks>
	[LoggerMessage(0, LogLevel.Critical,
		message: "The option {propertyName} is missing from the configuration file AND from the specified Key Vault: {keyVaultName}")]
	public static partial void LogOptionValueIsCompletelyMissing(this ILogger logger, string propertyName, string keyVaultName);

	/// <summary>
	/// Logs successful retrieval of a configuration option from Azure Key Vault.
	/// This provides audit trail and troubleshooting information for configuration loading.
	/// </summary>
	/// <param name="logger">The logger instance to write the message to.</param>
	/// <param name="propertyName">The name of the configuration property that was loaded.</param>
	/// <param name="keyVaultName">The name of the Key Vault from which the value was retrieved.</param>
	/// <remarks>
	/// This method logs at Information level to provide visibility into configuration source resolution.
	/// Helps administrators understand where configuration values are being loaded from.
	/// </remarks>
	[LoggerMessage(1, LogLevel.Information, "The option {propertyName} was loaded from a Key Vault: {keyVaultName}.")]
	public static partial void LogOptionValueFromKeyVault(this ILogger logger, string propertyName, string keyVaultName);

	/// <summary>
	/// Logs successful retrieval of a configuration option from local configuration files.
	/// This provides audit trail for configuration loading and helps with troubleshooting.
	/// </summary>
	/// <param name="logger">The logger instance to write the message to.</param>
	/// <param name="propertyName">The name of the configuration property that was loaded from files.</param>
	/// <remarks>
	/// This method logs at Information level to provide visibility into configuration source resolution.
	/// Useful for understanding configuration precedence and debugging configuration issues.
	/// </remarks>
	[LoggerMessage(2, LogLevel.Information, "The option {propertyName} was loaded from the configuration file.")]
	public static partial void LogOptionValueFromConfiguration(this ILogger logger, string propertyName);
}
