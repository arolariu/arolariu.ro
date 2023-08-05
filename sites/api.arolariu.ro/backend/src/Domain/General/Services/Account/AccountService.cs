using arolariu.Backend.Core.Domain.General.DTOs;

using System.IdentityModel.Tokens.Jwt;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.General.Services.Account;

/// <summary>
/// Class that implements the account service contract.
/// </summary>
public class AccountService : IAccountService
{
    /// <inheritdoc/>
    public Task AuthenticateAccountAsync(JwtSecurityToken jwt)
    {
        throw new System.NotImplementedException();
    }

    /// <inheritdoc/>
    public Task AuthorizeAccountAsync(JwtSecurityToken jwt)
    {
        throw new System.NotImplementedException();
    }

    /// <inheritdoc/>
    public Task RegisterAccountAsync(CreateNewAccountWithJwtDto accountDto)
    {
        throw new System.NotImplementedException();
    }

    /// <inheritdoc/>
    public Task ValidateJwtAccountAsync(JwtSecurityToken jwt)
    {
        throw new System.NotImplementedException();
    }
}
