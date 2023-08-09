using arolariu.Backend.Core.Domain.Invoices.DTOs;
using arolariu.Backend.Core.Domain.Invoices.Entities.Invoice;
using arolariu.Backend.Core.Domain.Invoices.Services.Foundation;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Endpoints;

public static partial class InvoiceEndpoints
{
    /// <summary>
    /// Creates a new invoice.
    /// </summary>
    /// <param name="invoiceFoundationService"></param>
    /// <param name="invoiceDto"></param>
    /// <returns></returns>
    private static async Task<IResult> CreateNewInvoiceAsync(
        [FromServices] IInvoiceFoundationService invoiceFoundationService,
        [FromBody] CreateInvoiceDto invoiceDto)
    {
        try
        {
            var invoice = await invoiceFoundationService.ConvertDtoToEntity(invoiceDto);
            await invoiceFoundationService.CreateInvoiceObject(invoice);
            return Results.Created($"/rest/invoices/{invoice.id}", invoice);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoices could NOT be retrieved due to an internal service error.");
        }
    }

    /// <summary>
    /// Retrieves a specific invoice.
    /// </summary>
    /// <param name="invoiceFoundationService"></param>
    /// <param name="id"></param>
    /// <returns></returns>
    private static async Task<IResult> RetrieveSpecificInvoiceAsync(
        [FromServices] IInvoiceFoundationService invoiceFoundationService,
        [FromRoute] Guid id)
    {
        try
        {
            var invoice = await invoiceFoundationService.ReadInvoiceObject(id);
            return Results.Ok(invoice);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoices could NOT be retrieved due to an internal service error.");
        }
    }

    /// <summary>
    /// Retrieves all invoices.
    /// </summary>
    /// <param name="invoiceFoundationService"></param>
    /// <returns></returns>
    private static async Task<IResult> RetrieveAllInvoicesAsync(
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var invoices = await invoiceFoundationService.ReadAllInvoiceObjects();
            return Results.Ok(invoices);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoices could NOT be retrieved due to an internal service error.");
        }
    }

    /// <summary>
    /// Updates a specific invoice.
    /// </summary>
    /// <param name="invoiceFoundationService"></param>
    /// <param name="id"></param>
    /// <param name="invoicePayload"></param>
    /// <returns></returns>
    private static async Task<IResult> UpdateSpecificInvoiceAsync(
        [FromServices] IInvoiceFoundationService invoiceFoundationService,
        [FromRoute] Guid id,
        [FromBody] Invoice invoicePayload)
    {
        try
        {
            // TODO: make this route RESTful.
            Console.WriteLine("Updating invoice with identifier: " + id);
            await invoiceFoundationService.UpdateInvoiceObject(invoicePayload);
            return Results.Accepted();
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoices could NOT be retrieved due to an internal service error.");
        }
    }

    /// <summary>
    /// Deletes a specific invoice.
    /// </summary>
    /// <param name="invoiceFoundationService"></param>
    /// <param name="id"></param>
    /// <returns></returns>
    private static async Task<IResult> DeleteInvoiceAsync(
        [FromServices] IInvoiceFoundationService invoiceFoundationService,
        [FromRoute] Guid id)
    {
        try
        {
            await invoiceFoundationService.DeleteInvoiceObject(id);
            return Results.NoContent();
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoices could NOT be retrieved due to an internal service error.");
        }
    }

}