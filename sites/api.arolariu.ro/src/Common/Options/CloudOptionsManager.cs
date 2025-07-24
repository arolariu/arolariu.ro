namespace arolariu.Backend.Common.Options;

using System;

using Microsoft.Extensions.Options;

/// <summary>
/// Manages configuration options for cloud-based services.
/// </summary>
/// <remarks>This class provides mechanisms to retrieve and manage configuration settings for cloud services,
/// ensuring that applications can dynamically adjust to configuration changes.</remarks>
public class CloudOptionsManager(IOptionsMonitor<AzureOptions> azureOptionsMonitor) : IOptionsManager
{
	/// <summary>
	/// Monitors changes to the <see cref="AzureOptionsMonitor"/> configuration.
	/// </summary>
	/// <remarks>This field holds an instance of <see cref="IOptionsMonitor{TOptions}"/> for <see
	/// cref="AzureOptionsMonitor"/>, allowing the application to react to configuration changes at runtime.</remarks>
	private readonly IOptionsMonitor<AzureOptions> AzureOptionsMonitor =
		azureOptionsMonitor ?? throw new ArgumentNullException(nameof(azureOptionsMonitor));

	/// <inheritdoc/>
	public ApplicationOptions GetApplicationOptions() => AzureOptionsMonitor.CurrentValue;
}
