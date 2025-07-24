namespace arolariu.Backend.Common.Options;

/// <summary>
/// Provides methods to retrieve configuration options for the application.
/// </summary>
/// <remarks>This interface defines methods to access different sets of options, such as common application
/// settings and authentication-related configurations. Implementations of this interface should provide the logic to
/// retrieve these options, potentially from configuration files, environment variables, or other sources.</remarks>
public interface IOptionsManager
{
	/// <summary>
	/// Gets the main application options.
	/// </summary>
	/// <returns>The application options.</returns>
	ApplicationOptions GetApplicationOptions();
}
