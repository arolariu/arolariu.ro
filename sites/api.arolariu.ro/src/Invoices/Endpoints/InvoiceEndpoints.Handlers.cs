﻿namespace arolariu.Backend.Domain.Invoices.Endpoints;
using System;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using Swashbuckle.AspNetCore.Annotations;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

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
	private static async Task<IResult> CreateNewInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromBody] CreateInvoiceDto invoiceDto,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(CreateNewInvoiceAsync), ActivityKind.Server);
			var invoice = invoiceDto.ToInvoice();

			await invoiceProcessingService
				.CreateInvoice(invoice)
				.ConfigureAwait(false);

			return Results.Created($"/rest/invoices/{invoice.Id}", invoice);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

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
	private static async Task<IResult> RetrieveSpecificInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveSpecificInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);

			var invoice = await invoiceProcessingService
				.ReadInvoice(id, userIdentifier)
				.ConfigureAwait(false);

			return Results.Ok(invoice);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

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
	private static async Task<IResult> RetrieveAllInvoicesAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllInvoicesAsync), ActivityKind.Server);
			var invoices = await invoiceProcessingService
				.ReadInvoices()
				.ConfigureAwait(false);

			return Results.Ok(invoices);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

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
	private static async Task<IResult> UpdateSpecificInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] Invoice invoicePayload,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateSpecificInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(httpContext.HttpContext!.Request.Headers.Authorization[0]!);

			var invoice = await invoiceProcessingService
				.ReadInvoice(id, userIdentifier)
				.ConfigureAwait(false);

			var updatedInvoice = await invoiceProcessingService
				.UpdateInvoice(invoice, invoicePayload)
				.ConfigureAwait(false);

			return Results.Accepted(value: updatedInvoice);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

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
	private static async Task<IResult> DeleteInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(httpContext.HttpContext!.Request.Headers.Authorization[0]!);

			await invoiceProcessingService
				.DeleteInvoice(id, userIdentifier)
				.ConfigureAwait(false);

			return Results.NoContent();
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

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
	private static async Task<IResult> CreateNewMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromBody] CreateMerchantDto merchantDto,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(CreateNewMerchantAsync), ActivityKind.Server);
			var merchant = merchantDto.ToMerchant();

			await invoiceProcessingService
					.CreateMerchant(merchant)
					.ConfigureAwait(false);

			return Results.Created($"/rest/merchants/{merchant.Id}", merchant);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

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
	private static async Task<IResult> RetrieveAllMerchantsAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllMerchantsAsync), ActivityKind.Server);
			var merchants = await invoiceProcessingService.ReadMerchants().ConfigureAwait(false);

			return Results.Ok(merchants);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

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
	private static async Task<IResult> RetrieveSpecificMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromQuery] Guid parentCompanyId,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveSpecificMerchantAsync), ActivityKind.Server);
			var merchant = await invoiceProcessingService.ReadMerchant(id, parentCompanyId).ConfigureAwait(false);

			if (merchant is null) return Results.NotFound();
			return Results.Ok(merchant);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

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
	private static async Task<IResult> UpdateSpecificMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] Merchant merchantPayload,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateSpecificMerchantAsync), ActivityKind.Server);
			var merchant = await invoiceProcessingService.ReadMerchant(id, merchantPayload.ParentCompanyId).ConfigureAwait(false);

			var updatedMerchant = await invoiceProcessingService
				.UpdateMerchant(merchant, merchantPayload)
				.ConfigureAwait(false);

			return Results.Accepted(value: updatedMerchant);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

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
	private static async Task<IResult> DeleteMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromQuery] Guid parentCompanyId,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantAsync), ActivityKind.Server);
			var merchant = await invoiceProcessingService.ReadMerchant(id, parentCompanyId).ConfigureAwait(false);

			if (merchant is null) return Results.NotFound();
			await invoiceProcessingService.DeleteMerchant(id, parentCompanyId).ConfigureAwait(false);
			return Results.NoContent();
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	#endregion

	#region Analysis operations

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
	private static async Task<IResult> AnalyzeInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] AnalysisOptions options,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(httpContext.HttpContext!.Request.Headers.Authorization[0]!);

			await invoiceProcessingService
				.AnalyzeInvoice(id, userIdentifier, options)
				.ConfigureAwait(false);

			return Results.Accepted(value: $"Invoice with id: {id} sent for analysis.");
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	#endregion
}
