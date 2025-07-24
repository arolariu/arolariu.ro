namespace arolariu.Backend.Common.Options;

using System;

using Microsoft.Extensions.Options;


/// <summary>
/// Manages configuration for local services.
/// </summary>
/// <param name="localOptionsMonitor"></param>
public class LocalOptionsManager(IOptionsMonitor<LocalOptions> localOptionsMonitor) : IOptionsManager
{
	/// <summary>
	/// Monitors changes to the <see cref="LocalOptionsMonitor"/> configuration.
	/// </summary>
	/// <remarks>This field holds an instance of <see cref="IOptionsMonitor{TOptions}"/> for <see
	/// cref="LocalOptionsMonitor"/>, allowing the application to react to configuration changes at runtime.</remarks>
	private readonly IOptionsMonitor<LocalOptions> LocalOptionsMonitor =
		localOptionsMonitor ?? throw new ArgumentNullException(nameof(localOptionsMonitor));

	/// <inheritdoc/>
	public ApplicationOptions GetApplicationOptions() => LocalOptionsMonitor.CurrentValue;
}
