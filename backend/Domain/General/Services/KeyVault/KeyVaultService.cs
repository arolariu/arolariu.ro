using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using Microsoft.Extensions.Configuration;
using System.Threading.Tasks;
using System;
using Azure;
using System.Collections.Generic;

namespace ContainerBackend.Domain.General.Services.KeyVault
{
    /// <summary>
    /// Service that handles the Azure Key Vault integration.
    /// This class is registered as a singleton in Domain\General\Services\BuilderDIService.cs.
    /// </summary>
    public class KeyVaultService : IKeyVaultService
    {
        private readonly SecretClient _secretClient;
        private readonly IConfiguration _configuration;

        /// <summary>
        /// Constructor.
        /// </summary>
        /// <param name="configuration"></param>
        public KeyVaultService(IConfiguration configuration)
        {
            _configuration = configuration;
            _secretClient = new SecretClient(
                new Uri(_configuration["Azure:KeyVault:Uri"]!),
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

        /// <summary>
        /// Set the appsettings.json ConnectionStrings for the given service name.
        /// </summary>
        /// <param name="serviceName"></param>
        /// <exception cref="Exception"></exception>
        public void SetConnectionStringFor(string serviceName)
        {
            try
            {
                var secret = _secretClient.GetSecret(serviceName);
                var connectionString = secret.Value.Value;
                _configuration["ConnectionStrings:" + serviceName] = connectionString;
            }
            catch (RequestFailedException ex)
            {
                #pragma warning disable S112 // General exceptions should never be thrown
                throw new Exception($"Failed to get secret '{serviceName}' from Key Vault: {ex.Message}");
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
}
