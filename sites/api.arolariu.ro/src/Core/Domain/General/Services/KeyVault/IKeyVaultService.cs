using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.General.Services.KeyVault;

/// <summary>
/// Interface that handles the Azure Key Vault integration.
/// This interface is used by the <see cref="KeyVaultService"/> class.
/// The <see cref="KeyVaultService"/> class is used to fetch secrets from Azure Key Vault.
/// This interface offers both synchronous and asynchronous methods for fetching secrets from Azure Key Vault.
/// </summary>
public interface IKeyVaultService
{
    /// <summary>
    /// Fetches a Key Vault secret by name synchronously.
    /// When using this method, the thread will be blocked until the secret is fetched.
    /// For asynchronous fetching, use the <see cref="GetSecretAsync(string)"/> method.
    /// </summary>
    /// <param name="secretName">The name of the secret to fetch from Azure Key Vault.</param>
    /// <returns>The value of the secret.</returns>
    public string GetSecret(string secretName);

    /// <summary>
    /// Fetches a Key Vault secret by name asynchronously.
    /// When using this method, the thread will not be blocked until the secret is fetched.
    /// For synchronous fetching, use the <see cref="GetSecret(string)"/> method.
    /// </summary>
    /// <param name="secretName">The name of the secret to fetch from Azure Key Vault.</param>
    /// <returns>A task representing the asynchronous operation. The result of the task is the value of the secret.</returns>
    public Task<string> GetSecretAsync(string secretName);
}