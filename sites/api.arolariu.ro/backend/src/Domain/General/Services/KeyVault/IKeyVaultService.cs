using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.General.Services.KeyVault;

/// <summary>
/// Interface that handles the Azure Key Vault integration.
/// This interface is used by the <see cref="KeyVaultService"/> class.
/// </summary>
public interface IKeyVaultService
{
    /// <summary>
    /// Fetches a Key Vault secret by name synchronously.
    /// </summary>
    /// <param name="secretName">The name of the secret to fetch from Azure Key Vault.</param>
    /// <returns>The value of the secret.</returns>
    public string GetSecret(string secretName);

    /// <summary>
    /// Fetches a Key Vault secret by name asynchronously.
    /// </summary>
    /// <param name="secretName">The name of the secret to fetch from Azure Key Vault.</param>
    /// <returns>A task representing the asynchronous operation. The result of the task is the value of the secret.</returns>
    public Task<string> GetSecretAsync(string secretName);
}

