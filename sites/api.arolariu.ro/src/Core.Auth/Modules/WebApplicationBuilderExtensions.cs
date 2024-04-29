namespace arolariu.Backend.Core.Auth.Modules;
using arolariu.Backend.Common.Options;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Options;

using System;

/// <summary>
/// Extension methods for the <see cref="WebApplicationBuilder"/> builder.
/// </summary>
public static class WebApplicationBuilderExtensions
{
	/// <summary>
	/// Configure authentication and authorization services.
	/// </summary>
	/// <param name="builder"></param>
	/// <param name="azureOptions"></param>
	/// <param name="commonOptions"></param>
	public static void AddAuthServices(
		this WebApplicationBuilder builder,
		IOptions<AzureOptions> azureOptions,
		IOptions<CommonOptions> commonOptions)
	{
		ArgumentNullException.ThrowIfNull(builder);
		ArgumentNullException.ThrowIfNull(azureOptions);
		ArgumentNullException.ThrowIfNull(commonOptions);
	}
}
