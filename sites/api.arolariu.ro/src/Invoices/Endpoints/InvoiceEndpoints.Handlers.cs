namespace arolariu.Backend.Domain.Invoices.Endpoints;
using System;
using System.Diagnostics;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public static partial class InvoiceEndpoints
{
	#region CRUD operations for the Invoice Standard Endpoints
	private static async partial Task<IResult> CreateNewInvoiceAsync(
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

			return Results.Created($"/rest/invoices/{invoice.id}", invoice);
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

	private static async partial Task<IResult> RetrieveSpecificInvoiceAsync(
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

	private static async partial Task<IResult> RetrieveAllInvoicesAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllInvoicesAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);

			var invoices = await invoiceProcessingService
				.ReadInvoices(userIdentifier)
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

	private static async partial Task<IResult> UpdateSpecificInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] Invoice invoicePayload,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateSpecificInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);

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

	private static async partial Task<IResult> DeleteInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);

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

	private static async partial Task<IResult> AddProductToInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] Product product,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(AddProductToInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);
			var invoice = await invoiceProcessingService.ReadInvoice(id, userIdentifier).ConfigureAwait(false);
			var updatedInvoice = await invoiceProcessingService.AddProduct(invoice, product).ConfigureAwait(false);
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

	private static async partial Task<IResult> RetrieveProductsFromInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveProductsFromInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);
			var invoice = await invoiceProcessingService.ReadInvoice(id, userIdentifier).ConfigureAwait(false);
			var products = await invoiceProcessingService.GetProducts(invoice).ConfigureAwait(false);
			return Results.Ok(products);
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

	private static async partial Task<IResult> RemoveProductFromInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromQuery] string productName,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveProductFromInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);
			var invoice = await invoiceProcessingService.ReadInvoice(id, userIdentifier).ConfigureAwait(false);
			var product = await invoiceProcessingService.GetProduct(invoice, productName).ConfigureAwait(false);
			var updatedInvoice = await invoiceProcessingService.DeleteProduct(invoice, product).ConfigureAwait(false);
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

	private static async partial Task<IResult> UpdateProductInInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromQuery] string productName,
		[FromBody] Product productInformation,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateProductInInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);
			var invoice = await invoiceProcessingService.ReadInvoice(id, userIdentifier).ConfigureAwait(false);
			var product = await invoiceProcessingService.GetProduct(invoice, productName).ConfigureAwait(false);
			var updatedInvoice = await invoiceProcessingService.DeleteProduct(invoice, product).ConfigureAwait(false);
			var updatedProduct = await invoiceProcessingService.AddProduct(updatedInvoice, productInformation).ConfigureAwait(false);
			return Results.Accepted(value: updatedProduct);
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

	private static async partial Task<IResult> RetrieveMerchantFromInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveMerchantFromInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);
			var invoice = await invoiceProcessingService.ReadInvoice(id, userIdentifier).ConfigureAwait(false);
			var potentialMerchant = invoice.Merchant;

			if (potentialMerchant is null) return Results.NotFound();
			else return Results.Ok(potentialMerchant);
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

	private static async partial Task<IResult> AddMerchantToInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] Merchant merchant,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(AddMerchantToInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);
			var invoice = await invoiceProcessingService.ReadInvoice(id, userIdentifier).ConfigureAwait(false);
			var possibleMerchant = invoice.Merchant;

			if (possibleMerchant is not null) return Results.Conflict();
			else
			{
				invoice.Merchant = merchant;
				var updatedInvoice = await invoiceProcessingService.UpdateInvoice(invoice, invoice).ConfigureAwait(false);
				return Results.Accepted(value: updatedInvoice);
			}
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

	private static async partial Task<IResult> RemoveMerchantFromInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveMerchantFromInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);
			var invoice = await invoiceProcessingService.ReadInvoice(id, userIdentifier).ConfigureAwait(false);
			var possibleMerchant = invoice.Merchant;

			if (possibleMerchant is null) return Results.NotFound();
			else
			{
				invoice.Merchant = new Merchant();
				var updatedInvoice = await invoiceProcessingService.UpdateInvoice(invoice, invoice).ConfigureAwait(false);
				return Results.Accepted(value: updatedInvoice);
			}
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

	private static async partial Task<IResult> UpdateMerchantInInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] Merchant merchant,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantInInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);
			var invoice = await invoiceProcessingService.ReadInvoice(id, userIdentifier).ConfigureAwait(false);


			invoice.Merchant = merchant;
			var updatedInvoice = await invoiceProcessingService.UpdateInvoice(invoice, invoice).ConfigureAwait(false);
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

	private static async partial Task<IResult> RetrieveSpecificInvoiceStatusAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveSpecificInvoiceStatusAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);

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

	private static async partial Task<IResult> RetrieveAllInvoicesStatusAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllInvoicesStatusAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);
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
	private static async partial Task<IResult> CreateNewMerchantAsync(
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

			return Results.Created($"/rest/merchants/{merchant.id}", merchant);
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

	private static async partial Task<IResult> RetrieveAllMerchantsAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromBody] Guid parentCompanyId,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllMerchantsAsync), ActivityKind.Server);
			var merchants = await invoiceProcessingService.ReadMerchants(parentCompanyId).ConfigureAwait(false);

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

	private static async partial Task<IResult> RetrieveSpecificMerchantAsync(
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

	private static async partial Task<IResult> UpdateSpecificMerchantAsync(
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

	private static async partial Task<IResult> DeleteMerchantAsync(
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
	private static async partial Task<IResult> AnalyzeInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] AnalysisOptions options,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoiceAsync), ActivityKind.Server);
			var userIdentifier = Guid.Parse(principal.Claims.First(claim => claim.Type == "userIdentifier").Value);
			var invoice = await invoiceProcessingService.ReadInvoice(id, userIdentifier).ConfigureAwait(false);

			// We will analyze the invoice without blocking the request (fire and forget).
			await invoiceProcessingService.AnalyzeInvoice(invoice, options).ConfigureAwait(false);
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
