namespace arolariu.Backend.Core.Auth;

using Microsoft.Extensions.Logging;

/// <summary>
/// The logger (using .NET generators) for the authentication module.
/// </summary>
public static partial class Log
{
	/// <summary>
	/// Auto-generated method for logging that the e-mail is being prepared.
	/// </summary>
	/// <param name="logger"></param>
	/// <param name="emailTo"></param>
	/// <param name="subject"></param>
	[LoggerMessage(1, LogLevel.Information, "Preparing e-mail to {emailTo} with subject {subject}.")]
	public static partial void LogPreparingEmail(this ILogger logger, string emailTo, string subject);
}
