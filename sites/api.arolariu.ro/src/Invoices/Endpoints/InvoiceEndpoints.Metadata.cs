namespace arolariu.Backend.Domain.Invoices.Endpoints;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;
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
  /// Creates a new invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="invoiceDto"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Create a new invoice (receipt) in the system.",
    Description = "This request will create a new invoice in the Invoice Management System. " +
    "This endpoint will validate that the input (Invoice DTO) is valid, " +
    "and then will perform a series of operations to onboard the invoice into the Invoice Management System.",
    OperationId = nameof(CreateNewInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status201Created, "The invoice was created successfully in the system.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice DTO (payload) is not valid. Please respect the request body.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to create a new invoice in the system.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate with a valid account.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "The invoice could not be created due to a conflict (there is another invoice with the same id).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The invoice could not be created due to the payload being too large (keep the request under 1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice could not be created due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> CreateNewInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromBody, SwaggerRequestBody("The invoice DTO to pass.")] CreateInvoiceDto invoiceDto);
  #endregion

  #region HTTP GET /rest/v1/invoices/{id}
  /// <summary>
  /// Retrieves a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Retrieves a specific invoice from the system.",
    Description = "Retrieves a specific invoice from the Invoice Management System. " +
    "If the invoice identifier passed into the route is valid, the server will retrieve the invoice, given that the user is allowed to see this invoice.",
    OperationId = nameof(RetrieveSpecificInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The invoice was retrieved successfully from the system.", typeof(Invoice))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice identifier is not valid. Please input a valid identifier.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to access this invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate with a valid account.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice could not be retrieved due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice could not be retrieved due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveSpecificInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id);
  #endregion

  #region HTTP GET /rest/v1/invoices
  /// <summary>
  /// Retrieves all invoices.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Retrieves all invoices from the system.",
    Description = "Retrieves all invoices from the Invoice Management System. " +
    "If the user is allowed to see all invoices, the server will retrieve all invoices. " +
    "This is a high-privillege request.",
    OperationId = nameof(RetrieveAllInvoicesAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The invoices were retrieved successfully from the system.", typeof(Invoice[]))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate before hitting this route.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoices could not be found.", typeof(ProblemDetails))]
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
  /// Updates a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="invoicePayload"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Updates a specific invoice in the system.",
    Description = "This route will allow you to updates a specific invoice from the Invoice Managemnet System.",
    OperationId = nameof(UpdateSpecificInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The invoice was updated successfully.", typeof(Invoice))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice information is not valid (please respect the invoice schema).", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate before hitting this endpoint.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice could not be updated due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice could not be updated due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> UpdateSpecificInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("Invoice payload replacing the stored invoice.")] Invoice invoicePayload);
  #endregion

  #region HTTP PATCH /rest/v1/invoices/{id}
  /// <summary>
  /// Patches a specific invoice, given a partial invoice payload.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="invoicePayload"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Patches a specific invoice in the system.",
    Description = "This route will allow you to patch a specific invoice from the Invoice Managemnet System.",
    OperationId = nameof(PatchSpecificInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The invoice was patched successfully.", typeof(Invoice))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice information is not valid (please respect the invoice schema).", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate before hitting this endpoint.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice could not be patched due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice could not be patched due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> PatchSpecificInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("Partial invoice payload applied as a patch.")] Invoice invoicePayload);
  #endregion

  #region HTTP DELETE /rest/v1/invoices/{id}
  /// <summary>
  /// Deletes a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Deletes a specific invoice from the system.",
    Description = "Deletes a specific invoice from the Invoice Management System. " +
    "If the invoice identifier passed to the route is valid, the server will delete the invoice, given that the user is allowed to delete this invoice.",
    OperationId = nameof(DeleteInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The invoice was deleted successfully.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice identifier is not valid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate before hitting this endpoint.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice could not be deleted due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice could not be deleted due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> DeleteInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id);
  #endregion

  #region HTTP DELETE /rest/v1/invoices
  /// <summary>
  /// Deletes all invoices from a specific user.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Deletes all invoices from a specific user in the system.",
    Description = "Deletes all invoices from a specific user in the Invoice Management System. " +
    "If the user identifier passed to the route is valid, the server will delete all invoices from that user, given that the user is allowed to delete these invoices.",
    OperationId = nameof(DeleteInvoicesAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The invoices were deleted successfully.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The user identifier is not valid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate before hitting this endpoint.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoices could not be deleted due to the user not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoices could not be deleted due to an internal service error.", typeof(ProblemDetails))]
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
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="product"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Adds a product to a specific invoice in the system.",
    Description = "Adds a product to a specific invoice in the Invoice Management System. " +
    "If the invoice identifier passed to the route is valid, the server will add the product to the invoice, given that the user is allowed to add products to this invoice.",
    OperationId = nameof(AddProductToInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The product was added to the invoice successfully.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The product information is not valid (please respect the product schema).", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The product could not be added to the invoice due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "The product could not be added to the invoice due to a conflict (the product is already in the invoice).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The product could not be added to the invoice due to the payload being too large (keep the request under 1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The product could not be added to the invoice due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> AddProductToInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("Product payload that will be appended to the invoice.")] Product product);
  #endregion

  #region HTTP GET /rest/v1/invoices/{id}/products
  /// <summary>
  /// Retrieves all products from a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Retrieves all products from a specific invoice in the system.",
    Description = "Retrieves all products from a specific invoice in the Invoice Management System. " +
    "If the invoice identifier passed to the route is valid, the server will retrieve all products from the invoice, given that the user is allowed to see the products.",
    OperationId = nameof(RetrieveProductsFromInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The products were retrieved successfully from the invoice.", typeof(Product[]))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice identifier is not valid. Please input a valid identifier.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to access the products from this invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate with a valid account.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The products could not be retrieved due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The products could not be retrieved due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveProductsFromInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id);
  #endregion

  #region HTTP DELETE /rest/v1/invoices/{id}/products
  /// <summary>
  /// Removes a product from a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="productName"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Removes a product from a specific invoice in the system.",
    Description = "Removes a product from a specific invoice in the Invoice Management System. " +
    "If the invoice identifier passed to the route is valid, the server will remove the product from the invoice, given that the user is allowed to remove products from this invoice.",
    OperationId = nameof(RemoveProductFromInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The product was removed from the invoice successfully.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The product information is not valid (please respect the product schema).", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The product could not be removed from the invoice due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "The product could not be removed from the invoice due to a conflict (the product is not in the invoice).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The product could not be removed from the invoice due to the payload being too large (keep the request under 1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The product could not be deleted due to an internal service error", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RemoveProductFromInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("Product name that will be removed from the invoice.")] string productName);
  #endregion

  #region HTTP PUT /rest/v1/invoices/{id}/products
  /// <summary>
  /// Updates a product in a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="productName"></param>
  /// <param name="productInformation"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Updates a product in a specific invoice in the system.",
    Description = "Updates a product in a specific invoice in the Invoice Management System. " +
    "If the invoice identifier passed to the route is valid, the server will update the product in the invoice, given that the user is allowed to update products in this invoice.",
    OperationId = nameof(UpdateProductInInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The product was updated in the invoice successfully.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The product information is not valid (please respect the product schema).", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The product could not be updated in the invoice due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "The product could not be updated in the invoice due to a conflict (the product is not in the invoice).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The product could not be updated in the invoice due to the payload being too large (keep the request under 1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The product could not be updated due to an internal service error", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> UpdateProductInInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id,
    [FromQuery, SwaggerParameter("Name of the product targeted for update.", Required = true)] string productName,
    [FromBody, SwaggerRequestBody("Updated product payload applied to the invoice.")] Product productInformation);
  #endregion

  #region HTTP GET /rest/v1/invoices/{id}/merchant
  /// <summary>
  /// Retrieves the merchant from an invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Retrieves the merchant from an invoice in the system.",
    Description = "Retrieves the merchant from an invoice in the Invoice Management System. " +
    "If the invoice identifier passed to the route is valid, the server will retrieve the merchant from the invoice, given that the user is allowed to see the merchant.",
    OperationId = nameof(RetrieveMerchantFromInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The merchant was retrieved successfully from the invoice.", typeof(Merchant))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice identifier is not valid. Please input a valid identifier.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to access the merchant from this invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate with a valid account.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The merchant could not be retrieved due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The merchant could not be retrieved due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveMerchantFromInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id);
  #endregion

  #region HTTP POST /rest/v1/invoices/{id}/merchant
  /// <summary>
  /// Adds a merchant to an invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="merchant"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Adds a merchant to an invoice in the system.",
    Description = "Adds a merchant to an invoice in the Invoice Management System. " +
    "If the invoice identifier passed to the route is valid, the server will add the merchant to the invoice, given that the user is allowed to add merchants to this invoice.",
    OperationId = nameof(AddMerchantToInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status201Created, "The merchant was added to the invoice successfully.", typeof(Invoice))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The merchant information is not valid (please respect the merchant schema).", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The merchant could not be added to the invoice due to either not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "The merchant could not be added to the invoice due to a conflict.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The merchant could not be added to the invoice due to the payload being too large (keep the request under 1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The merchant could not be added to the invoice due to an internal service error", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> AddMerchantToInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("Merchant payload that will be associated with the invoice.")] Merchant merchant);
  #endregion

  #region HTTP DELETE /rest/v1/invoices/{id}/merchant
  /// <summary>
  /// Removes a merchant from an invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Removes a merchant from an invoice in the system.",
    Description = "Removes a merchant from an invoice in the Invoice Management System. " +
    "If the invoice identifier passed to the route is valid, the server will remove the merchant from the invoice, given that the user is allowed to remove merchants from this invoice.",
    OperationId = nameof(RemoveMerchantFromInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The merchant was removed from the invoice successfully.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The merchant information is not valid (please respect the merchant schema).", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The merchant could not be removed from the invoice due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "The merchant could not be removed from the invoice due to a conflict (the merchant is not in the invoice).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The merchant could not be removed from the invoice due to the payload being too large (keep the request under 1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The merchant could not be removed from the invoice due to an internal service error", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RemoveMerchantFromInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id);
  #endregion

  #region HTTP POST /rest/v1/invoices/{id}/scan
  /// <summary>
  /// Creates a new invoice scan.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="invoiceScanDto"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Creates a new invoice scan in the system.",
    Description = "This request will create a new invoice scan in the Invoice Management System. " +
    "This endpoint will validate that the input (Invoice Scan DTO) is valid, " +
    "and then will perform a series of operations to onboard the invoice scan into the Invoice Management System.",
    OperationId = nameof(CreateInvoiceScanAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status201Created, "The invoice scan was created successfully in the system.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice scan DTO (payload) is not valid. Please respect the request body.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to create a new invoice scan in the system.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate with a valid account.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "The invoice scan could not be created due to a conflict (there is another invoice scan with the same id).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The invoice scan could not be created due to the payload being too large (keep the request under 1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice scan could not be created due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> CreateInvoiceScanAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("Invoice scan payload captured for the invoice.")] InvoiceScan invoiceScanDto);
  #endregion

  #region HTTP GET /rest/v1/invoices/{id}/scan
  /// <summary>
  /// Retrieves a specific invoice scan.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Retrieves a specific invoice scan from the system.",
    Description = "Retrieves a specific invoice scan from the Invoice Management System. " +
    "If the invoice scan identifier passed into the route is valid, the server will retrieve the invoice scan, given that the user is allowed to see this invoice scan.",
    OperationId = nameof(RetrieveInvoiceScanAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The invoice scan was retrieved successfully from the system.", typeof(InvoiceScan))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice scan identifier is not valid. Please input a valid identifier.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to access this invoice scan.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate with a valid account.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice scan could not be retrieved due to the invoice scan not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice scan could not be retrieved due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveInvoiceScanAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id);
  #endregion

  #region HTTP PUT /rest/v1/invoices/{id}/scan
  /// <summary>
  /// Updates a specific invoice scan.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="invoiceScanDto"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Updates a specific invoice scan in the system.",
    Description = "This route will allow you to updates a specific invoice scan from the Invoice Managemnet System.",
    OperationId = nameof(UpdateInvoiceScanAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The invoice scan was updated successfully.", typeof(InvoiceScan))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice scan information is not valid (please respect the invoice scan schema).", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate before hitting this endpoint.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice scan could not be updated due to the invoice scan not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice scan could not be updated due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> UpdateInvoiceScanAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("Invoice scan payload replacing the stored scan.")] InvoiceScan invoiceScanDto);
  #endregion

  #region HTTP DELETE /rest/v1/invoices/{id}/scan
  /// <summary>
  /// Deletes a specific invoice scan.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Deletes a specific invoice scan from the system.",
    Description = "Deletes a specific invoice scan from the Invoice Management System. " +
    "If the invoice scan identifier passed to the route is valid, the server will delete the invoice scan, given that the user is allowed to delete this invoice scan.",
    OperationId = nameof(DeleteInvoiceScanAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The invoice scan was deleted successfully.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice scan identifier is not valid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate before hitting this endpoint.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice scan could not be deleted due to the invoice scan not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice scan could not be deleted due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> DeleteInvoiceScanAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id);
  #endregion

  #region HTTP GET /rest/v1/invoices/{id}/metadata
  /// <summary>
  /// Retrieves the metadata from a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Retrieves the metadata from a specific invoice in the system.",
    Description = "Retrieves the metadata from a specific invoice in the Invoice Management System. " +
    "If the invoice identifier passed to the route is valid, the server will retrieve the metadata from the invoice, given that the user is allowed to see the metadata.",
    OperationId = nameof(RetrieveInvoiceMetadataAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The metadata was retrieved successfully from the invoice.", typeof(IDictionary<string, string>))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice identifier is not valid. Please input a valid identifier.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to access the metadata from this invoice.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate with a valid account.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The metadata could not be retrieved due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The metadata could not be retrieved due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveInvoiceMetadataAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id);
  #endregion

  #region HTTP PATCH /rest/v1/invoices/{id}/metadata
  /// <summary>
  /// Patches the metadata from a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="invoiceMetadataPatch"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Patches the metadata from a specific invoice in the system.",
    Description = "Patches the metadata from a specific invoice in the Invoice Management System. " +
    "If the invoice identifier passed to the route is valid, the server will patch the metadata from the invoice, given that the user is allowed to update the metadata.",
    OperationId = nameof(PatchInvoiceMetadataAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The metadata was patched successfully in the invoice.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice identifier is not valid. Please input a valid identifier.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate before hitting this endpoint.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The metadata could not be patched due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The metadata could not be patched due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> PatchInvoiceMetadataAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("Metadata patch represented as key/value pairs.")] IDictionary<string, string> invoiceMetadataPatch);
  #endregion

  #region HTTP DELETE /rest/v1/invoices/{id}/metadata
  /// <summary>
  /// Deletes specific metadata keys from a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="metadataKeys"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Deletes specific metadata keys from a specific invoice in the system.",
    Description = "Deletes specific metadata keys from a specific invoice in the Invoice Management System. " +
    "If the invoice identifier passed to the route is valid, the server will delete the metadata keys from the invoice, given that the user is allowed to update the metadata.",
    OperationId = nameof(DeleteInvoiceMetadataAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The metadata keys were deleted successfully from the invoice.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice identifier is not valid. Please input a valid identifier.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate before hitting this endpoint.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The metadata keys could not be deleted due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The metadata keys could not be deleted due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> DeleteInvoiceMetadataAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("Metadata keys that should be deleted from the invoice.")] IEnumerable<string> metadataKeys);
  #endregion
  #endregion

  #region CRUD operations for the Merchant Standard Endpoints
  #region HTTP POST /rest/v1/merchants
  /// <summary>
  /// Creates a new merchant.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="merchantDto"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Creates a new merchant in the system.",
    Description = "Creates a new merchant in the Merchant Management System. " +
    "This endpoint will validate that the input (Merchant DTO) is valid, " +
    "and then will perform a series of operations to onboard the merchant into the Merchant Management System.",
    OperationId = nameof(CreateNewMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status201Created, "The merchant was created successfully in the system.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The merchant DTO (payload) is not valid. Please respect the request body.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to create a new merchant in the system.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate with a valid account.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "The merchant could not be created due to a conflict (there is another merchant with the same id).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The merchant could not be created due to the payload being too large (keep the request under 1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The merchant could not be created due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> CreateNewMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromBody, SwaggerRequestBody("Merchant payload that will be persisted in the system.")] CreateMerchantDto merchantDto);
  #endregion

  #region HTTP GET /rest/v1/merchants
  /// <summary>
  /// Retrieves all merchants.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="parentCompanyId"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Retrieves all merchants from the system.",
    Description = "Retrieves all merchants from the Merchant Management System. ",
    OperationId = nameof(RetrieveAllMerchantsAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The merchants were retrieved successfully from the system.", typeof(Merchant[]))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate before hitting this endpoint.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The merchants could not be retrieved due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveAllMerchantsAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromQuery, SwaggerParameter("Parent company identifier used as a filter.", Required = true)] Guid parentCompanyId);
  #endregion

  #region HTTP GET /rest/v1/merchants/{id}
  /// <summary>
  /// Retrieves a specific merchant.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="parentCompanyId"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Retrieves a specific merchant from the system.",
    Description = "Retrieves a specific merchant from the Merchant Management System. ",
    OperationId = nameof(RetrieveSpecificMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The merchant was retrieved successfully from the system.", typeof(Merchant))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The merchant identifier is not valid. Please input a valid identifier.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to access this merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate with a valid account.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The merchant could not be retrieved due to the merchant not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The merchant could not be retrieved due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveSpecificMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique merchant identifier.", Required = true)] Guid id,
    [FromQuery, SwaggerParameter("Parent company identifier used as a filter.", Required = true)] Guid parentCompanyId);
  #endregion

  #region HTTP PUT /rest/v1/merchants/{id}
  /// <summary>
  /// Updates a specific merchant.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="merchantPayload"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Updates a specific merchant in the system.",
    Description = "Updates a specific merchant in the Merchant Management System. ",
    OperationId = nameof(UpdateSpecificMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The merchant was updated successfully.", typeof(Merchant))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The merchant information is not valid (please respect the merchant schema).", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate before hitting this endpoint.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The merchant could not be updated due to the merchant not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The merchant could not be updated due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> UpdateSpecificMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique merchant identifier.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("Merchant payload that will replace the stored merchant.")] Merchant merchantPayload);
  #endregion

  #region HTTP DELETE /rest/v1/merchants/{id}
  /// <summary>
  /// Deletes a specific merchant.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="parentCompanyId"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Deletes a specific merchant from the system.",
    Description = "Deletes a specific merchant from the Merchant Management System. ",
    OperationId = nameof(DeleteMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The merchant was deleted successfully.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The merchant identifier is not valid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate before hitting this endpoint.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The merchant could not be deleted due to the merchant not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The merchant could not be deleted due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> DeleteMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique merchant identifier.", Required = true)] Guid id,
    [FromQuery, SwaggerParameter("Parent company identifier used as a filter.", Required = true)] Guid parentCompanyId);
  #endregion

  #region HTTP GET /rest/v1/merchants/{id}/invoices
  /// <summary>
  /// Retrieves all invoices from a specific merchant.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Retrieves all invoices from a specific merchant in the system.",
    Description = "Retrieves all invoices from a specific merchant in the Invoice Management System. " +
    "If the merchant identifier passed to the route is valid, the server will retrieve all invoices from the merchant, given that the user is allowed to see the invoices.",
    OperationId = nameof(RetrieveInvoicesFromMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The invoices were retrieved successfully from the merchant.", typeof(Invoice[]))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The merchant identifier is not valid. Please input a valid identifier.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to access the invoices from this merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate with a valid account.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoices could not be retrieved due to the merchant not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoices could not be retrieved due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveInvoicesFromMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique merchant identifier.", Required = true)] Guid id);
  #endregion

  #region HTTP PATCH /rest/v1/merchants/{id}/invoices
  /// <summary>
  /// Adds invoice(s) to a specific merchant.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="invoiceIdentifiers"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Adds invoice(s) to a specific merchant in the system.",
    Description = "Adds invoice(s) to a specific merchant in the Invoice Management System. " +
    "If the merchant identifier passed to the route is valid, the server will add the invoice(s) to the merchant, given that the user is allowed to add invoices to this merchant.",
    OperationId = nameof(AddInvoiceToMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The invoice(s) were added to the merchant successfully.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The merchant identifier is not valid. Please input a valid identifier.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to add invoices to this merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoices could not be added to the merchant due to the merchant not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "The invoices could not be added to the merchant due to a conflict (the invoices are already in the merchant).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The invoices could not be added to the merchant due to the payload being too large (keep the request under 1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoices could not be added to the merchant due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> AddInvoiceToMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique merchant identifier.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("Collection of invoice identifiers that will be associated with the merchant.")] IEnumerable<Guid> invoiceIdentifiers);
  #endregion

  #region HTTP DELETE /rest/v1/merchants/{id}/invoices
  /// <summary>
  /// Removes invoice(s) from a specific merchant.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="invoiceIdentifiers"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Removes invoice(s) from a specific merchant in the system.",
    Description = "Removes invoice(s) from a specific merchant in the Invoice Management System. " +
    "If the merchant identifier passed to the route is valid, the server will remove the invoice(s) from the merchant, given that the user is allowed to remove invoices from this merchant.",
    OperationId = nameof(RemoveInvoiceFromMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status204NoContent, "The invoice(s) were removed from the merchant successfully.")]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The merchant identifier is not valid. Please input a valid identifier.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to remove invoices from this merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoices could not be removed from the merchant due to the merchant not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status409Conflict, "The invoices could not be removed from the merchant due to a conflict (the invoices are not in the merchant).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The invoices could not be removed from the merchant due to the payload being too large (keep the request under 1MB).", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoices could not be removed from the merchant due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RemoveInvoiceFromMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique merchant identifier.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("Collection of invoice identifiers that will be detached from the merchant.")] IEnumerable<Guid> invoiceIdentifiers);
  #endregion

  #region HTTP GET /rest/v1/merchants/{id}/products
  /// <summary>
  /// Retrieves all products from a specific merchant.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Retrieves all products from a specific merchant in the system.",
    Description = "Retrieves all products from a specific merchant in the Merchant Management System. " +
    "If the merchant identifier passed to the route is valid, the server will retrieve all products from the merchant, given that the user is allowed to see the products.",
    OperationId = nameof(RetrieveProductsFromMerchantAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status200OK, "The products were retrieved successfully from the merchant.", typeof(Product[]))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The merchant identifier is not valid. Please input a valid identifier.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to access the products from this merchant.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate with a valid account.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The products could not be retrieved due to the merchant not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The products could not be retrieved due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> RetrieveProductsFromMerchantAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique merchant identifier.", Required = true)] Guid id);
  #endregion
  #endregion

  /// <summary>
  /// Analyzes a specific invoice.
  /// </summary>
  /// <param name="invoiceProcessingService"></param>
  /// <param name="httpContext"></param>
  /// <param name="id"></param>
  /// <param name="options"></param>
  /// <returns></returns>
  [SwaggerOperation(
    Summary = "Analyzes a specific invoice from the system.",
    Description = "Analyzes a specific invoice from the Invoice Management System. " +
    "If the invoice identifier passed to the route is valid, the server will start analyzing the invoice, given that the user is allowed to perform this operation.",
    OperationId = nameof(AnalyzeInvoiceAsync),
    Tags = [EndpointNameTag])]
  [SwaggerResponse(StatusCodes.Status202Accepted, "The invoice was analyzed successfully.", typeof(Invoice))]
  [SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice identifier is not valid.", typeof(ValidationProblemDetails))]
  [SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to perform this operation.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status402PaymentRequired, "You cannot analyze this invoice. You don't have enough credits.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate before hitting this endpoint.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status404NotFound, "The invoice could not be analyzed due to the invoice not being found.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
  [SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice could not be analyzed due to an internal service error.", typeof(ProblemDetails))]
  [SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
  [Authorize]
  internal static partial Task<IResult> AnalyzeInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromServices] IHttpContextAccessor httpContext,
    [FromRoute, SwaggerParameter("Unique invoice identifier.", Required = true)] Guid id,
    [FromBody, SwaggerRequestBody("Analysis options that drive the analyzer pipeline.")] AnalysisOptions options);
}

