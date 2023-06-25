using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Models;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

using System.Collections;
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
            .MapGet("/api/invoices", RetrieveAllInvoicesAsync)
            .WithName(nameof(RetrieveAllInvoicesAsync))
            .Produces<IEnumerable<Invoice>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();

        router
            .MapPost("/api/invoices", CreateNewInvoiceAsync)
            .WithName(nameof(CreateNewInvoiceAsync))
            .Accepts<PostedInvoiceDto>("application/json")
            .Produces<Invoice>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();

        router
            .MapGet("/api/invoices/{id}", RetrieveSpecificInvoiceAsync)
            .WithName(nameof(RetrieveSpecificInvoiceAsync))
            .Produces<Invoice>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();

        router
            .MapDelete("/api/invoices/{id}", DeleteInvoiceAsync)
            .WithName(nameof(DeleteInvoiceAsync))
            .Produces<IResult>(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();
    }

    /// <summary>
    /// Maps the invoice metadata endpoints for the web application.
    /// </summary>
    /// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
    private static void MapMetadataInvoiceEndpoints(IEndpointRouteBuilder router)
    {
        router
            .MapGet("/api/invoices/{id}/metadata", RetrieveInvoiceMetadataAsync)
            .WithName(nameof(RetrieveInvoiceMetadataAsync))
            .Produces<InvoiceMetadata>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();

        router
            .MapPatch("/api/invoices/{id}/metadata", PatchInvoiceMetadataAsync)
            .WithName(nameof(PatchInvoiceMetadataAsync))
            .Produces<InvoiceMetadata>(StatusCodes.Status202Accepted)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();

        router
            .MapDelete("/api/invoices/{id}/metadata", DeleteInvoiceMetadataAsync)
            .WithName(nameof(DeleteInvoiceMetadataAsync))
            .Produces<IResult>(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();
    }

    private static void MapMerchantInvoiceEndpoints(IEndpointRouteBuilder router)
    {
        router
            .MapGet("/api/invoices/{id}/merchant", RetrieveInvoiceMerchantInformationAsync)
            .WithName(nameof(RetrieveInvoiceMerchantInformationAsync))
            .Produces<InvoiceMerchantInformation>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();

        router
            .MapPut("/api/invoices/{id}/merchant", PutInvoiceMerchantInformationAsync)
            .WithName(nameof(PutInvoiceMerchantInformationAsync))
            .Accepts<InvoiceMerchantInformation>("application/json")
            .Produces<InvoiceMerchantInformation>(StatusCodes.Status202Accepted)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();

        router
            .MapDelete("/api/invoices/{id}/merchant", DeleteInvoiceMerchantInformationAsync)
            .WithName(nameof(DeleteInvoiceMerchantInformationAsync))
            .Produces<IResult>(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();
    }

    private static void MapTimeInvoiceEndpoints(IEndpointRouteBuilder router)
    {
        router
            .MapGet("/api/invoices/{id}/time", RetrieveInvoiceTimeInformationAsync)
            .WithName(nameof(RetrieveInvoiceTimeInformationAsync))
            .Produces<InvoiceTimeInformation>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();

        router
            .MapPut("/api/invoices/{id}/time", UpdateInvoiceTimeInformationAsync)
            .WithName(nameof(UpdateInvoiceTimeInformationAsync))
            .Accepts<InvoiceTimeInformation>("application/json")
            .Produces<InvoiceTimeInformation>(StatusCodes.Status202Accepted)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();

        router
            .MapDelete("/api/invoices/{id}/time", DeleteInvoiceTimeInformationAsync)
            .WithName(nameof(DeleteInvoiceTimeInformationAsync))
            .Produces<IResult>(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();
    }

    private static void MapInvoiceItemsEndpoints(IEndpointRouteBuilder router)
    {
        router
            .MapGet("/api/invoices/{id}/items", RetrieveInvoiceItemsAsync)
            .WithName(nameof(RetrieveInvoiceItemsAsync))
            .Produces<InvoiceItemsInformation>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();

        router
            .MapDelete("/api/invoices/{id}/items", DeleteInvoiceItemsAsync)
            .WithName(nameof(DeleteInvoiceItemsAsync))
            .Produces<IResult>(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();
    }

    /// <summary>
    /// Maps the invoice extra endpoints for the web application.
    /// </summary>
    /// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
    private static void MapExtraInvoiceEndpoints(IEndpointRouteBuilder router)
    {
        router
            .MapPost("/api/invoices/{id}/analyze", AnalyzeInvoiceAsync)
            .WithName(nameof(AnalyzeInvoiceAsync))
            .Produces<IResult>(StatusCodes.Status202Accepted)
            .ProducesValidationProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();

        router
            .MapGet("/api/invoices/{id}/status", RetrieveSpecificInvoiceStatus)
            .WithName(nameof(RetrieveSpecificInvoiceStatus))
            .Produces<InvoiceStatus>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithOpenApi();
    }
}
