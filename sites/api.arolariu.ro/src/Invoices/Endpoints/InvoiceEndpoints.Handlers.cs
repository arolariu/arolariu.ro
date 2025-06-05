namespace arolariu.Backend.Domain.Invoices.Endpoints;
using System;
using System.Collections.Generic;
using System.Diagnostics;
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

	internal static async partial Task<IResult> RetrieveSpecificInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveSpecificInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var invoice = await invoiceProcessingService
					.ReadInvoice(id, potentialUserIdentifier)
					.ConfigureAwait(false);

				if (invoice is null)
				{
					var possibleInvoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);

					if (possibleInvoice is null) return Results.NotFound();
					var isInvoiceSharedWithUser = possibleInvoice.SharedWith.Contains(potentialUserIdentifier);

					if (isInvoiceSharedWithUser) return Results.Ok(possibleInvoice);
					else return Results.Forbid();
				}

				else return Results.Ok(invoice);
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var invoice = await invoiceProcessingService
					.ReadInvoice(id)
					.ConfigureAwait(false);

					if (invoice is null) return Results.NotFound();
					return Results.Ok(invoice);
				}

				return Results.Unauthorized();
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

	internal static async partial Task<IResult> RetrieveAllInvoicesAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllInvoicesAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);


			if (potentialUserIdentifier != Guid.Empty)
			{
				var invoices = await invoiceProcessingService
									.ReadInvoices(potentialUserIdentifier)
									.ConfigureAwait(false);
				return Results.Ok(invoices);
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var invoices = await invoiceProcessingService
										.ReadInvoices()
										.ConfigureAwait(false);
					return Results.Ok(invoices);
				}

				return Results.Unauthorized();
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
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var invoice = await invoiceProcessingService
					.ReadInvoice(id, potentialUserIdentifier)
					.ConfigureAwait(false);

				if (invoice is null) return Results.NotFound();


				var updatedInvoice = await invoiceProcessingService
						.UpdateInvoice(invoice.id, invoicePayload)
						.ConfigureAwait(false);
				return Results.Accepted(value: updatedInvoice);
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var invoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);

					var updatedInvoice = await invoiceProcessingService
						.UpdateInvoice(invoice.id, invoicePayload)
						.ConfigureAwait(false);

					return Results.Accepted(value: updatedInvoice);
				}

				return Results.Unauthorized();
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

	internal static async partial Task<IResult> DeleteInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var invoice = await invoiceProcessingService
					.ReadInvoice(id, potentialUserIdentifier)
					.ConfigureAwait(false);

				if (invoice is null)
				{
					var potentialInvoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);

					if (potentialInvoice is null) return Results.NotFound();
					else return Results.Forbid();
				}
				else
				{
					await invoiceProcessingService
						.DeleteInvoice(id, potentialUserIdentifier)
						.ConfigureAwait(false);

					return Results.NoContent();
				}
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					await invoiceProcessingService
					.DeleteInvoice(id)
					.ConfigureAwait(false);

					return Results.NoContent();
				}

				return Results.Unauthorized();
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
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var invoice = await invoiceProcessingService
					.ReadInvoice(id, potentialUserIdentifier)
					.ConfigureAwait(false);

				if (invoice is null) return Results.NotFound();

				var updatedInvoice = await invoiceProcessingService
					.AddProduct(invoice, product)
					.ConfigureAwait(false);

				return Results.Accepted(value: updatedInvoice);
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var invoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);

					var updatedInvoice = await invoiceProcessingService
						.AddProduct(invoice, product)
						.ConfigureAwait(false);

					return Results.Accepted(value: updatedInvoice);
				}

				return Results.Unauthorized();
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

	internal static async partial Task<IResult> RetrieveProductsFromInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveProductsFromInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var invoice = await invoiceProcessingService
					.ReadInvoice(id, potentialUserIdentifier)
					.ConfigureAwait(false);

				if (invoice is null)
				{
					var potentialInvoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);

					if (potentialInvoice is null) return Results.NotFound();
					var isSharedWithUser = potentialInvoice.SharedWith.Contains(potentialUserIdentifier);
					if (!isSharedWithUser) return Results.Forbid();

					var products = await invoiceProcessingService
						.GetProducts(potentialInvoice)
						.ConfigureAwait(false);

					return Results.Ok(products);
				}

				else
				{
					var products = await invoiceProcessingService
						.GetProducts(invoice)
						.ConfigureAwait(false);

					return Results.Ok(products);
				}
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var invoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);

					var products = await invoiceProcessingService
						.GetProducts(invoice)
						.ConfigureAwait(false);

					return Results.Ok(products);
				}

				return Results.Unauthorized();
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

	internal static async partial Task<IResult> RemoveProductFromInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromQuery] string productName,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveProductFromInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var invoice = await invoiceProcessingService
					.ReadInvoice(id, potentialUserIdentifier)
					.ConfigureAwait(false);

				if (invoice is null) return Results.NotFound();
				var product = await invoiceProcessingService
					.GetProduct(invoice, productName)
					.ConfigureAwait(false);

				if (product is null) return Results.NotFound();
				var updatedInvoice = await invoiceProcessingService
										.DeleteProduct(invoice, product)
										.ConfigureAwait(false);

				return Results.Accepted(value: updatedInvoice);
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var invoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);

					if (invoice is null) return Results.NotFound();
					var product = await invoiceProcessingService
						.GetProduct(invoice, productName)
						.ConfigureAwait(false);

					if (product is null) return Results.NotFound();
					var updatedInvoice = await invoiceProcessingService
											.DeleteProduct(invoice, product)
											.ConfigureAwait(false);

					return Results.Accepted(value: updatedInvoice);
				}

				return Results.Unauthorized();
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
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var invoice = await invoiceProcessingService
					.ReadInvoice(id, potentialUserIdentifier)
					.ConfigureAwait(false);

				if (invoice is null) return Results.NotFound();
				var product = await invoiceProcessingService
						.GetProduct(invoice, productName)
						.ConfigureAwait(false);

				if (product is null) return Results.NotFound();

				var updatedInvoiceWithDeletedProduct = await invoiceProcessingService
					.DeleteProduct(invoice, product)
					.ConfigureAwait(false);

				var updatedInvoiceWithAddedProduct = await invoiceProcessingService
					.AddProduct(updatedInvoiceWithDeletedProduct, productInformation)
					.ConfigureAwait(false);

				return Results.Accepted(value: updatedInvoiceWithAddedProduct);
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var invoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);

					if (invoice is null) return Results.NotFound();
					var product = await invoiceProcessingService
						.GetProduct(invoice, productName)
						.ConfigureAwait(false);

					var updatedInvoiceWithDeletedProduct = await invoiceProcessingService
						.DeleteProduct(invoice, product)
						.ConfigureAwait(false);

					var updatedInvoiceWithAddedProduct = await invoiceProcessingService
						.AddProduct(updatedInvoiceWithDeletedProduct, productInformation)
						.ConfigureAwait(false);

					return Results.Accepted(value: updatedInvoiceWithAddedProduct);
				}

				return Results.Unauthorized();
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

	internal static async partial Task<IResult> RetrieveMerchantFromInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveMerchantFromInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var invoice = await invoiceProcessingService
					.ReadInvoice(id, potentialUserIdentifier)
					.ConfigureAwait(false);

				if (invoice is null)
				{
					var potentialInvoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);
					if (potentialInvoice is null) return Results.NotFound();
					var isSharedWithUser = potentialInvoice.SharedWith.Contains(potentialUserIdentifier);

					if (!isSharedWithUser) return Results.Forbid();

					var potentialMerchantReference = potentialInvoice.MerchantReference;
					if (potentialMerchantReference == Guid.Empty) return Results.NotFound();

					var potentialMerchant = await invoiceProcessingService
						.ReadMerchant(potentialMerchantReference)
						.ConfigureAwait(false);
					if (potentialMerchant is null) return Results.NotFound();
					return Results.Ok(potentialMerchant);
				}
				else
				{
					var potentialMerchantReference = invoice.MerchantReference;
					if (potentialMerchantReference == Guid.Empty) return Results.NotFound();

					var potentialMerchant = await invoiceProcessingService
						.ReadMerchant(potentialMerchantReference)
						.ConfigureAwait(false);

					if (potentialMerchant is null) return Results.NotFound();
					return Results.Ok(potentialMerchant);
				}
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var invoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);

					if (invoice is null) return Results.NotFound();
					var potentialMerchantReference = invoice.MerchantReference;
					if (potentialMerchantReference == Guid.Empty) return Results.NotFound();

					var potentialMerchant = await invoiceProcessingService
						.ReadMerchant(potentialMerchantReference)
						.ConfigureAwait(false);

					if (potentialMerchant is null) return Results.NotFound();
					return Results.Ok(potentialMerchant);
				}

				return Results.Unauthorized();
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
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var invoice = await invoiceProcessingService
					.ReadInvoice(id, potentialUserIdentifier)
					.ConfigureAwait(false);

				if (invoice is null) return Results.NotFound();

				var potentialMerchantReference = invoice.MerchantReference;
				if (potentialMerchantReference != Guid.Empty) return Results.Conflict();

				invoice.MerchantReference = merchant.id;
				var updatedInvoice = await invoiceProcessingService
					.UpdateInvoice(invoice.id, invoice)
					.ConfigureAwait(false);

				return Results.Accepted(value: updatedInvoice);
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var invoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);

					if (invoice is null) return Results.NotFound();
					var potentialMerchantReference = invoice.MerchantReference;
					if (potentialMerchantReference != Guid.Empty) return Results.Conflict();

					invoice.MerchantReference = merchant.id;
					var updatedInvoice = await invoiceProcessingService
						.UpdateInvoice(invoice.id, invoice)
						.ConfigureAwait(false);

					return Results.Accepted(value: updatedInvoice);
				}

				return Results.Unauthorized();
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

	internal static async partial Task<IResult> RemoveMerchantFromInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveMerchantFromInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var invoice = await invoiceProcessingService
					.ReadInvoice(id, potentialUserIdentifier)
					.ConfigureAwait(false);

				if (invoice is null) return Results.NotFound();

				var potentialMerchantReference = invoice.MerchantReference;
				if (potentialMerchantReference == Guid.Empty) return Results.NotFound();

				invoice.MerchantReference = Guid.Empty;
				var updatedInvoice = await invoiceProcessingService
					.UpdateInvoice(invoice.id, invoice)
					.ConfigureAwait(false);

				return Results.Accepted(value: updatedInvoice);
			}

			else
			{
				if(IsPrincipalSuperUser(principal))
				{
					var invoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);

					if (invoice is null) return Results.NotFound();
					var potentialMerchantReference = invoice.MerchantReference;
					if (potentialMerchantReference == Guid.Empty) return Results.NotFound();

					invoice.MerchantReference = Guid.Empty;
					var updatedInvoice = await invoiceProcessingService
						.UpdateInvoice(invoice.id, invoice)
						.ConfigureAwait(false);

					return Results.Accepted(value: updatedInvoice);
				}

				return Results.Unauthorized();
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

	internal static async partial Task<IResult> UpdateMerchantInInvoiceAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		[FromBody] Merchant merchant,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchantInInvoiceAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);


			if (potentialUserIdentifier != Guid.Empty)
			{
				var invoice = await invoiceProcessingService
					.ReadInvoice(id, potentialUserIdentifier)
					.ConfigureAwait(false);

				if (invoice is null) return Results.NotFound();
				if (invoice.MerchantReference != Guid.Empty) return Results.Conflict();

				invoice.MerchantReference = merchant.id;
				var updatedInvoice = await invoiceProcessingService
					.UpdateInvoice(invoice.id, invoice)
					.ConfigureAwait(false);

				return Results.Accepted(value: updatedInvoice);
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var invoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);

					if (invoice is null) return Results.NotFound();
					if (invoice.MerchantReference != Guid.Empty) return Results.Conflict();

					invoice.MerchantReference = merchant.id;
					var updatedInvoice = await invoiceProcessingService
						.UpdateInvoice(invoice.id, invoice)
						.ConfigureAwait(false);

					return Results.Accepted(value: updatedInvoice);
				}

				return Results.Unauthorized();
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
			var merchant = merchantDto.ToMerchant();
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				await invoiceProcessingService
					.CreateMerchant(merchant)
					.ConfigureAwait(false);

				return Results.Created($"/rest/merchants/{merchant.id}", merchant);
			}

			else
			{
				if(IsPrincipalSuperUser(principal))
				{
					await invoiceProcessingService
						.CreateMerchant(merchant)
						.ConfigureAwait(false);

					return Results.Created($"/rest/merchants/{merchant.id}", merchant);
				}

				return Results.Unauthorized();
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

	internal static async partial Task<IResult> RetrieveAllMerchantsAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromBody] Guid parentCompanyId,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllMerchantsAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var merchants = await invoiceProcessingService
						.ReadMerchants(parentCompanyId)
						.ConfigureAwait(false);

				return Results.Ok(merchants);

			}

			else
			{
				if(IsPrincipalSuperUser(principal))
				{
					var merchants = await invoiceProcessingService
							.ReadMerchants(parentCompanyId)
							.ConfigureAwait(false);

					return Results.Ok(merchants);
				}

				return Results.Unauthorized();
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
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var merchant = await invoiceProcessingService
					.ReadMerchant(id, parentCompanyId)
					.ConfigureAwait(false);

				if (merchant is null) return Results.NotFound();
				return Results.Ok(merchant);
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var merchant = await invoiceProcessingService
						.ReadMerchant(id, parentCompanyId)
						.ConfigureAwait(false);

					if (merchant is null) return Results.NotFound();
					return Results.Ok(merchant);
				}

				return Results.Unauthorized();
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
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var merchant = await invoiceProcessingService
					.ReadMerchant(id, merchantPayload.ParentCompanyId)
					.ConfigureAwait(false);

				if (merchant is null) return Results.NotFound();
				var updatedMerchant = await invoiceProcessingService
					.UpdateMerchant(merchant.id, merchantPayload)
					.ConfigureAwait(false);

				return Results.Accepted(value: updatedMerchant);
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var merchant = await invoiceProcessingService
						.ReadMerchant(id, merchantPayload.ParentCompanyId)
						.ConfigureAwait(false);

					if (merchant is null) return Results.NotFound();
					var updatedMerchant = await invoiceProcessingService
						.UpdateMerchant(merchant.id, merchantPayload)
						.ConfigureAwait(false);

					return Results.Accepted(value: updatedMerchant);
				}

				return Results.Unauthorized();
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
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var merchant = await invoiceProcessingService
					.ReadMerchant(id, parentCompanyId)
					.ConfigureAwait(false);

				if (merchant is null) return Results.NotFound();
				await invoiceProcessingService
					.DeleteMerchant(id, parentCompanyId)
					.ConfigureAwait(false);

				return Results.NoContent();
			}

			else
			{
				if(IsPrincipalSuperUser(principal))
				{
					var merchant = await invoiceProcessingService
						.ReadMerchant(id, parentCompanyId)
						.ConfigureAwait(false);

					if (merchant is null) return Results.NotFound();
					await invoiceProcessingService
						.DeleteMerchant(id, parentCompanyId)
						.ConfigureAwait(false);

					return Results.NoContent();
				}

				return Results.Unauthorized();
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

	internal static async partial Task<IResult> RetrieveInvoicesFromMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveInvoicesFromMerchantAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var merchant = await invoiceProcessingService.ReadMerchant(id).ConfigureAwait(false);
				if (merchant is null) return Results.NotFound();
				var listOfInvoiceIdentifiers = merchant.ReferencedInvoices;
				var listOfConcreteInvoices = new List<Invoice>();

				foreach(var identifier in listOfInvoiceIdentifiers)
				{
					var possibleInvoice = await invoiceProcessingService.ReadInvoice(identifier).ConfigureAwait(false);
					listOfConcreteInvoices.Add(possibleInvoice);
				}

				return Results.Ok(listOfConcreteInvoices);
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var merchant = await invoiceProcessingService.ReadMerchant(id).ConfigureAwait(false);
					if (merchant is null) return Results.NotFound();
					var listOfInvoiceIdentifiers = merchant.ReferencedInvoices;
					var listOfConcreteInvoices = new List<Invoice>();

					foreach (var identifier in listOfInvoiceIdentifiers)
					{
						var possibleInvoice = await invoiceProcessingService.ReadInvoice(identifier).ConfigureAwait(false);
						listOfConcreteInvoices.Add(possibleInvoice);
					}

					return Results.Ok(listOfConcreteInvoices);
				}

				return Results.Unauthorized();
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
			var potentialUserIdentifer = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifer != Guid.Empty)
			{
				var merchant = await invoiceProcessingService.ReadMerchant(id).ConfigureAwait(false);
				if(merchant is null) return Results.NotFound();

				var listOfValidInvoices = new List<Invoice>();
				foreach(var identifier in invoiceIdentifiers)
				{
					var potentialInvoice = await invoiceProcessingService.ReadInvoice(identifier).ConfigureAwait(false);
					if (potentialInvoice is not null) listOfValidInvoices.Add(potentialInvoice);
				}

				foreach (var invoice in listOfValidInvoices)
				{
					merchant.ReferencedInvoices.Add(invoice.id);
				}

				var updatedMerchant = await invoiceProcessingService.UpdateMerchant(merchant.id, merchant).ConfigureAwait(false);
				return Results.Accepted(value: updatedMerchant);
			}

			else
			{
				if(IsPrincipalSuperUser(principal))
				{
					var merchant = await invoiceProcessingService.ReadMerchant(id).ConfigureAwait(false);
					if (merchant is null) return Results.NotFound();

					var listOfValidInvoices = new List<Invoice>();
					foreach (var identifier in invoiceIdentifiers)
					{
						var potentialInvoice = await invoiceProcessingService.ReadInvoice(identifier).ConfigureAwait(false);
						if (potentialInvoice is not null) listOfValidInvoices.Add(potentialInvoice);
					}

					foreach (var invoice in listOfValidInvoices)
					{
						merchant.ReferencedInvoices.Add(invoice.id);
					}

					var updatedMerchant = await invoiceProcessingService.UpdateMerchant(merchant.id, merchant).ConfigureAwait(false);
					return Results.Accepted(value: updatedMerchant);
				}

				return Results.Unauthorized();
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
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var merchant = await invoiceProcessingService.ReadMerchant(id).ConfigureAwait(false);
				if (merchant is null) return Results.NotFound();
				var listOfInvoicesToBeRemoved = new List<Invoice>();

				foreach(var identifier in invoiceIdentifiers)
				{
					var potentialInvoice = await invoiceProcessingService.ReadInvoice(identifier).ConfigureAwait(false);
					if (potentialInvoice is not null) listOfInvoicesToBeRemoved.Add(potentialInvoice);
				}

				foreach (var invoice in listOfInvoicesToBeRemoved)
				{
					merchant.ReferencedInvoices.Remove(invoice.id);
				}

				var updatedMerchant = await invoiceProcessingService.UpdateMerchant(merchant.id, merchant).ConfigureAwait(false);
				return Results.Accepted(value: updatedMerchant);
			}

			else
			{
				if(IsPrincipalSuperUser(principal))
				{
					var merchant = await invoiceProcessingService.ReadMerchant(id).ConfigureAwait(false);
					if (merchant is null) return Results.NotFound();
					var listOfInvoicesToBeRemoved = new List<Invoice>();

					foreach (var identifier in invoiceIdentifiers)
					{
						var potentialInvoice = await invoiceProcessingService.ReadInvoice(identifier).ConfigureAwait(false);
						if (potentialInvoice is not null) listOfInvoicesToBeRemoved.Add(potentialInvoice);
					}

					foreach (var invoice in listOfInvoicesToBeRemoved)
					{
						merchant.ReferencedInvoices.Remove(invoice.id);
					}

					var updatedMerchant = await invoiceProcessingService.UpdateMerchant(merchant.id, merchant).ConfigureAwait(false);
					return Results.Accepted(value: updatedMerchant);
				}

				return Results.Unauthorized();
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

	internal static async partial Task<IResult> RetrieveProductsFromMerchantAsync(
		[FromServices] IInvoiceProcessingService invoiceProcessingService,
		[FromServices] IHttpContextAccessor httpContext,
		[FromRoute] Guid id,
		ClaimsPrincipal principal)
	{
		try
		{
			using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveProductsFromMerchantAsync), ActivityKind.Server);
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var merchant = await invoiceProcessingService.ReadMerchant(id).ConfigureAwait(false);
				if (merchant is null) return Results.NotFound();
				var listOfInvoices = merchant.ReferencedInvoices;
				var listOfProducts = new List<Product>();

				foreach (var identifier in listOfInvoices)
				{
					var potentialInvoice = await invoiceProcessingService.ReadInvoice(identifier).ConfigureAwait(false);
					if (potentialInvoice is not null)
					{
						foreach (var product in potentialInvoice.Items)
						{
							listOfProducts.Add(product);
						}
					}
				}

				return Results.Ok(listOfProducts);
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var merchant = await invoiceProcessingService.ReadMerchant(id).ConfigureAwait(false);
					if (merchant is null) return Results.NotFound();
					var listOfInvoices = merchant.ReferencedInvoices;
					var listOfProducts = new List<Product>();

					foreach (var identifier in listOfInvoices)
					{
						var potentialInvoice = await invoiceProcessingService.ReadInvoice(identifier).ConfigureAwait(false);
						if (potentialInvoice is not null)
						{
							foreach (var product in potentialInvoice.Items)
							{
								listOfProducts.Add(product);
							}
						}
					}

					return Results.Ok(listOfProducts);
				}

				return Results.Unauthorized();
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
			var potentialUserIdentifier = RetrieveUserIdentifierFromPrincipal(principal);

			if (potentialUserIdentifier != Guid.Empty)
			{
				var invoice = await invoiceProcessingService
					.ReadInvoice(id, potentialUserIdentifier)
					.ConfigureAwait(false);

				// We will analyze the invoice without blocking the request (fire and forget).
				await invoiceProcessingService
					.AnalyzeInvoice(invoice, options)
					.ConfigureAwait(false);

				return Results.Accepted(value: $"Invoice with id: {id} sent for analysis.");
			}

			else
			{
				if (IsPrincipalSuperUser(principal))
				{
					var invoice = await invoiceProcessingService
						.ReadInvoice(id)
						.ConfigureAwait(false);

					// We will analyze the invoice without blocking the request (fire and forget).
					await invoiceProcessingService
						.AnalyzeInvoice(invoice, options)
						.ConfigureAwait(false);

					return Results.Accepted(value: $"Invoice with id: {id} sent for analysis.");
				}

				return Results.Unauthorized();
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
	#endregion
}
