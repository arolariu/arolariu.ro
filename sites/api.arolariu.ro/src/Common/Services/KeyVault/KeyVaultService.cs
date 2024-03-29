﻿using arolariu.Backend.Common.Options;

using Azure;
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

using Microsoft.Extensions.Configuration;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

namespace arolariu.Backend.Common.Services.KeyVault;

/// <summary>
/// Service that handles the Azure Key Vault integration.
/// A singleton instance of this class is registered in the service collection.
/// </summary>
[ExcludeFromCodeCoverage] // Infrastructure code is not tested currently.
public sealed class KeyVaultService : IKeyVaultService
{
    private SecretClient _secretClient { get; init; }

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="configuration">The configuration instance used to retrieve the Azure Key Vault URI.</param>
    /// <exception cref="ArgumentNullException">Thrown when the configuration is null.</exception>
    public KeyVaultService(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        var kvUri = configuration[$"{nameof(AzureOptions)}:KeyVaultEndpoint"]
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
    public async Task<string> GetSecretAsync(string secretName)
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

