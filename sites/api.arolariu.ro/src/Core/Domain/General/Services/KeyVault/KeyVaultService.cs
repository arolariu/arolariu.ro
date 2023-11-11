using Azure;
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

using Microsoft.Extensions.Configuration;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.General.Services.KeyVault;

/// <summary>
/// Service that handles the Azure Key Vault integration.
/// A singleton instance of this class is registered in the service collection.
/// </summary>
[ExcludeFromCodeCoverage] // Infrastructure code is not tested currently.
public class KeyVaultService : IKeyVaultService
{
    private readonly SecretClient _secretClient;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="configuration">The configuration instance used to retrieve the Azure Key Vault URI.</param>
    /// <exception cref="ArgumentNullException">Thrown when the configuration is null.</exception>
    public KeyVaultService(IConfiguration configuration)
    {
        var kvUri = configuration["Azure:KeyVault:Uri"]
            ?? throw new ArgumentNullException(nameof(configuration));

        _secretClient = new SecretClient(
            new Uri(kvUri),
            new DefaultAzureCredential());
    }

    /// <inheritdoc/>
    /// <param name="secretName">The name of the secret to fetch from Azure Key Vault.</param>
    /// <returns>The value of the secret.</returns>
    /// <exception cref="Exception">Thrown when the retrieval of the secret fails.</exception>
    public string GetSecret(string secretName)
    {
        try
        {
            using var activity = Program.ActivitySource.StartActivity("GetSecret");
            var secret = _secretClient.GetSecret(secretName);
            return secret.Value.Value;
        }
        catch (RequestFailedException)
        {
#pragma warning disable S112 // General exceptions should never be thrown
            throw new Exception($"Failed to get secret '{secretName}' from Key Vault: {_secretClient.VaultUri}");
#pragma warning restore S112 // General exceptions should never be thrown
        }
    }

    /// <inheritdoc/>
    /// <param name="secretName">The name of the secret to fetch from Azure Key Vault.</param>
    /// <returns>A task representing the asynchronous operation. The result of the task is the value of the secret.</returns>
    /// <exception cref="Exception">Thrown when the retrieval of the secret fails.</exception>
    public async Task<string> GetSecretAsync(string secretName)
    {
        try
        {
            using var activity = Program.ActivitySource.StartActivity("GetSecretAsync");
            var secret = await _secretClient.GetSecretAsync(secretName);
            return secret.Value.Value;
        }
        catch (RequestFailedException)
        {
#pragma warning disable S112 // General exceptions should never be thrown
            throw new Exception($"Failed to get secret '{secretName}' from Key Vault: {_secretClient.VaultUri}");
#pragma warning restore S112 // General exceptions should never be thrown
        }
    }
}

