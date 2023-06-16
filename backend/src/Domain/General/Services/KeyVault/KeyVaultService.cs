using Azure;
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

using Microsoft.Extensions.Configuration;

using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.General.Services.KeyVault;

/// <summary>
/// Service that handles the Azure Key Vault integration.
/// </summary>
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
        var kvUri = configuration["Azure:KeyVault:Uri"] ?? throw new ArgumentNullException(nameof(configuration));
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
            var secret = _secretClient.GetSecret(secretName);
            return secret.Value.Value;
        }
        catch (RequestFailedException ex)
        {
            throw new Exception($"Failed to get secret '{secretName}' from Key Vault: {ex.Message}");
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
            var secret = await _secretClient.GetSecretAsync(secretName);
            return secret.Value.Value;
        }
        catch (RequestFailedException ex)
        {
            throw new Exception($"Failed to get secret '{secretName}' from Key Vault: {ex.Message}");
        }
    }
}

