using arolariu.Backend.Core.Domain.General.DTOs;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using Swashbuckle.AspNetCore.Annotations;

using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.General.Endpoints;

public partial class GeneralEndpoints
{
    #region AUTH JWT endpoints
    
    /// <summary>
    /// Method that accepts a <see cref="CreateNewAccountWithJwtDto"/> and creates a new account in the database, then returns a JWT."/>
    /// </summary>
    /// <param name="accountDto"></param>
    /// <returns></returns>
    [SwaggerOperation(
        Summary =  "Sign up using JWT",
        Description = "Sign up using JWT",
        OperationId = nameof(SignUpUsingJwtAsync),
        Tags = new[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status200OK, "The account was created successfully.")]
    [SwaggerResponse(StatusCodes.Status400BadRequest, "The account could not be created.")]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred.")]
    public async Task SignUpUsingJwtAsync(
        [FromBody]
        [SwaggerRequestBody(
        Description = "The account information.",
        Required = true)] 
        CreateNewAccountWithJwtDto accountDto)
    {
        var validationError = ValidateIfPayloadIsSecure(accountDto);
        if (validationError is not null) return Results.BadRequest(validationError);


    }

    public async Task SignInUsingJwtAsync()
    {

    }

    public async Task ValidateJwtInformationAsync()
    {

    }
    #endregion
}
