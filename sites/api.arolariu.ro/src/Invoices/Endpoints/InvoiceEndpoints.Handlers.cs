namespace arolariu.Backend.Domain.Invoices.Endpoints;

using System;
using System.Collections.Generic;
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
	internal static async partial Task<IResult> CreateNewInvoiceAsync(
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

			return TypedResults.Created($"/rest/v1/invoices/{invoice.id}", invoice);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> RetrieveSpecificInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveSpecificInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);

			if (possibleInvoice is null) return TypedResults.NotFound();
			else return TypedResults.Ok(possibleInvoice);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> RetrieveAllInvoicesAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllInvoicesAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoices = await invoiceProcessingService
				.ReadInvoices(potentialUserIdentifier)
				.ConfigureAwait(false);

			if (possibleInvoices is null) return TypedResults.NotFound();
			else return TypedResults.Ok(possibleInvoices);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> DeleteInvoicesAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoicesAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			await invoiceProcessingService
				.DeleteInvoices(potentialUserIdentifier)
				.ConfigureAwait(false);
			return TypedResults.NoContent();
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> UpdateSpecificInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] Invoice invoicePayload,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateSpecificInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();

			var updatedInvoice = await invoiceProcessingService
				.UpdateInvoice(invoicePayload, id, potentialUserIdentifier)
				.ConfigureAwait(false);
			return TypedResults.Accepted($"/rest/v1/invoices/{id}", value: updatedInvoice);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> PatchSpecificInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] Invoice invoicePayload,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(PatchSpecificInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();

			var newInvoice = Invoice.Merge(possibleInvoice, invoicePayload);

			// If the merchant reference was updated, we need to validate the new merchant reference.
			if (newInvoice.MerchantReference != possibleInvoice.MerchantReference)
			{
				var possibleMerchant = await invoiceProcessingService
					.ReadMerchant(newInvoice.MerchantReference)
					.ConfigureAwait(false);
				if (possibleMerchant is null) return TypedResults.BadRequest($"The merchant with id {invoicePayload.MerchantReference} does not exist.");

				if (!possibleMerchant.ReferencedInvoices.Contains(id))
				{
					possibleMerchant.ReferencedInvoices.Add(id);
					await invoiceProcessingService
						.UpdateMerchant(possibleMerchant, possibleMerchant.id, possibleMerchant.ParentCompanyId)
						.ConfigureAwait(false);
				}
			}

			var updatedInvoice = await invoiceProcessingService
				.UpdateInvoice(newInvoice, id, potentialUserIdentifier)
				.ConfigureAwait(false);

			return TypedResults.Accepted($"/rest/v1/invoices/{id}", value: updatedInvoice);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> DeleteInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();

			await invoiceProcessingService
				.DeleteInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			return TypedResults.NoContent();
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> AddProductToInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] Product product,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(AddProductToInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();

			await invoiceProcessingService
				.AddProduct(product, id, potentialUserIdentifier)
				.ConfigureAwait(false);
			return TypedResults.Created(uri: $"/rest/v1/invoices/{id}/products", value: product);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> RetrieveProductsFromInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveProductsFromInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();

			return TypedResults.Ok(possibleInvoice.Items);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> RemoveProductFromInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] string productName,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveProductFromInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleProduct = await invoiceProcessingService
				.GetProduct(productName, id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleProduct is null) return TypedResults.NotFound();

			await invoiceProcessingService
				.DeleteProduct(productName, id, potentialUserIdentifier)
				.ConfigureAwait(false);
			return TypedResults.NoContent();
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> UpdateProductInInvoiceAsync(
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
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();

			var possibleProduct = await invoiceProcessingService
				.GetProduct(productName, id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleProduct is null) return TypedResults.NotFound();

			await invoiceProcessingService
				.DeleteProduct(possibleProduct, id, potentialUserIdentifier)
				.ConfigureAwait(false);

			await invoiceProcessingService
				.AddProduct(productInformation, id, potentialUserIdentifier)
				.ConfigureAwait(false);

			return TypedResults.Accepted($"/rest/v1/invoices/{id}/products", value: productInformation);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> RetrieveMerchantFromInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveMerchantFromInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();
			if (possibleInvoice.MerchantReference == Guid.Empty) return TypedResults.NotFound();

			var possibleMerchant = await invoiceProcessingService
				.ReadMerchant(possibleInvoice.MerchantReference)
				.ConfigureAwait(false);
			if (possibleMerchant is null) return TypedResults.NotFound();

			return TypedResults.Ok(possibleMerchant);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> AddMerchantToInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] Merchant merchant,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(AddMerchantToInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);

			if (possibleInvoice is null) return TypedResults.NotFound();
			if (possibleInvoice.MerchantReference != Guid.Empty) return TypedResults.Conflict();

			possibleInvoice.MerchantReference = merchant.id;
			merchant.ReferencedInvoices.Add(possibleInvoice.id);

			await invoiceProcessingService
				.UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
				.ConfigureAwait(false);

			await invoiceProcessingService
				.CreateMerchant(merchant)
				.ConfigureAwait(false);

			return TypedResults.Created(uri: $"/rest/v1/merchants/{merchant.id}", merchant);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> RemoveMerchantFromInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveMerchantFromInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);


			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();
			if (possibleInvoice.MerchantReference == Guid.Empty) return TypedResults.Conflict();

			var possibleMerchant = await invoiceProcessingService
				.ReadMerchant(possibleInvoice.MerchantReference)
				.ConfigureAwait(false);
			if (possibleMerchant is null) return TypedResults.NotFound();

			possibleInvoice.MerchantReference = Guid.Empty;
			possibleMerchant.ReferencedInvoices.Remove(possibleInvoice.id);

			await invoiceProcessingService
				.UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
				.ConfigureAwait(false);

			await invoiceProcessingService
				.UpdateMerchant(possibleMerchant, possibleMerchant.id, possibleMerchant.ParentCompanyId)
				.ConfigureAwait(false);

			return TypedResults.NoContent();
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> CreateInvoiceScanAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] InvoiceScan invoiceScanDto,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceScanAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();

			var possibleInvoiceScan = await invoiceProcessingService
				.ReadInvoiceScan(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (InvoiceScan.NotDefault(possibleInvoiceScan)) return TypedResults.Conflict();

			await invoiceProcessingService
				.UpdateInvoiceScan(invoiceScanDto, id, potentialUserIdentifier)
				.ConfigureAwait(false);

			return TypedResults.Created();
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> RetrieveInvoiceScanAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveInvoiceScanAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();

			var possibleInvoiceScan = await invoiceProcessingService
				.ReadInvoiceScan(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (InvoiceScan.NotDefault(possibleInvoiceScan)) return TypedResults.Ok(value: possibleInvoiceScan);

			return TypedResults.NotFound();
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> UpdateInvoiceScanAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] InvoiceScan invoiceScanDto,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoiceScanAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();

			var possibleInvoiceScan = await invoiceProcessingService
				.ReadInvoiceScan(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (InvoiceScan.NotDefault(possibleInvoiceScan) is false) return TypedResults.NotFound();

			await invoiceProcessingService
				.UpdateInvoiceScan(invoiceScanDto, id, potentialUserIdentifier)
				.ConfigureAwait(false);
			return TypedResults.Accepted($"/rest/v1/invoices/{id}/scan", invoiceScanDto);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> DeleteInvoiceScanAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceScanAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();

			var possibleInvoiceScan = await invoiceProcessingService
				.ReadInvoiceScan(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (InvoiceScan.NotDefault(possibleInvoiceScan) is false) return TypedResults.NotFound();

			await invoiceProcessingService
				.DeleteInvoiceScan(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			return TypedResults.NoContent();
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> RetrieveInvoiceMetadataAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveInvoiceMetadataAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();
			return TypedResults.Ok(value: possibleInvoice.AdditionalMetadata);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> PatchInvoiceMetadataAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] IDictionary<string, string> invoiceMetadataPatch,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(PatchInvoiceMetadataAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();

			foreach (var (key, value) in invoiceMetadataPatch)
			{
				possibleInvoice.AdditionalMetadata[key] = value;
			}

			var updatedInvoice = await invoiceProcessingService
				.UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
				.ConfigureAwait(false);
			return TypedResults.Accepted($"/rest/v1/invoices/{id}/metadata", updatedInvoice.AdditionalMetadata);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> DeleteInvoiceMetadataAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] IEnumerable<string> metadataKeys,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceMetadataAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();

			foreach (var key in metadataKeys)
			{
				possibleInvoice.AdditionalMetadata.Remove(key);
			}

			var updatedInvoice = await invoiceProcessingService
				.UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
				.ConfigureAwait(false);
			return TypedResults.NoContent();
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	#endregion

	#region CRUD operations for the Merchant Standard Endpoints
	internal static async partial Task<IResult> CreateNewMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromBody] CreateMerchantDto merchantDto,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(CreateNewMerchantAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var merchant = merchantDto.ToMerchant();
			await invoiceProcessingService
					.CreateMerchant(merchant)
					.ConfigureAwait(false);
			return TypedResults.Created($"/rest/merchants/{merchant.id}", merchant);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> RetrieveAllMerchantsAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromBody] Guid parentCompanyId,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllMerchantsAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);


			var possibleMerchants = await invoiceProcessingService
					.ReadMerchants(parentCompanyId)
					.ConfigureAwait(false);

			if (possibleMerchants is null || !possibleMerchants.Any()) return TypedResults.NotFound();
			return TypedResults.Ok(possibleMerchants);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> RetrieveSpecificMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromQuery] Guid parentCompanyId,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveSpecificMerchantAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleMerchant = await invoiceProcessingService
				.ReadMerchant(id, parentCompanyId)
				.ConfigureAwait(false);
			if (possibleMerchant is null) return TypedResults.NotFound();
			return TypedResults.Ok(possibleMerchant);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> UpdateSpecificMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] Merchant merchantPayload,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateSpecificMerchantAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleMerchant = await invoiceProcessingService
				.ReadMerchant(id, merchantPayload.ParentCompanyId)
				.ConfigureAwait(false);
			if (possibleMerchant is null) return TypedResults.NotFound();

			await invoiceProcessingService
				.UpdateMerchant(merchantPayload, id)
				.ConfigureAwait(false);
			return TypedResults.Accepted($"/rest/v1/merchants/{id}", merchantPayload);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> DeleteMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromQuery] Guid parentCompanyId,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleMerchant = await invoiceProcessingService
				.ReadMerchant(id, parentCompanyId)
				.ConfigureAwait(false);
			if (possibleMerchant is null) return TypedResults.NotFound();

			// Before deleting the merchant, we need to remove the reference from all invoices that reference this merchant.
			foreach (var invoiceIdentifier in possibleMerchant.ReferencedInvoices)
			{
				var possibleInvoice = await invoiceProcessingService
					.ReadInvoice(invoiceIdentifier)
					.ConfigureAwait(false);
				if (possibleInvoice is not null)
				{
					possibleInvoice.MerchantReference = Guid.Empty;
					await invoiceProcessingService
						.UpdateInvoice(possibleInvoice, possibleInvoice.id)
						.ConfigureAwait(false);
				}
			}

			await invoiceProcessingService
				.DeleteMerchant(id, parentCompanyId)
				.ConfigureAwait(false);
			return TypedResults.NoContent();
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> RetrieveInvoicesFromMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveInvoicesFromMerchantAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleMerchant = await invoiceProcessingService
				.ReadMerchant(id)
				.ConfigureAwait(false);
			if (possibleMerchant is null) return TypedResults.NotFound();

			var listOfInvoiceIdentifiers = possibleMerchant.ReferencedInvoices;
			var listOfConcreteInvoices = new List<Invoice>();

			foreach (var identifier in listOfInvoiceIdentifiers)
			{
				var possibleInvoice = await invoiceProcessingService
					.ReadInvoice(identifier)
					.ConfigureAwait(false);
				listOfConcreteInvoices.Add(possibleInvoice);
			}

			if (listOfConcreteInvoices.Count == 0) return TypedResults.NotFound();
			return TypedResults.Ok(listOfConcreteInvoices);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> AddInvoiceToMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] IEnumerable<Guid> invoiceIdentifiers,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(AddInvoiceToMerchantAsync), ActivityKind.Server);
			var potentialUserIdentifer = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleMerchant = await invoiceProcessingService.ReadMerchant(id).ConfigureAwait(false);
			if (possibleMerchant is null) return TypedResults.NotFound();

			var listOfValidInvoices = new List<Invoice>();
			foreach (var identifier in invoiceIdentifiers)
			{
				var potentialInvoice = await invoiceProcessingService.ReadInvoice(identifier).ConfigureAwait(false);
				if (potentialInvoice is not null) listOfValidInvoices.Add(potentialInvoice);
			}

			foreach (var invoice in listOfValidInvoices)
			{
				possibleMerchant.ReferencedInvoices.Add(invoice.id);
				invoice.MerchantReference = possibleMerchant.id;

				await invoiceProcessingService
					.UpdateInvoice(invoice, invoice.id)
					.ConfigureAwait(false);
			}

			await invoiceProcessingService
				.UpdateMerchant(possibleMerchant, possibleMerchant.id)
				.ConfigureAwait(false);

			return TypedResults.Accepted($"/rest/v1/merchants/{id}", possibleMerchant);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> RemoveInvoiceFromMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] IEnumerable<Guid> invoiceIdentifiers,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveInvoiceFromMerchantAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleMerchant = await invoiceProcessingService
				.ReadMerchant(id)
				.ConfigureAwait(false);
			if (possibleMerchant is null) return TypedResults.NotFound();

			var listOfInvoicesToBeRemoved = new List<Invoice>();
			foreach (var identifier in invoiceIdentifiers)
			{
				var potentialInvoice = await invoiceProcessingService.ReadInvoice(identifier).ConfigureAwait(false);
				if (potentialInvoice is not null) listOfInvoicesToBeRemoved.Add(potentialInvoice);
			}

			foreach (var invoice in listOfInvoicesToBeRemoved)
			{
				possibleMerchant.ReferencedInvoices.Remove(invoice.id);
				invoice.MerchantReference = Guid.Empty;

				await invoiceProcessingService
					.UpdateInvoice(invoice, invoice.id)
					.ConfigureAwait(false);
			}

			await invoiceProcessingService
				.UpdateMerchant(possibleMerchant, possibleMerchant.id)
				.ConfigureAwait(false);
			return TypedResults.NoContent();
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}

	internal static async partial Task<IResult> RetrieveProductsFromMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveProductsFromMerchantAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleMerchant = await invoiceProcessingService
				.ReadMerchant(id)
				.ConfigureAwait(false);
			if (possibleMerchant is null) return TypedResults.NotFound();

			var listOfInvoices = possibleMerchant.ReferencedInvoices;
			var listOfProducts = new List<Product>();

			foreach (var identifier in listOfInvoices)
			{
				var potentialInvoice = await invoiceProcessingService
					.ReadInvoice(identifier)
					.ConfigureAwait(false);

				if (potentialInvoice is not null)
				{
					foreach (var product in potentialInvoice.Items)
					{
						listOfProducts.Add(product);
					}
				}
			}

			return TypedResults.Ok(listOfProducts);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}
	#endregion

	#region Analysis operations
	internal static async partial Task<IResult> AnalyzeInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] AnalysisOptions options,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(principal);

			var possibleInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			if (possibleInvoice is null) return TypedResults.NotFound();

			await invoiceProcessingService
				.AnalyzeInvoice(options, id, potentialUserIdentifier)
				.ConfigureAwait(false);

			var analyzedInvoice = await invoiceProcessingService
				.ReadInvoice(id, potentialUserIdentifier)
				.ConfigureAwait(false);
			return TypedResults.Ok(analyzedInvoice);
		}
		catch (InvoiceProcessingServiceValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service validation error.");
		}
		catch (InvoiceProcessingServiceDependencyException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency error.");
		}
		catch (InvoiceProcessingServiceDependencyValidationException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service dependency validation error.");
		}
		catch (InvoiceProcessingServiceException exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered a processing service error.");
		}
		catch (Exception exception)
		{
			return TypedResults.Problem(
				detail: exception.Message + exception.Source,
				statusCode: StatusCodes.Status500InternalServerError,
				title: "The service encountered an unexpected internal service error.");
		}
	}
	#endregion
}
