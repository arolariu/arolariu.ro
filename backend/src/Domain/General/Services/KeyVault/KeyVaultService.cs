﻿using Azure;
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
    /// <param name="configuration"></param>
    public KeyVaultService(IConfiguration configuration)
    {
        var kvUri = configuration["Azure:KeyVault:Uri"] ?? throw new ArgumentNullException(nameof(configuration));
        _secretClient = new SecretClient(
            new Uri(kvUri),
            new DefaultAzureCredential());
    }

    /// <inheritdoc/>
    public string GetSecret(string secretName)
    {
        try
        {
            var secret = _secretClient.GetSecret(secretName);
            return secret.Value.Value;
        }
        catch (RequestFailedException ex)
        {
#pragma warning disable S112 // General exceptions should never be thrown
            throw new Exception($"Failed to get secret '{secretName}' from Key Vault: {ex.Message}");
#pragma warning restore S112 // General exceptions should never be thrown
        }
    }

    /// <inheritdoc/>
    public async Task<string> GetSecretAsync(string secretName)
    {
        try
        {
            var secret = await _secretClient.GetSecretAsync(secretName);
            return secret.Value.Value;
        }
        catch (RequestFailedException ex)
        {
#pragma warning disable S112 // General exceptions should never be thrown
            throw new Exception($"Failed to get secret '{secretName}' from Key Vault: {ex.Message}");
#pragma warning restore S112 // General exceptions should never be thrown
        }
    }
}
