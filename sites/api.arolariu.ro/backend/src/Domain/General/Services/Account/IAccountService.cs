using arolariu.Backend.Core.Domain.General.DTOs;

using System.IdentityModel.Tokens.Jwt;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.General.Services.Account;

/// <summary>
/// Interface that defines the account service.
/// </summary>
public partial interface IAccountService
{

    /// <summary>
    /// Method that validates if the account information is strong - security-speaking.
    /// </summary>
    /// <param name="accountInformation"></param>
    /// <returns></returns>
    public Task ValidateAccountInformationIsStrong(CreateNewAccountWithJwtDto accountInformation);
}
