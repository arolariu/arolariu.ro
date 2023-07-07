using arolariu.Backend.Core.Domain.Invoices.DTOs;
using arolariu.Backend.Core.Domain.Invoices.Foundation;
using arolariu.Backend.Core.Domain.Invoices.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using Swashbuckle.AspNetCore.Annotations;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Endpoints;

public static partial class InvoiceEndpoints
{
    #region /api/invoices <-- General invoice endpoints
    #region HTTP GET /api/invoices
    /// <summary>
    /// Retrieve all invoices from the service.
    /// This handler will retrieve all invoices (analyzed and NOT-analyzed) from the service database.
    /// </summary>
    /// <param name="invoiceFoundationService">The <see cref="IInvoiceFoundationService"/> injected foundation service.</param>
    /// <returns>An <see cref="IResult"/> representing the HTTP response.</returns>
    [SwaggerOperation(
        Summary = "Retrieve all invoices from the service' underlying database." + "",
        Description = "This HTTP GET request will trigger the following workflow:" +
                    "\n1. Retrieve the invoices entity entries connected to the SQL Broker service." +
                    "\n2. Return the invoices entry list as an IEnumerable<Invoice> to the caller.",
        OperationId = nameof(RetrieveAllInvoicesAsync) + "",
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status200OK, "The invoices were successfully retrieved from the underlying database.", typeof(IEnumerable<Invoice>), "application/json")]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoices could NOT be retrieved because of an internal server error..", typeof(ProblemDetails))]
    private static async Task<IResult> RetrieveAllInvoicesAsync(
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var invoices = await sqlBroker.RetrieveAllInvoices();
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
    #endregion
    #region HTTP POST /api/invoices
    /// <summary>
    /// Post an invoice to the service.
    /// This handler will create an invoice entry in the underlying database.
    /// </summary>
    /// <param name="postedInvoiceDto">The <see cref="PostedInvoiceDto"/> containing the invoice information.</param>
    /// <param name="invoiceFoundationService">The <see cref="IInvoiceFoundationService"/> used for invoice processing.</param>
    /// <returns>An <see cref="IResult"/> representing the result of the operation.</returns>
    [SwaggerOperation(
        Summary = "Post an invoice to the service." + "",
        Description = "This HTTP POST request will trigger the following workflow:" +
                    "\n1. Map the given request body to an actual invoice object." +
                    "\n2. Upload the invoice photo to a storage service via the Storage Broker." +
                    "\n3. Upload the invoice data as an entry to the database via the SQL Broker." +
                    "\n4. Return the location of the created resource (invoice) to the caller.",
        OperationId = nameof(CreateNewInvoiceAsync) + "",
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status201Created, "The invoice object was successfully sent for analysis.", typeof(Invoice), "application/json")]
    [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice object could NOT be created.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> CreateNewInvoiceAsync(
        [FromBody] PostedInvoiceDto postedInvoiceDto,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var invoice = InvoiceMapper.MapPostedInvoiceDtoToActualInvoice(postedInvoiceDto);
            if (invoice.InvoiceImage is null)
                return Results.BadRequest("Please provide a base64-encoded image in your payload!");

            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var storageBroker = invoiceFoundationService.InvoiceStorageService;

            await storageBroker.UploadInvoicePhotoToBlobStorage(invoice);
            await sqlBroker.InsertNewInvoice(invoice);
            return Results.Created($"api/invoices/{invoice.InvoiceId}", invoice);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice could NOT be created due to an internal service error.");
        }
    }
    #endregion
    #region HTTP GET /api/invoices/{id}
    /// <summary>
    /// Retrieve an invoice from the service.
    /// The invoice will be retrieved from an Azure SQL database.
    /// </summary>
    /// <param name="id">The identifier of the invoice to retrieve.</param>
    /// <param name="invoiceFoundationService"></param>
    /// <returns>An <see cref="IResult"/> representing the result of the operation.</returns>
    [SwaggerOperation(
        Summary = "Retrieve an invoice from the service." + "\nThe invoice will be retrieved from an Azure SQL database." + "",
        Description = "This HTTP GET request will trigger the following workflow:" +
                   "\n1. The invoice will be retrieved from the SQL Broker service, based on the given identifier." +
                   "\n2. The resource (invoice) will then be returned to the caller, if found.",
        OperationId = nameof(RetrieveSpecificInvoiceAsync) + "",
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status200OK, "The invoice was successfully retrieved.", typeof(Invoice))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> RetrieveSpecificInvoiceAsync(
        [FromRoute] Guid id,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var invoice = await sqlBroker.RetrieveSpecificInvoice(id);
            if (invoice is not null && invoice.InvoiceId != Guid.Empty) return Results.Ok(invoice);
            else return Results.NotFound($"The invoice with id {id} was NOT found in the database.");
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice could NOT be retrieved due to an internal service error.");
        }
    }
    #endregion
    #region HTTP DELETE /api/invoices/{id}
    /// <summary>
    /// Delete an invoice from the service.
    /// This handler will delete the invoice entry from the service database based on the given identifier.
    /// </summary>
    /// <param name="id">The identifier of the invoice to be deleted.</param>
    /// <param name="invoiceFoundationService">The <see cref="IInvoiceFoundationService"/> injected foundation service.</param>
    /// <returns>An <see cref="IResult"/> representing the HTTP response.</returns>
    [SwaggerOperation(
        Summary = "Delete an invoice from the service." + "",
        Description = "This HTTP DELETE request will trigger the following workflow:" +
                    "\n1. Delete the invoice entry, if present, via the SQL Broker service, based on the given identifier." +
                    "\n2. Return the request result back to the caller (status 204 or status 404).",
        OperationId = nameof(DeleteInvoiceAsync) + "",
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status204NoContent, "The invoice was successfully deleted from the database.")]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> DeleteInvoiceAsync(
    [FromRoute] Guid id,
    [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var invoiceWasDeleted = await sqlBroker.DeleteSpecificInvoice(id);
            if (invoiceWasDeleted) return Results.Ok("Deleted invoice with id: " + id);
            else return Results.NotFound($"The invoice with id {id} was NOT found in the database.");
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice could NOT be deleted due to an internal service error.");
        }
    }
    #endregion
    #endregion

    #region /api/invoices/{id}/metadata <-- Metadata invoice endpoints
    #region HTTP GET /api/invoices/{id}/metadata
    [SwaggerOperation(
        Summary = "Retrieve the metadata of an invoice from the service." + "",
        Description = "This HTTP GET request will trigger the following workflow:" +
                    "\n1. Retrieve the metadata of the invoice, if present, via the SQL Broker service, based on the given identifier." +
                    "\n2. Return the request result (resource or 404) back to the caller.",
        OperationId = nameof(RetrieveInvoiceMetadataAsync) + "",
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status200OK, "The invoice metadata was successfully retrieved.", typeof(InvoiceMetadata))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice metadata was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> RetrieveInvoiceMetadataAsync(
        [FromRoute] Guid id,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var invoiceMetadata = await sqlBroker.RetrieveSpecificInvoiceMetadata(id);
            if (!InvoiceMetadata.VerifyInvoiceMetadataStructIsNull(invoiceMetadata)) return Results.Ok(invoiceMetadata);
            else return Results.NotFound($"The invoice metadata associated with invoice id {id} was NOT found in the database.");
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice metadata could NOT be created due to an internal service error.");
        }
    }
    #endregion
    #region HTTP PATCH /api/invoices/{id}/metadata
    [SwaggerOperation(
        Summary = "Update the metadata of an invoice in the service." + "",
        Description = "This HTTP Patch request will trigger the following workflow:" +
                    "\n1. Update the metadata of the invoice, if present, via the SQL Broker service, based on the given identifier." +
                    "\n2. Return the request result back to the caller.",
        OperationId = nameof(PatchInvoiceMetadataAsync) + "",
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status202Accepted, "The invoice metadata was successfully updated.", typeof(InvoiceMetadata))]
    [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided invoice metadata was invalid.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice metadata was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> PatchInvoiceMetadataAsync(
        [FromRoute] Guid id,
        [FromBody] KeyValuePair<string, object> metadata,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var currentMetadata = await sqlBroker.RetrieveSpecificInvoiceMetadata(id);
            var updatedMetadata = currentMetadata.AddMetadata(metadata);

            var metadataWasUpdated = await sqlBroker.UpdateSpecificInvoiceMetadata(id, updatedMetadata);
            if (metadataWasUpdated) return Results.Accepted<InvoiceMetadata>(value: updatedMetadata);
            else return Results.NotFound($"The invoice metadata associated with invoice id {id} was NOT found in the database.");
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice metadata could NOT be updated due to an internal service error.");
        }
    }
    #endregion
    #region HTTP DELETE /api/invoices/{id}/metadata
    [SwaggerOperation(
        Summary = "Delete a metadata key from an invoice present in the service." + "",
        Description = "This HTTP DELETE request will trigger the following workflow:" +
                    "\n1. Delete the metadata key from the invoice, if present, via the SQL Broker service, based on the given identifier." +
                    "\n2. Return the request result back to the caller.",
        OperationId = nameof(DeleteInvoiceMetadataAsync),
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status200OK, "The invoice metadata was successfully deleted.", typeof(InvoiceMetadata))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice metadata was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> DeleteInvoiceMetadataAsync(
        [FromRoute] Guid id,
        [FromBody] string key,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var currentMetadata = await sqlBroker.RetrieveSpecificInvoiceMetadata(id);
            var updatedMetadata = currentMetadata.RemoveMedata(key);

            var invoiceMetadataWasDeleted = await sqlBroker.DeleteSpecificInvoiceMetadata(id, key);
            if (invoiceMetadataWasDeleted) return Results.Ok<InvoiceMetadata>(value: updatedMetadata);
            else return Results.NotFound($"The invoice metadata associated with invoice id {id} was NOT found in the database.");
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice metadata could NOT be updated due to an internal service error.");
        }
    }
    #endregion
    #endregion

    #region /api/invoices/{id}/merchant <-- Merchant information invoice endpoints
    #region HTTP GET /api/invoices/{id}/merchant
    [SwaggerOperation(
        Summary = "Retrieve the merchant information of an invoice from the service.",
        Description = "This HTTP GET request will trigger the following workflow:" +
                    "\n1. Retrieve the merchant information of the invoice, if present, via the SQL Broker service, based on the given identifier." +
                    "\n2. Return the request result (resource or 404) back to the caller.",
        OperationId = nameof(RetrieveInvoiceMerchantInformationAsync),
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status200OK, "The invoice merchant information was successfully retrieved.", typeof(InvoiceMerchantInformation))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice merchant information was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> RetrieveInvoiceMerchantInformationAsync(
        [FromRoute] Guid id,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var merchantInformation = await sqlBroker.RetrieveMerchantInformation(id);

            if (!InvoiceMerchantInformation.CheckInvoiceMerchantInformationStructIsNull(merchantInformation)) return Results.Ok(merchantInformation);
            else return Results.NotFound($"The invoice merchant information associated with invoice id {id} was NOT found in the database.");
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice merchant information could NOT be retrieved due to an internal service error.");
        }
    }
    #endregion
    #region HTTP PUT /api/invoices/{id}/merchant
    [SwaggerOperation(
        Summary = "Update the merchant information of an invoice in the service.",
        Description = "This HTTP PUT request will trigger the following workflow:" +
                    "\n1. Update the merchant information of the invoice, if present, via the SQL Broker service, based on the given identifier." +
                    "\n2. Return the request result (resource or 404) back to the caller.",
        OperationId = nameof(PutInvoiceMerchantInformationAsync),
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status200OK, "The invoice merchant information was successfully updated.", typeof(InvoiceMerchantInformation))]
    [SwaggerResponse(StatusCodes.Status400BadRequest, "Please provide a valid JSON payload!", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice merchant information was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> PutInvoiceMerchantInformationAsync(
        [FromRoute] Guid id,
        [FromBody] InvoiceMerchantInformation merchantInformation,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            if (InvoiceMerchantInformation.CheckInvoiceMerchantInformationStructIsNull(merchantInformation))
                return Results.BadRequest("Please provide a valid, non-empty JSON payload that respects the merchant information structure schema!");

            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var merchantInformationWasUpdated = await sqlBroker.UpdateMerchantInformation(id, merchantInformation);

            if (merchantInformationWasUpdated) return Results.Ok(merchantInformation);
            else return Results.NotFound($"The invoice merchant information associated with invoice id {id} was NOT found in the database.");
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice merchant information could NOT be updated due to an internal service error.");
        }
    }
    #endregion
    #region HTTP DELETE /api/invoices/{id}/merchant
    [SwaggerOperation(
        Summary = "Delete the merchant information of an invoice in the service.",
        Description = "This HTTP DELETE request will trigger the following workflow:" +
                    "\n1. Delete the merchant information of the invoice, if present, via the SQL Broker service, based on the given identifier." +
                    "\n2. Return the request status code result (204 or 404) back to the caller.",
        OperationId = nameof(DeleteInvoiceMerchantInformationAsync),
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status204NoContent, "The invoice merchant information was successfully deleted.")]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice merchant information was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> DeleteInvoiceMerchantInformationAsync(
        [FromRoute] Guid id,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var merchantInformationWasDeleted = await sqlBroker.DeleteMerchantInformation(id);

            if (merchantInformationWasDeleted) return Results.NoContent();
            else return Results.NotFound($"The invoice merchant information associated with invoice id {id} was NOT found in the database.");
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice merchant information could NOT be deleted due to an internal service error.");
        }
    }
    #endregion
    #endregion

    #region /api/invoices/{id}/time <-- Time information invoice endpoints
    #region HTTP GET /api/invoices/{id}/time
    [SwaggerOperation(
        Summary = "Retrieve the time information of an invoice from the service.",
        Description = "This HTTP GET request will trigger the following workflow:" +
                   "\n1. Retrieve the time information of the invoice, if present, via the SQL Broker service, based on the given identifier." +
                   "\n2. Return the request result (resource or 404) back to the caller.",
        OperationId = nameof(RetrieveInvoiceTimeInformationAsync),
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status200OK, "The invoice time information was successfully retrieved.", typeof(InvoiceTimeInformation))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice time information was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> RetrieveInvoiceTimeInformationAsync(
        [FromRoute] Guid id,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var invoiceTimeInformation = await sqlBroker.RetrieveTimeInformation(id);

            if (invoiceTimeInformation != InvoiceTimeInformation.CreateNullInvoiceTimeInformation()) return Results.Ok(invoiceTimeInformation);
            else return Results.NotFound($"The invoice time information associated with invoice id {id} was NOT found in the database.");
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice time information could NOT be retrieved due to an internal service error.");
        }
    }
    #endregion
    #region HTTP PUT /api/invoices/{id}/time
    [SwaggerOperation(
        Summary = "Update the time information of an invoice in the service.",
        Description = "This HTTP PUT request will trigger the following workflow:" +
                           "\n1. Update the time information of the invoice via the SQL Broker service, based on the given identifier." +
                           "\n2. Return the request result back to the caller.",
        OperationId = nameof(UpdateInvoiceTimeInformationAsync),
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status200OK, "The invoice time information was successfully updated.", typeof(InvoiceTimeInformation))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice time information was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> UpdateInvoiceTimeInformationAsync(
        [FromRoute] Guid id,
        [FromBody] InvoiceTimeInformation timeInformation,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var invoiceTimeInformationWasUpdated = await sqlBroker.UpdateTimeInformation(id, timeInformation);

            if (invoiceTimeInformationWasUpdated) return Results.Ok(timeInformation);
            else return Results.NotFound($"The invoice time information associated with invoice id {id} was NOT found in the database.");
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice time information could NOT be updated due to an internal service error.");
        }
    }
    #endregion
    #region HTTP DELETE /api/invoices/{id}/time
    [SwaggerOperation(
        Summary = "Delete the time information of an invoice in the service.",
        Description = "This HTTP DELETE request will trigger the following workflow:" +
                    "\n1. Delete the time information of the invoice, if present, via the SQL Broker service, based on the given identifier." +
                    "\n2. Return the request status code result (204 or 404) back to the caller.",
        OperationId = nameof(DeleteInvoiceTimeInformationAsync),
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status204NoContent, "The invoice time information was successfully deleted.")]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice time information was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> DeleteInvoiceTimeInformationAsync(
        [FromRoute] Guid id,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var invoiceInformationWasDeleted = await sqlBroker.DeleteTimeInformation(id);

            if (invoiceInformationWasDeleted) return Results.NoContent();
            else return Results.NotFound($"The invoice time information associated with invoice id {id} was NOT found in the database.");
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice time information could NOT be deleted due to an internal service error.");
        }
    }
    #endregion
    #endregion

    #region /api/invoices/{id}/items <-- Invoice items inforomation endpoints
    #region HTTP GET /api/invoices/{id}/items
    [SwaggerOperation(
        Summary = "Retrieve the items information of an invoice from the service.",
        Description = "This HTTP GET request will trigger the following workflow:" +
                    "\n1. Retrieve the items information of the invoice, if present, via the SQL Broker service, based on the given identifier." +
                    "\n2. Return the request result (resource or 404) back to the caller.",
        OperationId = nameof(RetrieveInvoiceItemsAsync),
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status200OK, "The invoice items information was successfully retrieved.", typeof(InvoiceItemsInformation))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice items information was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> RetrieveInvoiceItemsAsync(
        [FromRoute] Guid id,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var invoiceItemsInformation = await sqlBroker.RetrieveInvoiceItems(id);

            if (!InvoiceItemsInformation.CheckInvoiceItemsInformationStructIsNull(invoiceItemsInformation)) return Results.Ok(invoiceItemsInformation);
            else return Results.NotFound($"The invoice items information associated with invoice id {id} was NOT found in the database.");
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice items information could NOT be retrieved due to an internal service error.");
        }
    }
    #endregion
    #region HTTP DELETE /api/invoices/{id}/items 
    [SwaggerOperation(
        Summary = "Delete the items information of an invoice from the service.",
        Description = "This HTTP DELETE request will trigger the following workflow:" +
                    "\n1. Delete the items information of the invoice, if present, via the SQL Broker service, based on the given identifier." +
                    "\n2. Return the request status code result (204 or 404) back to the caller.",
        OperationId = nameof(DeleteInvoiceItemsAsync),
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status204NoContent, "The invoice items information was successfully deleted.")]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice items information was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> DeleteInvoiceItemsAsync(
        [FromRoute] Guid id,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var invoiceDeleted = await sqlBroker.DeleteInvoiceItems(id);
            if (invoiceDeleted) return Results.NoContent();
            else return Results.NotFound();
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice items information could NOT be deleted due to an internal service error.");
        }
    }
    #endregion
    #endregion

    #region /api/invoices/{id}/[extra] <-- Extra (optional) invoice endpoints
    #region HTTP POST /api/invoices/{id}/analyze
    [SwaggerOperation(
        Summary = "Analyze an invoice in the service.",
        Description = "This HTTP GET request will trigger the following workflow:" +
                    "\n1. Retrieve the invoice, if present, via the SQL Broker service, based on the given identifier." +
                    "\n2. Analyze the invoice, if present, via the Invoice Reader service, based on the given identifier." +
                    "\n3. Update the invoice, if present, via the SQL Broker service, based on the given identifier." +
                    "\n4. Return the request status code result (202 or 402) back to the caller.",
        OperationId = nameof(AnalyzeInvoiceAsync),
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status202Accepted, "The invoice was successfully sent for analysis.")]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> AnalyzeInvoiceAsync(
        [FromRoute] Guid id,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var invoice = await sqlBroker.RetrieveSpecificInvoice(id);

            if (invoice is not null)
            {
                // Implement the invoice foundation service logic here.
                _ = Task.Run(async () => await invoiceFoundationService.SendInvoiceForAnalysis(invoice));

                return Results.Accepted($"/api/invoices/{id}/status", "Invoice sent for analysis, please check the status at the provided URI." +
                    $"\nLocation: /api/invoices/{id}/status");
            }
            else
            {
                return Results.NotFound();
            }
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message + ex.Source,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "The invoice could NOT be analyzed due to an internal service error.");
        }
    }
    #endregion
    #region HTTP GET /api/invoices/{id}/status
    [SwaggerOperation(
        Summary = "Retrieve the status of an invoice in the service.",
        Description = "This HTTP GET request will trigger the following workflow:" +
                           "\n1. Retrieve the invoice, if present, via the SQL Broker service, based on the given identifier." +
                           "\n2. Return the request result (resource or 404) back to the caller.",
        OperationId = nameof(RetrieveSpecificInvoiceStatus),
        Tags = new string[] { EndpointNameTag })]
    [SwaggerResponse(StatusCodes.Status200OK, "The invoice status was successfully retrieved.", typeof(InvoiceStatus))]
    [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice status was NOT found in the database.", typeof(ProblemDetails))]
    [SwaggerResponse(StatusCodes.Status500InternalServerError, "The backend could not handle your request at this time.", typeof(ProblemDetails))]
    private static async Task<IResult> RetrieveSpecificInvoiceStatus(
        [FromRoute] Guid id,
        [FromServices] IInvoiceFoundationService invoiceFoundationService)
    {
        try
        {
            var sqlBroker = invoiceFoundationService.InvoiceSqlBroker;
            var invoiceStatus = await sqlBroker.RetrieveInvoiceStatus(id);
            if (!InvoiceStatus.CheckInvoiceStatusStructIsNull(invoiceStatus)) return Results.Ok(invoiceStatus);
            else return Results.NotFound($"The invoice status associated with invoice id {id} was NOT found in the database.");
        }
        catch (Exception ex)
        {
            return Results.Problem(
               detail: ex.Message + ex.Source,
               statusCode: StatusCodes.Status500InternalServerError,
               title: "The invoice status could NOT be retrieved due to an internal service error.");
        }
    }
    #endregion
    #endregion
}