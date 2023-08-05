using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace arolariu.Backend.Core.Domain.General.Endpoints;

public partial class GeneralEndpoints
{
    private static void MapAuthEndpoints(IEndpointRouteBuilder router)
    {
        router
            .MapPost("/auth/JWT/sign-up", SignUpUsingJwtAsync)
            .WithName(nameof(SignUpUsingJwtAsync))
            .Accepts<SignUpUsingJwtDto>("application/json")
            .Produces<SignUpUsingJwtResultDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();

        router
            .MapPost("/auth/JWT/sign-in", SignInUsingJwtAsync)
            .WithName(nameof(SignInUsingJwtAsync))
            .Accepts<SignInUsingJwtDto>("application/json")
            .Produces<SignInUsingJwtResultDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();

        router
            .MapGet("/auth/JWT/validate", ValidateJwtInformationAsync)
            .WithName(nameof(ValidateJwtInformationAsync))
            .Produces<ValidateJwtInformationResultDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();
    }
}
