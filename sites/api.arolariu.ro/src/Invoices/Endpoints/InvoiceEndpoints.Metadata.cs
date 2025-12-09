namespace arolariu.Backend.Domain.Invoices.Endpoints;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.DTOs.Responses;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using Swashbuckle.AspNetCore.Annotations;

public static partial class InvoiceEndpoints
{
  #region CRUD operations for the Invoice Standard Endpoints
  #region HTTP POST /rest/v1/invoices
  /// <summary>
  /// Creates a new invoice in the system.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="invoiceDto">The data transfer object containing the details of the invoice to be created.</param>
  /// <returns>A task representing the asynchronous operation, containing the result of the creation process.</returns>
  [SwaggerOperation(
    Summary = "Create a new invoice (receipt) in the system.",
    Description = "This endpoint initiates the creation of a new invoice within the Invoice Management System. " +
    "It validates the provided Invoice DTO to ensure all required fields are present and correct. " +
    "Upon successful validation, the invoice is processed and onboarded into the system. " +
    "This operation requires the user to be authenticated and authorized.",
    OperationId = nameof(CreateNewInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status201Created, "The invoice was successfully created in the system.", typeof(InvoiceDetailDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided invoice DTO is invalid. Please check the request body for errors.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "An invoice with the same identifier already exists in the system.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The request payload exceeds the maximum allowed size (1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> CreateNewInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromBody, SwaggerRequestBody("The invoice DTO containing the details for the new invoice.", Required = true)] CreateInvoiceRequestDto invoiceDto);
  #endregion

  #region HTTP GET /rest/v1/invoices/{id}
  /// <summary>
  /// Retrieves a specific invoice by its identifier.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice to retrieve.</param>
  /// <returns>A task representing the asynchronous operation, containing the retrieved invoice.</returns>
  [SwaggerOperation(
    Summary = "Retrieves a specific invoice from the system.",
    Description = "This endpoint retrieves the details of a specific invoice identified by its unique ID. " +
    "The operation checks if the invoice exists and if the authenticated user has the necessary permissions to view it. " +
    "If successful, the invoice details are returned.",
    OperationId = nameof(RetrieveSpecificInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The invoice was successfully retrieved.", typeof(InvoiceDetailDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided invoice identifier is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to access this invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveSpecificInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice to retrieve.", Required = true)] Guid id);
  #endregion

  #region HTTP GET /rest/v1/invoices
  /// <summary>
  /// Retrieves all invoices available to the user.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <returns>A task representing the asynchronous operation, containing the list of invoices.</returns>
  [SwaggerOperation(
    Summary = "Retrieves all invoices from the system.",
    Description = "This endpoint retrieves a list of all invoices available in the Invoice Management System. " +
    "Access to this endpoint is restricted to users with high privileges. " +
    "It returns all invoices that the authenticated user is authorized to view.",
    OperationId = nameof(RetrieveAllInvoicesAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The invoices were successfully retrieved.", typeof(InvoiceSummaryDto[]))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "No invoices were found in the system.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoices could not be retrieved due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveAllInvoicesAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext
    );
  #endregion

  #region HTTP PUT /rest/v1/invoices/{id}
  /// <summary>
  /// Updates a specific invoice by replacing it entirely.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice to update.</param>
  /// <param name="invoicePayload">The new invoice data that will replace the existing invoice.</param>
  /// <returns>A task representing the asynchronous operation, containing the updated invoice.</returns>
  [SwaggerOperation(
    Summary = "Updates a specific invoice in the system.",
    Description = "This endpoint updates an existing invoice in the Invoice Management System by replacing it entirely with the provided payload. " +
    "The operation validates the new invoice data against the schema. " +
    "If the invoice exists and the user has permission, the update is performed.",
    OperationId = nameof(UpdateSpecificInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The invoice was successfully updated.", typeof(InvoiceDetailDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided invoice data is invalid. Please check the request body for errors.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> UpdateSpecificInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice to update.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("The invoice payload that will replace the existing invoice.", Required = true)] UpdateInvoiceDto invoicePayload);
  #endregion

  #region HTTP PATCH /rest/v1/invoices/{id}
  /// <summary>
  /// Patches a specific invoice with partial updates.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice to patch.</param>
  /// <param name="invoicePayload">The partial invoice data to apply as a patch.</param>
  /// <returns>A task representing the asynchronous operation, containing the patched invoice.</returns>
  [SwaggerOperation(
    Summary = "Patches a specific invoice in the system.",
    Description = "This endpoint applies partial updates to an existing invoice in the Invoice Management System. " +
    "It allows modifying specific fields without replacing the entire resource. " +
    "The operation validates the partial data and applies the changes if the invoice exists and the user is authorized.",
    OperationId = nameof(PatchSpecificInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The invoice was successfully patched.", typeof(InvoiceDetailDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided partial invoice data is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> PatchSpecificInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice to patch.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("The partial invoice payload to apply as a patch.", Required = true)] PatchInvoiceDto invoicePayload);
  #endregion

  #region HTTP DELETE /rest/v1/invoices/{id}
  /// <summary>
  /// Deletes a specific invoice by its identifier.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice to delete.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the deletion.</returns>
  [SwaggerOperation(
    Summary = "Deletes a specific invoice from the system.",
    Description = "This endpoint deletes a specific invoice from the Invoice Management System identified by its ID. " +
    "The operation checks if the invoice exists and if the authenticated user has the necessary permissions to delete it. " +
    "Upon success, the invoice is permanently removed.",
    OperationId = nameof(DeleteInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The invoice was successfully deleted.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided invoice identifier is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> DeleteInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice to delete.", Required = true)] Guid id);
  #endregion

  #region HTTP DELETE /rest/v1/invoices
  /// <summary>
  /// Deletes all invoices associated with the authenticated user.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the deletion.</returns>
  [SwaggerOperation(
    Summary = "Deletes all invoices from a specific user in the system.",
    Description = "This endpoint deletes all invoices associated with the currently authenticated user from the Invoice Management System. " +
    "This is a destructive operation that removes all invoice records for the user. " +
    "The operation requires the user to be authenticated and authorized.",
    OperationId = nameof(DeleteInvoicesAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "All invoices were successfully deleted.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The request is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "No invoices were found for the user.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> DeleteInvoicesAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext
    );
  #endregion

  #region HTTP PATCH /rest/v1/invoices/{id}/products
  /// <summary>
  /// Adds a product to a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice to which the product will be added.</param>
  /// <param name="product">The product data to add to the invoice.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the addition.</returns>
  [SwaggerOperation(
    Summary = "Adds a product to a specific invoice in the system.",
    Description = "This endpoint adds a new product to an existing invoice in the Invoice Management System. " +
    "The operation validates the product data and checks if the invoice exists. " +
    "If successful, the product is appended to the invoice's product list.",
    OperationId = nameof(AddProductToInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The product was successfully added to the invoice.", typeof(ProductDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided product data is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "The product already exists in the invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The request payload exceeds the maximum allowed size (1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> AddProductToInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("The product payload to be added to the invoice.", Required = true)] CreateProductRequestDto product);
  #endregion

  #region HTTP GET /rest/v1/invoices/{id}/products
  /// <summary>
  /// Retrieves all products from a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice from which to retrieve products.</param>
  /// <returns>A task representing the asynchronous operation, containing the list of products.</returns>
  [SwaggerOperation(
    Summary = "Retrieves all products from a specific invoice in the system.",
    Description = "This endpoint retrieves the list of products associated with a specific invoice. " +
    "It checks if the invoice exists and if the user has permission to view its contents. " +
    "If successful, an array of products is returned.",
    OperationId = nameof(RetrieveProductsFromInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The products were successfully retrieved.", typeof(ProductDto[]))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided invoice identifier is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to access the products of this invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveProductsFromInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id);
  #endregion

  #region HTTP DELETE /rest/v1/invoices/{id}/products
  /// <summary>
  /// Removes a product from a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice from which to remove the product.</param>
  /// <param name="productDto">The DTO containing the product identifier to remove.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the removal.</returns>
  [SwaggerOperation(
    Summary = "Removes a product from a specific invoice in the system.",
    Description = "This endpoint removes a product identified by its name from a specific invoice. " +
    "The operation checks if the invoice exists and if the product is present in the invoice. " +
    "If successful, the product is removed from the invoice's product list.",
    OperationId = nameof(RemoveProductFromInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The product was successfully removed from the invoice.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided product name is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice or the product was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "The product is not associated with the invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The request payload exceeds the maximum allowed size (1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RemoveProductFromInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("The product identifier to remove.", Required = true)] DeleteProductDto productDto);
  #endregion

  #region HTTP PUT /rest/v1/invoices/{id}/products
  /// <summary>
  /// Updates a product in a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice containing the product.</param>
  /// <param name="productInformation">The updated product DTO containing the product identifier and new data.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the update.</returns>
  [SwaggerOperation(
    Summary = "Updates a product in a specific invoice in the system.",
    Description = "This endpoint updates the details of a specific product within an invoice. " +
    "It identifies the product by name and replaces its data with the provided payload. " +
    "The operation validates the new product data and ensures the product exists in the invoice.",
    OperationId = nameof(UpdateProductInInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The product was successfully updated in the invoice.", typeof(ProductDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided product data is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice or the product was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "The product is not associated with the invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The request payload exceeds the maximum allowed size (1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> UpdateProductInInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("The updated product payload.", Required = true)] UpdateProductDto productInformation);
  #endregion

  #region HTTP GET /rest/v1/invoices/{id}/merchant
  /// <summary>
  /// Retrieves the merchant associated with a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice from which to retrieve the merchant.</param>
  /// <returns>A task representing the asynchronous operation, containing the merchant details.</returns>
  [SwaggerOperation(
    Summary = "Retrieves the merchant from an invoice in the system.",
    Description = "This endpoint retrieves the merchant information associated with a specific invoice. " +
    "It checks if the invoice exists and if the user has permission to view the merchant details. " +
    "If successful, the merchant object is returned.",
    OperationId = nameof(RetrieveMerchantFromInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The merchant was successfully retrieved from the invoice.", typeof(MerchantDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided invoice identifier is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to access the merchant of this invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveMerchantFromInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id);
  #endregion

  #region HTTP POST /rest/v1/invoices/{id}/merchant
  /// <summary>
  /// Adds or updates the merchant associated with an invoice.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice to which the merchant will be added.</param>
  /// <param name="merchantDto">The merchant DTO containing the merchant data to associate with the invoice.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the addition.</returns>
  [SwaggerOperation(
    Summary = "Adds a merchant to an invoice in the system.",
    Description = "This endpoint associates a merchant with a specific invoice in the Invoice Management System. " +
    "It validates the merchant data and checks if the invoice exists. " +
    "If successful, the merchant is linked to the invoice.",
    OperationId = nameof(AddMerchantToInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status201Created, "The merchant was successfully added to the invoice.", typeof(InvoiceDetailDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided merchant data is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "A merchant is already associated with this invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The request payload exceeds the maximum allowed size (1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> AddMerchantToInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("The merchant payload to be associated with the invoice.", Required = true)] AddMerchantToInvoiceDto merchantDto);
  #endregion

  #region HTTP DELETE /rest/v1/invoices/{id}/merchant
  /// <summary>
  /// Removes the merchant associated with a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice from which to remove the merchant.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the removal.</returns>
  [SwaggerOperation(
    Summary = "Removes a merchant from an invoice in the system.",
    Description = "This endpoint removes the association between a merchant and a specific invoice. " +
    "The operation checks if the invoice exists and if a merchant is currently associated with it. " +
    "If successful, the merchant is dissociated from the invoice.",
    OperationId = nameof(RemoveMerchantFromInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The merchant was successfully removed from the invoice.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided invoice identifier is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "No merchant is currently associated with this invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The request payload exceeds the maximum allowed size (1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RemoveMerchantFromInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id);
  #endregion

  #region HTTP POST /rest/v1/invoices/{id}/scans
  /// <summary>
  /// Creates a new scan for a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice to which the scan will be added.</param>
  /// <param name="invoiceScanDto">The invoice scan data to be created.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the creation.</returns>
  [SwaggerOperation(
    Summary = "Creates a new invoice scan in the system.",
    Description = "This endpoint creates a new scan record for a specific invoice in the Invoice Management System. " +
    "It validates the scan data and associates it with the specified invoice. " +
    "The operation ensures the invoice exists and the user is authorized to add scans.",
    OperationId = nameof(CreateInvoiceScanAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status201Created, "The invoice scan was successfully created.", typeof(InvoiceScanDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided invoice scan data is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "An invoice scan with the same identifier already exists.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The request payload exceeds the maximum allowed size (1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> CreateInvoiceScanAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("The invoice scan payload to be created.", Required = true)] CreateInvoiceScanRequestDto invoiceScanDto);
  #endregion

  #region HTTP GET /rest/v1/invoices/{id}/scans
  /// <summary>
  /// Retrieves all scans associated with a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice from which to retrieve scans.</param>
  /// <returns>A task representing the asynchronous operation, containing the list of invoice scans.</returns>
  [SwaggerOperation(
    Summary = "Retrieves all invoice scans from the system.",
    Description = "This endpoint retrieves all scan records associated with a specific invoice. " +
    "It checks if the invoice exists and if the user has permission to view its scans. " +
    "If successful, a list of invoice scans is returned.",
    OperationId = nameof(RetrieveInvoiceScansAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The invoice scans were successfully retrieved.", typeof(InvoiceScanDto[]))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided invoice identifier is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to access the scans of this invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveInvoiceScansAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id);
  #endregion

  #region HTTP DELETE /rest/v1/invoices/{id}/scans/{scanLocationField}
  /// <summary>
  /// Deletes a specific invoice scan.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice.</param>
  /// <param name="scanLocationField">The unique identifier of the scan to delete.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the deletion.</returns>
  [SwaggerOperation(
    Summary = "Deletes a specific invoice scan from the system.",
    Description = "This endpoint deletes a specific invoice scan identified by its ID. " +
    "It ensures the scan belongs to the specified invoice and that the user is authorized to delete it. " +
    "If successful, the invoice scan is permanently removed.",
    OperationId = nameof(DeleteInvoiceScanAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The invoice scan was successfully deleted.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided identifiers are invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice scan with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> DeleteInvoiceScanAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice scan.", Required = true)] string scanLocationField);
  #endregion

  #region HTTP GET /rest/v1/invoices/{id}/metadata
  /// <summary>
  /// Retrieves the metadata associated with a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice from which to retrieve metadata.</param>
  /// <returns>A task representing the asynchronous operation, containing the invoice metadata.</returns>
  [SwaggerOperation(
    Summary = "Retrieves the metadata from a specific invoice in the system.",
    Description = "This endpoint retrieves the metadata key-value pairs associated with a specific invoice. " +
    "It checks if the invoice exists and if the user has permission to view its metadata. " +
    "If successful, a dictionary of metadata is returned.",
    OperationId = nameof(RetrieveInvoiceMetadataAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The metadata was successfully retrieved.", typeof(IDictionary<string, string>))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided invoice identifier is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to access the metadata of this invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveInvoiceMetadataAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id);
  #endregion

  #region HTTP PATCH /rest/v1/invoices/{id}/metadata
  /// <summary>
  /// Patches the metadata of a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice.</param>
  /// <param name="invoiceMetadataPatch">The metadata key-value pairs to add or update.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the patch.</returns>
  [SwaggerOperation(
    Summary = "Patches the metadata from a specific invoice in the system.",
    Description = "This endpoint updates or adds metadata key-value pairs to a specific invoice. " +
    "It validates the metadata patch and ensures the invoice exists. " +
    "If successful, the invoice metadata is updated.",
    OperationId = nameof(PatchInvoiceMetadataAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The metadata was successfully patched.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided metadata patch is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> PatchInvoiceMetadataAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("The metadata key-value pairs to apply as a patch.", Required = true)] PatchMetadataDto invoiceMetadataPatch);
  #endregion

  #region HTTP DELETE /rest/v1/invoices/{id}/metadata
  /// <summary>
  /// Deletes specific metadata keys from a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling invoice logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice.</param>
  /// <param name="metadataKeys">The list of metadata keys to remove.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the deletion.</returns>
  [SwaggerOperation(
    Summary = "Deletes specific metadata keys from a specific invoice in the system.",
    Description = "This endpoint removes specific metadata keys from a specific invoice. " +
    "It validates the list of keys and ensures the invoice exists. " +
    "If successful, the specified metadata keys are removed from the invoice.",
    OperationId = nameof(DeleteInvoiceMetadataAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The metadata keys were successfully deleted.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided metadata keys are invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> DeleteInvoiceMetadataAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("The list of metadata keys to delete.", Required = true)] DeleteMetadataDto metadataKeys);
  #endregion
  #endregion

  #region CRUD operations for the Merchant Standard Endpoints
  #region HTTP POST /rest/v1/merchants
  /// <summary>
  /// Creates a new merchant in the system.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling merchant logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="merchantDto">The merchant data transfer object containing the details of the merchant to create.</param>
  /// <returns>A task representing the asynchronous operation, containing the created merchant identifier.</returns>
  [SwaggerOperation(
    Summary = "Creates a new merchant in the system.",
    Description = "This endpoint creates a new merchant in the Invoice Management System. " +
    "It validates the merchant data provided in the DTO and ensures the user has permission to create merchants. " +
    "If successful, the identifier of the newly created merchant is returned.",
    OperationId = nameof(CreateNewMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status201Created, "The merchant was successfully created.", typeof(MerchantDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided merchant data is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to create a merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "A merchant with the same details already exists.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The request payload is too large. Please reduce the size of the request.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> CreateNewMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromBody, SwaggerRequestBody("The merchant data transfer object.", Required = true)] CreateMerchantRequestDto merchantDto);
  #endregion

  #region HTTP GET /rest/v1/merchants
  /// <summary>
  /// Retrieves all merchants from the system, optionally filtered by parent company.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling merchant logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="parentCompanyId">The unique identifier of the parent company to filter merchants by.</param>
  /// <returns>A task representing the asynchronous operation, containing a list of merchants.</returns>
  [SwaggerOperation(
    Summary = "Retrieves all merchants from the system.",
    Description = "This endpoint retrieves all merchants from the Invoice Management System. " +
    "It allows filtering by a parent company identifier. " +
    "If successful, a list of merchants matching the criteria is returned.",
    OperationId = nameof(RetrieveAllMerchantsAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The merchants were successfully retrieved.", typeof(IEnumerable<MerchantDto>))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to access the list of merchants.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveAllMerchantsAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromQuery, SwaggerParameter("The parent company identifier used as a filter.", Required = true)] Guid parentCompanyId);
  #endregion

  #region HTTP GET /rest/v1/merchants/{id}
  /// <summary>
  /// Retrieves a specific merchant by its identifier.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling merchant logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the merchant to retrieve.</param>
  /// <param name="parentCompanyId">The unique identifier of the parent company to validate against.</param>
  /// <returns>A task representing the asynchronous operation, containing the retrieved merchant.</returns>
  [SwaggerOperation(
    Summary = "Retrieves a specific merchant from the system.",
    Description = "This endpoint retrieves a specific merchant from the Invoice Management System. " +
    "It checks if the merchant exists and if the user has permission to view it. " +
    "If successful, the merchant details are returned.",
    OperationId = nameof(RetrieveSpecificMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The merchant was successfully retrieved.", typeof(MerchantDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided merchant identifier is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to access this merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The merchant with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveSpecificMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the merchant.", Required = true)] Guid id,
    [FromQuery, SwaggerParameter("The parent company identifier used as a filter.", Required = false)] Guid? parentCompanyId);
  #endregion

  #region HTTP PUT /rest/v1/merchants/{id}
  /// <summary>
  /// Updates a specific merchant in the system.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling merchant logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the merchant to update.</param>
  /// <param name="merchantPayload">The updated merchant object.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the update.</returns>
  [SwaggerOperation(
    Summary = "Updates a specific merchant in the system.",
    Description = "This endpoint updates a specific merchant in the Invoice Management System. " +
    "It validates the updated merchant data and ensures the merchant exists. " +
    "If successful, the merchant is updated.",
    OperationId = nameof(UpdateSpecificMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The merchant was successfully updated.", typeof(MerchantDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided merchant data is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to update this merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The merchant with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> UpdateSpecificMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the merchant.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("The updated merchant object.", Required = true)] UpdateMerchantDto merchantPayload);
  #endregion

  #region HTTP DELETE /rest/v1/merchants/{id}
  /// <summary>
  /// Deletes a specific merchant from the system.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling merchant logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the merchant to delete.</param>
  /// <param name="parentCompanyId">The unique identifier of the parent company to validate against.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the deletion.</returns>
  [SwaggerOperation(
    Summary = "Deletes a specific merchant from the system.",
    Description = "This endpoint deletes a specific merchant from the Invoice Management System. " +
    "It ensures the merchant exists and the user has permission to delete it. " +
    "If successful, the merchant is removed from the system.",
    OperationId = nameof(DeleteMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The merchant was successfully deleted.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided merchant identifier is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to delete this merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The merchant with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> DeleteMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the merchant.", Required = true)] Guid id,
    [FromQuery, SwaggerParameter("The parent company identifier used as a filter.", Required = true)] Guid parentCompanyId);
  #endregion

  #region HTTP GET /rest/v1/merchants/{id}/invoices
  /// <summary>
  /// Retrieves all invoices associated with a specific merchant.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling merchant logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the merchant.</param>
  /// <returns>A task representing the asynchronous operation, containing a list of invoices.</returns>
  [SwaggerOperation(
    Summary = "Retrieves all invoices from a specific merchant in the system.",
    Description = "This endpoint retrieves all invoices associated with a specific merchant in the Invoice Management System. " +
    "It ensures the merchant exists and the user has permission to view the invoices. " +
    "If successful, a list of invoices is returned.",
    OperationId = nameof(RetrieveInvoicesFromMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The invoices were successfully retrieved.", typeof(IEnumerable<InvoiceSummaryDto>))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided merchant identifier is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to access the invoices from this merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The merchant with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveInvoicesFromMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the merchant.", Required = true)] Guid id);
  #endregion

  #region HTTP PATCH /rest/v1/merchants/{id}/invoices
  /// <summary>
  /// Adds one or more invoices to a specific merchant.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling merchant logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the merchant.</param>
  /// <param name="invoiceIdentifiers">The list of invoice identifiers to add.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the addition.</returns>
  [SwaggerOperation(
    Summary = "Adds invoice(s) to a specific merchant in the system.",
    Description = "This endpoint associates one or more invoices with a specific merchant in the Invoice Management System. " +
    "It validates the invoice identifiers and ensures the merchant exists. " +
    "If successful, the invoices are added to the merchant.",
    OperationId = nameof(AddInvoiceToMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The invoice(s) were successfully added to the merchant.", typeof(MerchantDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided merchant identifier or invoice identifiers are invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to add invoices to this merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The merchant with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "One or more invoices are already associated with the merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The request payload is too large. Please reduce the number of invoice identifiers.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> AddInvoiceToMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the merchant.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("The list of invoice identifiers to associate with the merchant.", Required = true)] MerchantInvoicesDto invoiceIdentifiers);
  #endregion

  #region HTTP DELETE /rest/v1/merchants/{id}/invoices
  /// <summary>
  /// Removes one or more invoices from a specific merchant.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling merchant logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the merchant.</param>
  /// <param name="invoiceIdentifiers">The list of invoice identifiers to remove.</param>
  /// <returns>A task representing the asynchronous operation, indicating the result of the removal.</returns>
  [SwaggerOperation(
    Summary = "Removes invoice(s) from a specific merchant in the system.",
    Description = "This endpoint removes the association between one or more invoices and a specific merchant in the Invoice Management System. " +
    "It validates the invoice identifiers and ensures the merchant exists. " +
    "If successful, the invoices are removed from the merchant.",
    OperationId = nameof(RemoveInvoiceFromMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The invoice(s) were successfully removed from the merchant.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided merchant identifier or invoice identifiers are invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to remove invoices from this merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The merchant with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "One or more invoices are not associated with the merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The request payload is too large. Please reduce the number of invoice identifiers.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RemoveInvoiceFromMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the merchant.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("The list of invoice identifiers to detach from the merchant.", Required = true)] MerchantInvoicesDto invoiceIdentifiers);
  #endregion

  #region HTTP GET /rest/v1/merchants/{id}/products
  /// <summary>
  /// Retrieves all products associated with a specific merchant.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling merchant logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the merchant.</param>
  /// <returns>A task representing the asynchronous operation, containing a list of products.</returns>
  [SwaggerOperation(
    Summary = "Retrieves all products from a specific merchant in the system.",
    Description = "This endpoint retrieves all products associated with a specific merchant in the Invoice Management System. " +
    "It ensures the merchant exists and the user has permission to view the products. " +
    "If successful, a list of products is returned.",
    OperationId = nameof(RetrieveProductsFromMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The products were successfully retrieved.", typeof(IEnumerable<ProductDto>))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided merchant identifier is invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to access the products from this merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The merchant with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveProductsFromMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the merchant.", Required = true)] Guid id);
  #endregion
  #endregion

  /// <summary>
  /// Analyzes a specific invoice using AI/ML services.
  /// </summary>
  /// <param name="invoiceProcessingService">The invoice processing service responsible for handling analysis logic.</param>
  /// <param name="httpContext">The HTTP context accessor for accessing request information.</param>
  /// <param name="id">The unique identifier of the invoice to analyze.</param>
  /// <param name="options">The options for the analysis (e.g., detailed, basic).</param>
  /// <returns>A task representing the asynchronous operation, containing the analysis result.</returns>
  [SwaggerOperation(
    Summary = "Analyzes a specific invoice in the system.",
    Description = "This endpoint triggers an analysis of a specific invoice using AI/ML services. " +
    "It allows specifying analysis options to control the depth and type of analysis. " +
    "If successful, the analysis result is returned.",
    OperationId = nameof(AnalyzeInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The invoice analysis has been accepted and is processing.", typeof(InvoiceDetailDto))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The provided invoice identifier or analysis options are invalid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "The user is not authorized to analyze this invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status402PaymentRequired, "The user does not have enough credits to perform this analysis.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "The user is not authenticated. Please provide valid credentials.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice with the specified identifier was not found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "The user has exceeded the rate limit. Please try again later.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "An internal server error occurred while processing the request.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> AnalyzeInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("The unique identifier of the invoice.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("The analysis options to configure the pipeline.", Required = true)] AnalyzeInvoiceDto options);
}

