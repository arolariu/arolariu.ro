using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

using System.Collections.Generic;

namespace arolariu.Backend.Domain.Invoices.Endpoints;

public static partial class InvoiceEndpoints
{
    /// <summary>
    /// Maps the standard invoice endpoints for the web application.
    /// </summary>
    /// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
    private static void MapStandardInvoiceEndpoints(IEndpointRouteBuilder router)
    {
        router
            .MapPost("/rest/invoices", CreateNewInvoiceAsync)
            .Accepts<CreateInvoiceDto>("application/json")
            .Produces<Invoice>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized) // TODO: authorization
            .ProducesProblem(StatusCodes.Status403Forbidden) // TODO: authentication
            .ProducesProblem(StatusCodes.Status409Conflict) // TODO: implementation
            .ProducesProblem(StatusCodes.Status413PayloadTooLarge) // TODO: implementation
            .ProducesProblem(StatusCodes.Status415UnsupportedMediaType) // TODO: implementation
            .ProducesProblem(StatusCodes.Status429TooManyRequests) // TODO: Rate Limiter
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(CreateNewInvoiceAsync))
            .AllowAnonymous()
            .WithOpenApi();

        router
            .MapGet("/rest/invoices", RetrieveAllInvoicesAsync)
            .Produces<IEnumerable<Invoice>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized) // TODO: authorization
            .ProducesProblem(StatusCodes.Status403Forbidden) // TODO: authentication
            .ProducesProblem(StatusCodes.Status404NotFound) // TODO: implementation
            .ProducesProblem(StatusCodes.Status429TooManyRequests) // TODO: Rate Limiter
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(RetrieveAllInvoicesAsync))
            .WithOpenApi();

        router
            .MapGet("/rest/user/{userIdentifier}/invoices/{id}", RetrieveSpecificInvoiceAsync)
            .Produces<Invoice>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized) // TODO: authorization
            .ProducesProblem(StatusCodes.Status403Forbidden) // TODO: authentication
            .ProducesProblem(StatusCodes.Status404NotFound) // TODO: implementation
            .ProducesProblem(StatusCodes.Status429TooManyRequests) // TODO: Rate Limiter
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(RetrieveSpecificInvoiceAsync))
            .RequireAuthorization()
            .WithOpenApi();

        router
            .MapPut("/rest/user/{userIdentifier}/invoices/{id}", UpdateSpecificInvoiceAsync)
            .Accepts<Invoice>("application/json")
            .Produces<Invoice>(StatusCodes.Status202Accepted)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized) // TODO: authorization
            .ProducesProblem(StatusCodes.Status403Forbidden) // TODO: authentication
            .ProducesProblem(StatusCodes.Status404NotFound) // TODO: implementation
            .ProducesProblem(StatusCodes.Status429TooManyRequests) // TODO: Rate Limiter
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(UpdateSpecificInvoiceAsync))
            .RequireAuthorization()
            .WithOpenApi();

        router
            .MapDelete("/rest/user/{userIdentifier}/invoices/{id}", DeleteInvoiceAsync)
            .Produces<Invoice>(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized) // TODO: authorization
            .ProducesProblem(StatusCodes.Status403Forbidden) // TODO: authentication
            .ProducesProblem(StatusCodes.Status404NotFound) // TODO: implementation
            .ProducesProblem(StatusCodes.Status429TooManyRequests) // TODO: Rate Limiter
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(DeleteInvoiceAsync))
            .RequireAuthorization()
            .WithOpenApi();
    }

    /// <summary>
    /// The invoice analysis endpoints.
    /// </summary>
    /// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
    private static void MapInvoiceAnalysisEndpoints(IEndpointRouteBuilder router)
    {
        router
            .MapPost("/rest/user/{userIdentifier}/invoices/{id}/analyze", AnalyzeInvoiceAsync)
            .Accepts<AnalysisOptionsDto>("application/json")
            .Produces<InvoiceAnalysisResultDto>(StatusCodes.Status202Accepted)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized) // TODO: authorization
            .ProducesProblem(StatusCodes.Status403Forbidden) // TODO: authentication
            .ProducesProblem(StatusCodes.Status404NotFound) // TODO: implementation
            .ProducesProblem(StatusCodes.Status429TooManyRequests) // TODO: Rate Limiter
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(AnalyzeInvoiceAsync))
            .RequireAuthorization()
            .WithOpenApi();
    }
}
