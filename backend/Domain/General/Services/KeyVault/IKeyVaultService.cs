﻿using System.Threading.Tasks;

namespace arolariu.Backend.Domain.General.Services.KeyVault
{
    /// <summary>
    /// Interface that handles the Azure Key Vault integration.
    /// </summary>
    public interface IKeyVaultService
    {
        /// <summary>
        /// The method that fetches a Key Vault secret by name, synchronously.
        /// </summary>
        /// <param name="secretName"></param>
        /// <returns>A secret value.</returns>
        string GetSecret(string secretName);

        /// <summary>
        /// The method that fetches a Key Vault secret by name, asynchronously.
        /// </summary>
        /// <param name="secretName"></param>
        /// <returns>A secret value, retrieved async.</returns>
        Task<string> GetSecretAsync(string secretName);
    }
}
