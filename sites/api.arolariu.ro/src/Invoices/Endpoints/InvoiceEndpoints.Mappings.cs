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
            .Produces<IResult>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized) // TODO: authorization
            .ProducesProblem(StatusCodes.Status403Forbidden) // TODO: authentication
            .ProducesProblem(StatusCodes.Status409Conflict) // TODO: implementation
            .ProducesProblem(StatusCodes.Status413PayloadTooLarge) // TODO: implementation
            .ProducesProblem(StatusCodes.Status415UnsupportedMediaType) // TODO: implementation
            .ProducesProblem(StatusCodes.Status429TooManyRequests) // TODO: Rate Limiter
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(CreateNewInvoiceAsync))
            .WithOpenApi();

        router
            .MapGet("/rest/invoices", RetrieveAllInvoicesAsync)
            .Produces<IEnumerable<Invoice>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized) // TODO: authorization
            .ProducesProblem(StatusCodes.Status403Forbidden) // TODO: authentication
            .ProducesProblem(StatusCodes.Status429TooManyRequests) // TODO: Rate Limiter
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(RetrieveAllInvoicesAsync))
            .WithOpenApi();

        router
            .MapGet("/rest/invoices/{id}", RetrieveSpecificInvoiceAsync)
            .Produces<Invoice>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized) // TODO: authorization
            .ProducesProblem(StatusCodes.Status403Forbidden) // TODO: authentication
            .ProducesProblem(StatusCodes.Status404NotFound) // TODO: implementation
            .ProducesProblem(StatusCodes.Status429TooManyRequests) // TODO: Rate Limiter
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(RetrieveSpecificInvoiceAsync))
            .WithOpenApi();

        router
            .MapPost("/rest/invoices/{id}/analyze", AnalyzeInvoiceAsync)
            .Accepts<AnalysisOptionsDto>("application/json")
            .Produces<IResult>(StatusCodes.Status202Accepted)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized) // TODO: authorization
            .ProducesProblem(StatusCodes.Status403Forbidden) // TODO: authentication
            .ProducesProblem(StatusCodes.Status404NotFound) // TODO: implementation
            .ProducesProblem(StatusCodes.Status429TooManyRequests) // TODO: Rate Limiter
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(AnalyzeInvoiceAsync))
            .WithOpenApi();

        router
            .MapPut("/rest/invoices/{id}", UpdateSpecificInvoiceAsync)
            .Accepts<Invoice>("application/json")
            .Produces<Invoice>(StatusCodes.Status202Accepted)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized) // TODO: authorization
            .ProducesProblem(StatusCodes.Status403Forbidden) // TODO: authentication
            .ProducesProblem(StatusCodes.Status404NotFound) // TODO: implementation
            .ProducesProblem(StatusCodes.Status429TooManyRequests) // TODO: Rate Limiter
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(UpdateSpecificInvoiceAsync))
            .WithOpenApi();

        router
            .MapDelete("/rest/invoices/{id}", DeleteInvoiceAsync)
            .Produces<IResult>(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized) // TODO: authorization
            .ProducesProblem(StatusCodes.Status403Forbidden) // TODO: authentication
            .ProducesProblem(StatusCodes.Status404NotFound) // TODO: implementation
            .ProducesProblem(StatusCodes.Status429TooManyRequests) // TODO: Rate Limiter
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(DeleteInvoiceAsync))
            .WithOpenApi();
    }
}
