namespace arolariu.Backend.Domain.Invoices.Endpoints;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using Swashbuckle.AspNetCore.Annotations;


using System;
using System.Diagnostics.CodeAnalysis;
using System.Security.Claims;
using System.Threading.Tasks;

public static partial class InvoiceEndpoints
{
	#region CRUD operations for the Invoice Standard Endpoints
	/// <summary>
	/// Creates a new invoice.
	/// </summary>
	/// <param name="invoiceProcessingService"></param>
	/// <param name="httpContext"></param>
	/// <param name="invoiceDto"></param>
	/// <param name="principal"></param>
	/// <returns></returns>
	[SwaggerOperation(
		Summary = "Create a new invoice (receipt) in the system.",
		Description = "This request will create a new invoice in the Invoice Management System. " +
		"This endpoint will validate that the input (Invoice DTO) is valid, " +
		"and then will perform a series of operations to onboard the invoice into the Invoice Management System.",
		OperationId = nameof(CreateNewInvoiceAsync),
		Tags = [EndpointNameTag])]
	[SwaggerResponse(StatusCodes.Status201Created, "The invoice was created successfully in the system.", typeof(Invoice))]
	[SwaggerResponse(StatusCodes.Status400BadRequest, "The invoice DTO (payload) is not valid. Please respect the request body.", typeof(ValidationProblemDetails))]
	[SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to create a new invoice in the system.", typeof(ProblemDetails))]
	[SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate with a valid account.", typeof(ProblemDetails))]
	[SwaggerResponse(StatusCodes.Status409Conflict, "The invoice could not be created due to a conflict (there is another invoice with the same id).", typeof(ProblemDetails))]
	[SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The invoice could not be created due to the payload being too large (keep the request under 1MB).", typeof(ProblemDetails))]
	[SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
	[SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice could not be created due to an internal service error.", typeof(ProblemDetails))]
	[SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
	[Authorize]
	private static partial Task<IResult> CreateNewInvoiceAsync(
		IInvoiceProcessingService invoiceProcessingService,
		IHttpContextAccessor httpContext,
		CreateInvoiceDto invoiceDto,
		ClaimsPrincipal principal);

	/// <summary>
	/// Retrieves a specific invoice.
	/// </summary>
	/// <param name="invoiceProcessingService"></param>
	/// <param name="httpContext"></param>
	/// <param name="principal"></param>
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
	private static partial Task<IResult> RetrieveSpecificInvoiceAsync(
		IInvoiceProcessingService invoiceProcessingService,
		IHttpContextAccessor httpContext,
		Guid id,
		ClaimsPrincipal principal);

	/// <summary>
	/// Retrieves all invoices.
	/// </summary>
	/// <param name="invoiceProcessingService"></param>
	/// <param name="httpContext"></param>
	/// <param name="principal"></param>
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
	[SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
	[SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoices could not be retrieved due to an internal service error.", typeof(ProblemDetails))]
	[SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
	[Authorize]
	private static partial Task<IResult> RetrieveAllInvoicesAsync(
		IInvoiceProcessingService invoiceProcessingService,
		IHttpContextAccessor httpContext,
		ClaimsPrincipal principal);

	/// <summary>
	/// Updates a specific invoice.
	/// </summary>
	/// <param name="invoiceProcessingService"></param>
	/// <param name="httpContext"></param>
	/// <param name="id"></param>
	/// <param name="invoicePayload"></param>
	/// <param name="principal"></param>
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
	private static partial Task<IResult> UpdateSpecificInvoiceAsync(
		IInvoiceProcessingService invoiceProcessingService,
		IHttpContextAccessor httpContext,
		Guid id,
		Invoice invoicePayload,
		ClaimsPrincipal principal);

	/// <summary>
	/// Deletes a specific invoice.
	/// </summary>
	/// <param name="invoiceProcessingService"></param>
	/// <param name="httpContext"></param>
	/// <param name="id"></param>
	/// <param name="principal"></param>
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
	private static partial Task<IResult> DeleteInvoiceAsync(
		IInvoiceProcessingService invoiceProcessingService,
		IHttpContextAccessor httpContext,
		Guid id,
		ClaimsPrincipal principal);
	#endregion
	#region CRUD operations for the Merchant Standard Endpoints
	/// <summary>
	/// Creates a new merchant.
	/// </summary>
	/// <param name="invoiceProcessingService"></param>
	/// <param name="httpContext"></param>
	/// <param name="merchantDto"></param>
	/// <param name="principal"></param>
	/// <returns></returns>
	[SwaggerOperation(
		Summary = "Creates a new merchant in the system.",
		Description = "Creates a new merchant in the Merchant Management System. " +
		"This endpoint will validate that the input (Merchant DTO) is valid, " +
		"and then will perform a series of operations to onboard the merchant into the Merchant Management System.",
		OperationId = nameof(CreateNewMerchantAsync),
		Tags = [EndpointNameTag])]
	[SwaggerResponse(StatusCodes.Status201Created, "The merchant was created successfully in the system.", typeof(Merchant))]
	[SwaggerResponse(StatusCodes.Status400BadRequest, "The merchant DTO (payload) is not valid. Please respect the request body.", typeof(ValidationProblemDetails))]
	[SwaggerResponse(StatusCodes.Status401Unauthorized, "You are not authorized to create a new merchant in the system.", typeof(ProblemDetails))]
	[SwaggerResponse(StatusCodes.Status403Forbidden, "You are not authenticated. Please authenticate with a valid account.", typeof(ProblemDetails))]
	[SwaggerResponse(StatusCodes.Status409Conflict, "The merchant could not be created due to a conflict (there is another merchant with the same id).", typeof(ProblemDetails))]
	[SwaggerResponse(StatusCodes.Status413PayloadTooLarge, "The merchant could not be created due to the payload being too large (keep the request under 1MB).", typeof(ProblemDetails))]
	[SwaggerResponse(StatusCodes.Status429TooManyRequests, "You have made too many requests, slow down a little.", typeof(ProblemDetails))]
	[SwaggerResponse(StatusCodes.Status500InternalServerError, "The merchant could not be created due to an internal service error.", typeof(ProblemDetails))]
	[SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
	[Authorize]
	private static partial Task<IResult> CreateNewMerchantAsync(
		IInvoiceProcessingService invoiceProcessingService,
		IHttpContextAccessor httpContext,
		CreateMerchantDto merchantDto,
		ClaimsPrincipal principal);

	/// <summary>
	/// Retrieves all merchants.
	/// </summary>
	/// <param name="invoiceProcessingService"></param>
	/// <param name="httpContext"></param>
	/// <param name="principal"></param>
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
	private static partial Task<IResult> RetrieveAllMerchantsAsync(
		IInvoiceProcessingService invoiceProcessingService,
		IHttpContextAccessor httpContext,
		ClaimsPrincipal principal);

	/// <summary>
	/// Retrieves a specific merchant.
	/// </summary>
	/// <param name="invoiceProcessingService"></param>
	/// <param name="httpContext"></param>
	/// <param name="id"></param>
	/// <param name="parentCompanyId"></param>
	/// <param name="principal"></param>
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
	private static partial Task<IResult> RetrieveSpecificMerchantAsync(
		IInvoiceProcessingService invoiceProcessingService,
		IHttpContextAccessor httpContext,
		Guid id,
		Guid parentCompanyId,
		ClaimsPrincipal principal);

	/// <summary>
	/// Updates a specific merchant.
	/// </summary>
	/// <param name="invoiceProcessingService"></param>
	/// <param name="httpContext"></param>
	/// <param name="id"></param>
	/// <param name="merchantPayload"></param>
	/// <param name="principal"></param>
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
	private static partial Task<IResult> UpdateSpecificMerchantAsync(
		IInvoiceProcessingService invoiceProcessingService,
		IHttpContextAccessor httpContext,
		Guid id,
		Merchant merchantPayload,
		ClaimsPrincipal principal);

	/// <summary>
	/// Deletes a specific merchant.
	/// </summary>
	/// <param name="invoiceProcessingService"></param>
	/// <param name="httpContext"></param>
	/// <param name="id"></param>
	/// <param name="parentCompanyId"></param>
	/// <param name="principal"></param>
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
	private static partial Task<IResult> DeleteMerchantAsync(
		IInvoiceProcessingService invoiceProcessingService,
		IHttpContextAccessor httpContext,
		Guid id,
		Guid parentCompanyId,
		ClaimsPrincipal principal);
	#endregion

	/// <summary>
	/// Analyzes a specific invoice.
	/// </summary>
	/// <param name="invoiceProcessingService"></param>
	/// <param name="httpContext"></param>
	/// <param name="id"></param>
	/// <param name="options"></param>
	/// <param name="principal"></param>
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
	private static partial Task<IResult> AnalyzeInvoiceAsync(
		IInvoiceProcessingService invoiceProcessingService,
		IHttpContextAccessor httpContext,
		Guid id,
		AnalysisOptions options,
		ClaimsPrincipal principal);
}
