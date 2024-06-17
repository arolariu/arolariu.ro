namespace arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Orchestration;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using Swashbuckle.AspNetCore.Annotations;

using System;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public static partial class InvoiceEndpoints
{
	#region CRUD operations

	/// <summary>
	/// Creates a new invoice.
	/// </summary>
	/// <param name="invoiceOrchestrationService"></param>
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
		[FromServices] IInvoiceOrchestrationService invoiceOrchestrationService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromBody] CreateInvoiceDto invoiceDto,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(CreateNewInvoiceAsync), ActivityKind.Server);
			var invoice = invoiceDto.ToInvoice();

			await invoiceOrchestrationService
				.CreateInvoiceObject(invoice)
				.ConfigureAwait(false);

			return Results.Created($"/rest/invoices/{invoice.Id}", invoice);
		}
		catch (InvoiceOrchestrationValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration validation error.");
		}
		catch (InvoiceOrchestrationDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration dependency error.");
		}
		catch (InvoiceOrchestrationDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration dependency validation error.");
		}
		catch (InvoiceOrchestrationServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration service error.");
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
	/// <param name="invoiceOrchestrationService"></param>
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
		[FromServices] IInvoiceOrchestrationService invoiceOrchestrationService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveSpecificInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);

			var invoice = await invoiceOrchestrationService
				.ReadInvoiceObject(id, userIdentifier)
				.ConfigureAwait(false);

			return Results.Ok(invoice);
		}
		catch (InvoiceOrchestrationValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration validation error.");
		}
		catch (InvoiceOrchestrationDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration dependency error.");
		}
		catch (InvoiceOrchestrationDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration dependency validation error.");
		}
		catch (InvoiceOrchestrationServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration service error.");
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
	/// <param name="invoiceOrchestrationService"></param>
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
		[FromServices] IInvoiceOrchestrationService invoiceOrchestrationService,
		[FromServices] IHttpContextAccessor httpContext,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllInvoicesAsync), ActivityKind.Server);
			var invoices = await invoiceOrchestrationService
				.ReadAllInvoiceObjects()
				.ConfigureAwait(false);

			return Results.Ok(invoices);
		}
		catch (InvoiceOrchestrationValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration validation error.");
		}
		catch (InvoiceOrchestrationDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration dependency error.");
		}
		catch (InvoiceOrchestrationDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration dependency validation error.");
		}
		catch (InvoiceOrchestrationServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration service error.");
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
	/// <param name="invoiceOrchestrationService"></param>
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
		[FromServices] IInvoiceOrchestrationService invoiceOrchestrationService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] Invoice invoicePayload,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateSpecificInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(httpContext.HttpContext!.Request.Headers.Authorization[0]!);

			var invoice = await invoiceOrchestrationService
				.ReadInvoiceObject(id, userIdentifier)
				.ConfigureAwait(false);

			var updatedInvoice = await invoiceOrchestrationService
				.UpdateInvoiceObject(invoice, invoicePayload)
				.ConfigureAwait(false);

			return Results.Accepted(value: updatedInvoice);
		}
		catch (InvoiceOrchestrationValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration validation error.");
		}
		catch (InvoiceOrchestrationDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration dependency error.");
		}
		catch (InvoiceOrchestrationDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration dependency validation error.");
		}
		catch (InvoiceOrchestrationServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration service error.");
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
	/// <param name="invoiceOrchestrationService"></param>
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
		[FromServices] IInvoiceOrchestrationService invoiceOrchestrationService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(httpContext.HttpContext!.Request.Headers.Authorization[0]!);

			await invoiceOrchestrationService
				.DeleteInvoiceObject(id, userIdentifier)
				.ConfigureAwait(false);

			return Results.NoContent();
		}
		catch (InvoiceOrchestrationValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration validation error.");
		}
		catch (InvoiceOrchestrationDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration dependency error.");
		}
		catch (InvoiceOrchestrationDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration dependency validation error.");
		}
		catch (InvoiceOrchestrationServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration service error.");
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
	/// <param name="invoiceOrchestrationService"></param>
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
	[SwaggerResponse(StatusCodes.Status500InternalServerError, "The invoice could not be analyzed due to an internal service error.", typeof(ProblemDetails))]
	[SuppressMessage("Design", "CA1031:Do not catch general exception types", Justification = "General exception types represent unexpected errors.")]
	[Authorize]
	private static async Task<IResult> AnalyzeInvoiceAsync(
		[FromServices] IInvoiceOrchestrationService invoiceOrchestrationService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] AnalysisOptions options,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(httpContext.HttpContext!.Request.Headers.Authorization[0]!);

			await invoiceOrchestrationService
				.AnalyzeInvoiceWithOptions(id, userIdentifier, options)
				.ConfigureAwait(false);

			return Results.Accepted(value: $"Invoice with id: {id} sent for analysis.");
		}
		catch (InvoiceOrchestrationValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration validation error.");
		}
		catch (InvoiceOrchestrationDependencyException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration dependency error.");
		}
		catch (InvoiceOrchestrationDependencyValidationException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration dependency validation error.");
		}
		catch (InvoiceOrchestrationServiceException exception)
		{
			return Results.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an orchestration service error.");
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
