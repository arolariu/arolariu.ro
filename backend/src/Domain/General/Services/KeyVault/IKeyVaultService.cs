using System.Threading.Tasks;

namespace arolariu.Backend.Domain.General.Services.KeyVault;

/// <summary>
/// Interface that handles the Azure Key Vault integration.
/// This interface is used by the <see cref="KeyVaultService"/> class.
/// </summary>
public interface IKeyVaultService
{
    /// <summary>
    /// The method that fetches a Key Vault secret by name, synchronously.
    /// </summary>
    /// <param name="secretName"></param>
    /// <returns>A secret value.</returns>
    public string GetSecret(string secretName);

    /// <summary>
    /// The method that fetches a Key Vault secret by name, asynchronously.
    /// </summary>
    /// <param name="secretName"></param>
    /// <returns>A secret value, retrieved async.</returns>
    public Task<string> GetSecretAsync(string secretName);
}
