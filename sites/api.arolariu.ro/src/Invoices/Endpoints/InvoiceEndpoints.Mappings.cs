namespace arolariu.Backend.Domain.Invoices.Endpoints;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

public static partial class InvoiceEndpoints
{
	/// <summary>
	/// Maps the standard invoice endpoints for the web application.
	/// </summary>
	/// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
	private static void MapStandardInvoiceEndpoints(this IEndpointRouteBuilder router)
	{
		router // Create a new invoice for a given user (extracted from principal context).
			.MapPost("/invoices", CreateNewInvoiceAsync)
			.Accepts<CreateInvoiceDto>("application/json")
			.Produces(StatusCodes.Status201Created)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status409Conflict)
			.ProducesProblem(StatusCodes.Status413PayloadTooLarge)
			.ProducesProblem(StatusCodes.Status415UnsupportedMediaType)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(CreateNewInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Retrieve all invoices for a given user (extracted from principal context).
			.MapGet("/invoices", RetrieveAllInvoicesAsync)
			.Produces<IEnumerable<Invoice>>(StatusCodes.Status200OK)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RetrieveAllInvoicesAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Delete all invoices for a given user (extracted from principal context).
			.MapDelete("/invoices", DeleteInvoicesAsync)
			.Produces(StatusCodes.Status204NoContent)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(DeleteInvoicesAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Retrieve a specific invoice, given its identifier.
			.MapGet("/invoices/{id}", RetrieveSpecificInvoiceAsync)
			.Produces<Invoice>(StatusCodes.Status200OK)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RetrieveSpecificInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Update a specific invoice, given its identifier.
			.MapPut("/invoices/{id}", UpdateSpecificInvoiceAsync)
			.Accepts<Invoice>("application/json")
			.Produces<Invoice>(StatusCodes.Status202Accepted)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(UpdateSpecificInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Partially update a specific invoice, given its identifier.
			.MapPatch("/invoices/{id}", PatchSpecificInvoiceAsync)
			.Accepts<Invoice>("application/json")
			.Produces<Invoice>(StatusCodes.Status202Accepted)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(PatchSpecificInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Delete a specific invoice, given its identifier.
			.MapDelete("/invoices/{id}", DeleteInvoiceAsync)
			.Produces<Invoice>(StatusCodes.Status204NoContent)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(DeleteInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Retrieve all products for a given invoice.
			.MapGet("/invoices/{id}/products", RetrieveProductsFromInvoiceAsync)
			.Produces<IEnumerable<Product>>(StatusCodes.Status200OK)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RetrieveProductsFromInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Add a new product to a given invoice.
			.MapPost("/invoices/{id}/products", AddProductToInvoiceAsync)
			.Accepts<Product>("application/json")
			.Produces(StatusCodes.Status201Created)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status409Conflict)
			.ProducesProblem(StatusCodes.Status413PayloadTooLarge)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(AddProductToInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Remove a product from a given invoice.
			.MapDelete("/invoices/{id}/products", RemoveProductFromInvoiceAsync)
			.Accepts<string>("application/json")
			.Produces(StatusCodes.Status204NoContent)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RemoveProductFromInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Update a product in a given invoice.
			.MapPatch("/invoices/{id}/products", UpdateProductInInvoiceAsync)
			.Accepts<Product>("application/json")
			.Produces<Product>(StatusCodes.Status202Accepted)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(UpdateProductInInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Retrieve the merchant associated with a given invoice.
			.MapGet("/invoices/{id}/merchant", RetrieveMerchantFromInvoiceAsync)
			.Produces<Merchant>(StatusCodes.Status200OK)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RetrieveMerchantFromInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Add a merchant to a given invoice.
			.MapPost("/invoices/{id}/merchant", AddMerchantToInvoiceAsync)
			.Accepts<Merchant>("application/json")
			.Produces(StatusCodes.Status201Created)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status409Conflict)
			.ProducesProblem(StatusCodes.Status413PayloadTooLarge)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(AddMerchantToInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Remove the merchant from a given invoice.
			.MapDelete("/invoices/{id}/merchant", RemoveMerchantFromInvoiceAsync)
			.Produces(StatusCodes.Status204NoContent)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RemoveMerchantFromInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Update the merchant in a given invoice.
			.MapPut("/invoices/{id}/merchant", UpdateMerchantInInvoiceAsync)
			.Accepts<Merchant>("application/json")
			.Produces(StatusCodes.Status202Accepted)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(UpdateMerchantInInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Create the invoice scan for a given invoice.
			.MapPost("/invoices/{id}/scan", CreateInvoiceScanAsync)
			.Accepts<InvoiceScan>("application/json")
			.Produces(StatusCodes.Status201Created)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status409Conflict)
			.ProducesProblem(StatusCodes.Status413PayloadTooLarge)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(CreateInvoiceScanAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Retrieve the invoice scan for a given invoice.
			.MapGet("/invoices/{id}/scan", RetrieveInvoiceScanAsync)
			.Produces<InvoiceScan>(StatusCodes.Status200OK)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status409Conflict)
			.ProducesProblem(StatusCodes.Status413PayloadTooLarge)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RetrieveInvoiceScanAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Update the invoice scan for a given invoice.
			.MapPut("/invoices/{id}/scan", UpdateInvoiceScanAsync)
			.Accepts<InvoiceScan>("application/json")
			.Produces<InvoiceScan>(StatusCodes.Status202Accepted)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(UpdateInvoiceScanAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Delete the invoice scan for a given invoice.
			.MapDelete("/invoices/{id}/scan", DeleteInvoiceScanAsync)
			.Produces(StatusCodes.Status204NoContent)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(DeleteInvoiceScanAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Retrieve the invoice metadata for a given invoice.
			.MapGet("/invoices/{id}/metadata", RetrieveInvoiceMetadataAsync)
			.Produces<Dictionary<string, string>>(StatusCodes.Status200OK)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RetrieveInvoiceMetadataAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Update the invoice metadata for a given invoice.
			.MapPatch("/invoices/{id}/metadata", PatchInvoiceMetadataAsync)
			.Accepts<Dictionary<string, string>>("application/json")
			.Produces(StatusCodes.Status202Accepted)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(PatchInvoiceMetadataAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Delete the invoice metadata for a given invoice.
			.MapDelete("/invoices/{id}/metadata", DeleteInvoiceMetadataAsync)
			.Accepts<IEnumerable<string>>("application/json")
			.Produces(StatusCodes.Status204NoContent)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(DeleteInvoiceMetadataAsync))
			.RequireAuthorization()
			.WithOpenApi();
	}

	/// <summary>
	/// Maps the merchant endpoints for the web application.
	/// </summary>
	/// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
	private static void MapStandardMerchantEndpoints(this IEndpointRouteBuilder router)
	{
		router // Retrieve all merchants.
			.MapGet("/merchants", RetrieveAllMerchantsAsync)
			.Produces<IEnumerable<Merchant>>(StatusCodes.Status200OK)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RetrieveAllMerchantsAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Create a new merchant.
			.MapPost("/merchants", CreateNewMerchantAsync)
			.Produces<Merchant>(StatusCodes.Status201Created)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status409Conflict)
			.ProducesProblem(StatusCodes.Status413PayloadTooLarge)
			.ProducesProblem(StatusCodes.Status415UnsupportedMediaType)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(CreateNewMerchantAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Retrieve a specific merchant, given its identifier.
			.MapGet("/merchants/{id}", RetrieveSpecificMerchantAsync)
			.Produces<Merchant>(StatusCodes.Status200OK)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RetrieveSpecificMerchantAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Update a specific merchant, given its identifier.
			.MapPut("/merchants/{id}", UpdateSpecificMerchantAsync)
			.Accepts<Merchant>("application/json")
			.Produces<Merchant>(StatusCodes.Status202Accepted)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(UpdateSpecificMerchantAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Delete a specific merchant, given its identifier.
			.MapDelete("/merchants/{id}", DeleteMerchantAsync)
			.Produces(StatusCodes.Status204NoContent)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(DeleteMerchantAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Retrieve all invoices associated with a given merchant.
			.MapGet("/merchants/{id}/invoices", RetrieveInvoicesFromMerchantAsync)
			.Produces<IEnumerable<Invoice>>(StatusCodes.Status200OK)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RetrieveInvoicesFromMerchantAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Add invoices to a given merchant.
			.MapPatch("/merchants/{id}/invoices", AddInvoiceToMerchantAsync)
			.Accepts<IEnumerable<Guid>>("application/json")
			.Produces(StatusCodes.Status202Accepted)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status409Conflict)
			.ProducesProblem(StatusCodes.Status413PayloadTooLarge)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(AddInvoiceToMerchantAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Remove invoices from a given merchant.
			.MapDelete("/merchants/{id}/invoices", RemoveInvoiceFromMerchantAsync)
			.Accepts<IEnumerable<Guid>>("application/json")
			.Produces(StatusCodes.Status204NoContent)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RemoveInvoiceFromMerchantAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router // Retrieve all products associated with a given merchant.
			.MapGet("/merchants/{id}/products", RetrieveProductsFromMerchantAsync)
			.Produces<IEnumerable<Product>>(StatusCodes.Status200OK)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RetrieveProductsFromMerchantAsync))
			.RequireAuthorization()
			.WithOpenApi();
	}

	/// <summary>
	/// The invoice analysis endpoints.
	/// </summary>
	/// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
	private static void MapInvoiceAnalysisEndpoints(this IEndpointRouteBuilder router)
	{
		router // Analyze a specific invoice, given its identifier.
			.MapPost("/invoices/{id}/analyze", AnalyzeInvoiceAsync)
			.Accepts<AnalysisOptions>("application/json")
			.Produces(StatusCodes.Status200OK)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status402PaymentRequired)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(AnalyzeInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();
	}
}
