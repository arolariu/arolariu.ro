﻿using arolariu.Backend.Core.Domain.Invoices.DTOs;
using arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

using System.Collections.Generic;

namespace arolariu.Backend.Core.Domain.Invoices.Endpoints;

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
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status413PayloadTooLarge)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(CreateNewInvoiceAsync))
            .WithOpenApi();

        router
            .MapGet("/rest/invoices/{id}", RetrieveSpecificInvoiceAsync)
            .Produces<Invoice>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(RetrieveSpecificInvoiceAsync))
            .WithOpenApi();

        router
            .MapGet("/rest/invoices", RetrieveAllInvoicesAsync)
            .Produces<IEnumerable<Invoice>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(RetrieveAllInvoicesAsync))
            .WithOpenApi();

        router
            .MapPut("/rest/invoices/{id}", UpdateSpecificInvoiceAsync)
            .Accepts<Invoice>("application/json")
            .Produces<Invoice>(StatusCodes.Status202Accepted)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(UpdateSpecificInvoiceAsync))
            .WithOpenApi();

        router
            .MapDelete("/rest/invoices/{id}", DeleteInvoiceAsync)
            .Produces<IResult>(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithName(nameof(DeleteInvoiceAsync))
            .WithOpenApi();
    }
}
