using arolariu.Backend.Core.Domain.Invoices.DTOs;
using arolariu.Backend.Core.Domain.Invoices.Entities.Invoices;
using arolariu.Backend.Core.Domain.Invoices.Services.Orchestration;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using Swashbuckle.AspNetCore.Annotations;

using System;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Endpoints;

public static partial class InvoiceEndpoints
{
    /// <summary>
    /// Creates a new invoice.
    /// </summary>
    /// <param name="invoiceOrchestrationService"></param>
    /// <param name="invoiceDto"></param>
    /// <returns></returns>
    [SwaggerOperation(
        Summary = "Create a new invoice in the system.",
        Description = "Creates a new invoice. This endpoint will validate that the input (Invoice DTO) is valid, and then will perform a series of operations to onboard the invoice onto the invoice management system.",
        OperationId = nameof(CreateNewInvoiceAsync),
        Tags = new[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status201Created, "The invoice was created successfully.", typeof(Invoice))]
    [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice DTO (payload) is not valid.", typeof(ValidationProblemDetails))]
    [SwaggerResponse(StatusCodes.Status403Forbidden, "The invoice could not be created due to insufficient permissions.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status409Conflict, "The invoice could not be created due to a conflict (there's another invoice with the same id).", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The invoice could not be created due to the payload (photo field) being too large.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice could not be created due to an internal service error.", typeof(ProblemDetails))]
    private static async Task<IResult> CreateNewInvoiceAsync(
        [FromServices] IInvoiceOrchestrationService invoiceOrchestrationService,
        [FromBody] CreateInvoiceDto invoiceDto)
    {
        try
        {
            var invoice = await invoiceOrchestrationService.CreateInvoiceObjectFromDto(invoiceDto);
            return Results.Created($"/rest/invoices/{invoice.id}", invoice);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoices could NOT be created due to an internal service error.");
        }
    }

    /// <summary>
    /// Analyzes a specific invoice.
    /// </summary>
    /// <param name="id"></param>
    /// <param name="options"></param>
    /// <param name="invoiceOrchestrationService"></param>
    /// <returns></returns>
    [SwaggerOperation(
        Summary = "Analyzes a specific invoice from the system.",
        Description = "Analyzes a specific invoice from the system. If the invoice identifier passed to the route is valid, the invoice management system will return the invoice, given that the user is allowed to see this invoice.",
        OperationId = nameof(AnalyzeInvoiceAsync),
        Tags = new[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status202Accepted, "The invoice was analyzed successfully.", typeof(Invoice))]
    [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice identifier is not valid.", typeof(ValidationProblemDetails))]
    [SwaggerResponse(StatusCodes.Status403Forbidden, "The invoice could not be analyzed due to insufficient permissions.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice could not be analyzed due to the invoice not being found.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice could not be analyzed due to an internal service error.", typeof(ProblemDetails))]
    private static async Task<IResult> AnalyzeInvoiceAsync(
        [FromRoute] Guid id,
        [FromBody] InvoiceAnalysisOptionsDto options,
        [FromServices] IInvoiceOrchestrationService invoiceOrchestrationService)
    {
        try
        {
            await invoiceOrchestrationService.AnalyzeInvoiceWithOptions(id, options);
            return Results.Accepted(value: $"Invoice with id: {id} sent for analysis.");
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
    /// <param name="invoiceOrchestrationService"></param>
    /// <param name="id"></param>
    /// <returns></returns>
    [SwaggerOperation(
        Summary = "Retrieves a specific invoice from the system.",
        Description = "Retrieves a specific invoice from the system. If the invoice identifier passed to the route is valid, the invoice management system will return the invoice, given that the user is allowed to see this invoice.",
        OperationId = nameof(RetrieveSpecificInvoiceAsync),
        Tags = new[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status200OK, "The invoice was retrieved successfully.", typeof(Invoice))]
    [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice identifier is not valid.", typeof(ValidationProblemDetails))]
    [SwaggerResponse(StatusCodes.Status403Forbidden, "The invoice could not be retrieved due to insufficient permissions.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice could not be retrieved due to the invoice not being found.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice could not be retrieved due to an internal service error.", typeof(ProblemDetails))]
    private static async Task<IResult> RetrieveSpecificInvoiceAsync(
        [FromServices] IInvoiceOrchestrationService invoiceOrchestrationService,
        [FromRoute] Guid id)
    {
        try
        {
            var invoice = await invoiceOrchestrationService.ReadInvoiceObject(id);
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
    /// <param name="invoiceOrchestrationService"></param>
    /// <returns></returns>
    [SwaggerOperation(
        Summary = "Retrieves all invoices from the system.",
        Description = "Retrieves all invoices from the system. If the user is allowed to see all invoices, the invoice management system will return all invoices.",
        OperationId = nameof(RetrieveAllInvoicesAsync),
        Tags = new[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status200OK, "The invoices were retrieved successfully.", typeof(Invoice[]))]
    [SwaggerResponse(StatusCodes.Status403Forbidden, "The invoices could not be retrieved due to insufficient permissions.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoices could not be retrieved due to an internal service error.", typeof(ProblemDetails))]
    private static async Task<IResult> RetrieveAllInvoicesAsync(
        [FromServices] IInvoiceOrchestrationService invoiceOrchestrationService)
    {
        try
        {
            var invoices = await invoiceOrchestrationService.ReadAllInvoiceObjects();
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
    /// <param name="invoiceOrchestrationService"></param>
    /// <param name="id"></param>
    /// <param name="invoicePayload"></param>
    /// <returns></returns>
    [SwaggerOperation(
        Summary = "Updates a specific invoice in the system.",
        Description = "Updates a specific invoice.",
        OperationId = nameof(UpdateSpecificInvoiceAsync),
        Tags = new[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status202Accepted, "The invoice was updated successfully.", typeof(Invoice))]
    [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice identifier is not valid.", typeof(ValidationProblemDetails))]
    [SwaggerResponse(StatusCodes.Status403Forbidden, "The invoice could not be updated due to insufficient permissions.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice could not be updated due to the invoice not being found.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice could not be updated due to an internal service error.", typeof(ProblemDetails))]
    private static async Task<IResult> UpdateSpecificInvoiceAsync(
        [FromServices] IInvoiceOrchestrationService invoiceOrchestrationService,
        [FromRoute] Guid id,
        [FromBody] Invoice invoicePayload)
    {
        try
        {
            // TODO: make this route RESTful.
            Console.WriteLine("Updating invoice with identifier: " + id);
            await invoiceOrchestrationService.UpdateInvoiceObject(invoicePayload);
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
    /// <param name="invoiceOrchestrationService"></param>
    /// <param name="id"></param>
    /// <returns></returns>
    [SwaggerOperation(
        Summary = "Deletes a specific invoice from the system.",
        Description = "Deletes a specific invoice from the system. If the invoice identifier passed to the route is valid, the invoice management system will delete the invoice, given that the user is allowed to delete this invoice.",
        OperationId = nameof(DeleteInvoiceAsync),
        Tags = new[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status204NoContent, "The invoice was deleted successfully.")]
    [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice identifier is not valid.", typeof(ValidationProblemDetails))]
    [SwaggerResponse(StatusCodes.Status403Forbidden, "The invoice could not be deleted due to insufficient permissions.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice could not be deleted due to the invoice not being found.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice could not be deleted due to an internal service error.", typeof(ProblemDetails))]
    private static async Task<IResult> DeleteInvoiceAsync(
        [FromServices] IInvoiceOrchestrationService invoiceOrchestrationService,
        [FromRoute] Guid id)
    {
        try
        {
            await invoiceOrchestrationService.DeleteInvoiceObject(id);
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
