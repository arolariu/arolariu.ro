namespace arolariu.Backend.Common.Services.KeyVault;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;

using Azure;
using Azure.Core;
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

/// <summary>
/// A service that provides access to Azure Key Vault secrets.
/// </summary>
[ExcludeFromCodeCoverage] // Infrastructure code is not tested currently.
public sealed class KeyVaultService : IKeyVaultService
{
	[SuppressMessage("Style", "IDE1006:Naming Styles", Justification = "Old-style implementation")]
	private SecretClient _secretClient { get; init; }

	/// <summary>
	/// Initializes a new instance of the <see cref="KeyVaultService"/> class with the specified options manager.
	/// </summary>
	/// <remarks>This constructor sets up a connection to Azure Key Vault using the specified application options.
	/// It configures the <see cref="SecretClient"/> with a retry policy that uses exponential backoff.</remarks>
	/// <param name="optionsManager">The options manager used to retrieve application configuration settings. Cannot be <see langword="null"/>.</param>
	public KeyVaultService(IOptionsManager optionsManager)
	{
		ArgumentNullException.ThrowIfNull(optionsManager);
		ApplicationOptions options = optionsManager.GetApplicationOptions();

		var keyVaultEndpoint = options.SecretsEndpoint;
		var credentials = new DefaultAzureCredential(new DefaultAzureCredentialOptions
		{
#if !DEBUG
			ManagedIdentityClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")
#endif
		});

		_secretClient = new SecretClient(
			vaultUri: new Uri(keyVaultEndpoint),
			credential: credentials,
			options: new SecretClientOptions
			{
				Retry =
				{
					MaxRetries = 10,
					Delay = TimeSpan.FromSeconds(30),
					MaxDelay = TimeSpan.FromSeconds(300),
					Mode = RetryMode.Exponential
				}
			});
	}

	/// <inheritdoc/>
	/// <param name="secretName">The name of the secret to fetch from Azure Key Vault.</param>
	/// <returns>The value of the secret.</returns>
	/// <exception cref="Exception">Thrown when the retrieval of the secret fails.</exception>
	public string TryGetSecret(string secretName)
	{
		try
		{
			var secret = _secretClient.GetSecret(secretName);
			return secret.Value.Value;
		}
		catch (RequestFailedException)
		{
#pragma warning disable S112 // General exceptions should never be thrown
#pragma warning disable CA2201 // Do not raise reserved exception types
			throw new Exception($"Failed to get secret '{secretName}' from Key Vault: {_secretClient.VaultUri}");
#pragma warning restore CA2201 // Do not raise reserved exception types
#pragma warning restore S112 // General exceptions should never be thrown
		}
	}

	/// <inheritdoc/>
	/// <param name="secretName">The name of the secret to fetch from Azure Key Vault.</param>
	/// <returns>A task representing the asynchronous operation. The result of the task is the value of the secret.</returns>
	/// <exception cref="Exception">Thrown when the retrieval of the secret fails.</exception>
	public async Task<string> TryGetSecretAsync(string secretName)
	{
		try
		{
			var secret = await _secretClient.GetSecretAsync(secretName).ConfigureAwait(false);
			return secret.Value.Value;
		}
		catch (RequestFailedException)
		{
#pragma warning disable S112 // General exceptions should never be thrown
#pragma warning disable CA2201 // Do not raise reserved exception types
			throw new Exception($"Failed to get secret '{secretName}' from Key Vault: {_secretClient.VaultUri}");
#pragma warning restore CA2201 // Do not raise reserved exception types
#pragma warning restore S112 // General exceptions should never be thrown
		}
	}
}
