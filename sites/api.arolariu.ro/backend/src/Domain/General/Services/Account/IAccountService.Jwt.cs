using arolariu.Backend.Core.Domain.General.DTOs;
using System.IdentityModel.Tokens.Jwt;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.General.Services.Account;

public partial interface IAccountService
{
    /// <summary>
    /// Method that registers a new account with JWT-based security.
    /// </summary>
    /// <param name="accountDto"></param>
    /// <returns></returns>
    public Task RegisterAccountAsync(CreateNewAccountWithJwtDto accountDto);

    /// <summary>
    /// Method that authenticates an account with JWT-based security.
    /// </summary>
    /// <param name="jwt"></param>
    /// <returns></returns>
    public Task AuthenticateAccountAsync(JwtSecurityToken jwt);

    /// <summary>
    /// Method that authorizes an account with JWT-based security.
    /// </summary>
    /// <param name="jwt"></param>
    /// <returns></returns>
    public Task AuthorizeAccountAsync(JwtSecurityToken jwt);

    /// <summary>
    /// Method that validates an account with JWT-based security.
    /// </summary>
    /// <param name="jwt"></param>
    /// <returns></returns>
    public Task ValidateJwtAccountAsync(JwtSecurityToken jwt);
}
