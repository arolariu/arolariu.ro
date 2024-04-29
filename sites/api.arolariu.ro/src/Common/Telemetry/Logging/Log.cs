namespace arolariu.Backend.Common.Telemetry.Logging;
using Microsoft.Extensions.Logging;

/// <summary>
/// This class uses the source generator to create logging methods for the application.
/// </summary>
public static partial class Log
{
	/// <summary>
	/// Auto-generated method for logging that the option value is missing completely.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="propertyName"></param>
	/// <param name="keyVaultName"></param>
	[LoggerMessage(0, LogLevel.Critical,
		message: "The option {propertyName} is missing from the configuration file AND from the specified Key Vault: {keyVaultName}")]
	public static partial void LogOptionValueIsCompletelyMissing(this ILogger logger, string propertyName, string keyVaultName);

	/// <summary>
	/// Auto-generated method for logging the option value was loaded from a Key Vault.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="propertyName"></param>
	/// <param name="keyVaultName"></param>
	[LoggerMessage(1, LogLevel.Information, "The option {propertyName} was loaded from a Key Vault: {keyVaultName}.")]
	public static partial void LogOptionValueFromKeyVault(this ILogger logger, string propertyName, string keyVaultName);

	/// <summary>
	/// Auto-generated method for logging the option value was loaded from the configuration file.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="propertyName"></param>
	[LoggerMessage(2, LogLevel.Information, "The option {propertyName} was loaded from the configuration file.")]
	public static partial void LogOptionValueFromConfiguration(this ILogger logger, string propertyName);
}
