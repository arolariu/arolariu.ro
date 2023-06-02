﻿using Azure.AI.FormRecognizer.DocumentAnalysis;
using ContainerBackend.Domain.General.Services.KeyVault;
using ContainerBackend.Domain.Invoices.DTOs;
using ContainerBackend.Domain.Invoices.Services;
using ContainerBackend.Domain.Invoices.Services.InvoiceReader;
using ContainerBackend.Domain.Invoices.Services.InvoiceStorage;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Swashbuckle.AspNetCore.Annotations;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ContainerBackend.Domain.Invoices.Endpoints
{
    /// <summary>
    /// The invoice endpoints.
    /// </summary>
    public static class InvoiceEndpoints
    {

        /// <summary>
        /// The map invoice endpoints static method, called by the app builder.
        /// </summary>
        /// <param name="router"></param>
        public static void MapInvoiceEndpoints(this IEndpointRouteBuilder router)
        {
            router
                .MapPost("/api/invoices", PostInvoiceForAnalysis)
                .WithName(nameof(PostInvoiceForAnalysis))
                .Accepts<PostedInvoiceDto>("application/json")
                .Produces<IReadOnlyList<DocumentTable>>(StatusCodes.Status201Created)
                .ProducesProblem(StatusCodes.Status400BadRequest)
                .ProducesProblem(StatusCodes.Status500InternalServerError)
                .WithOpenApi();

            router
                .MapGet("/api/invoices/{id}", RetrieveInvoiceAsync)
                .WithName(nameof(RetrieveInvoiceAsync))
                .Produces<RetrievedInvoiceDto>(StatusCodes.Status200OK)
                .ProducesProblem(StatusCodes.Status404NotFound)
                .ProducesProblem(StatusCodes.Status500InternalServerError)
                .WithOpenApi();
        }

        [SwaggerOperation(
            Summary = "Post an invoice to the service." +
                    "\nThe invoice will be scanned, analyzed and stored in an Azure SQL database.",
            Description = "The HTTP POST request will trigger the following workflow:" +
                        "\n1. Invoice Analysis service, using Azure Cognitive Services." +
                        "\n2. Invoice Compression service, using Magick8 compression service." +
                        "\n3. Invoice will be saved to an Azure SQL database after analysis & compression.",
            OperationId = nameof(PostInvoiceForAnalysis),
            Tags = new string[] { "Invoices" })]
        [SwaggerResponse(StatusCodes.Status201Created, "The invoice object was successfully sent for analysis.", typeof(PostedInvoiceDto))]
        [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice object could NOT be created.", typeof(ProblemDetails))]
        [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
        private static async Task<IResult> PostInvoiceForAnalysis(
            PostedInvoiceDto invoicePhoto,
            IInvoiceStorageService storageService,
            IInvoiceReaderService readerService)
        {
            var blobUri = storageService.UploadInvoiceBlobToBlobStorage(invoicePhoto);
            var detectedInvoiceTables = await readerService.SendInvoiceForAnalysis(blobUri);
            return Results.Ok(detectedInvoiceTables);
        }

        [SwaggerOperation(
            Summary = "Retrieve an invoice from the service." +
                    "\nThe invoice will be retrieved from an Azure SQL database.",
            Description = "The HTTP GET request will trigger the following workflow:" +
                       "\n1. Invoice retrieval from an Azure SQL database.",
            OperationId = nameof(RetrieveInvoiceAsync),
            Tags = new string[] { "Invoices" })]
        [SwaggerResponse(StatusCodes.Status200OK, "The invoice was successfully retrieved.", typeof(RetrievedInvoiceDto))]
        [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice was NOT found in the database.", typeof(ProblemDetails))]
        [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
        private static async Task<IResult> RetrieveInvoiceAsync([FromRoute] Guid id)
        {
            await Task.Delay(1000);
            return Results.Ok("Received the id: " + id);
        }
    }
}
