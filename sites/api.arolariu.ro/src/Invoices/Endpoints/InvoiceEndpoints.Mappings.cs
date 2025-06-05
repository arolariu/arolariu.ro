namespace arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

using System;
using System.Collections.Generic;

public static partial class InvoiceEndpoints
{
	/// <summary>
	/// Maps the standard invoice endpoints for the web application.
	/// </summary>
	/// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
	private static void MapStandardInvoiceEndpoints(this IEndpointRouteBuilder router)
	{
		router
			.MapPost("/invoices", CreateNewInvoiceAsync)
			.Accepts<CreateInvoiceDto>("application/json")
			.Produces<Invoice>(StatusCodes.Status201Created)
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

		router
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

		router
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

		router
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

		router
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

		router
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

		router
			.MapPost("/invoices/{id}/products", AddProductToInvoiceAsync)
			.Accepts<Product>("application/json")
			.Produces<Invoice>(StatusCodes.Status201Created)
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

		router
			.MapDelete("/invoices/{id}/products", RemoveProductFromInvoiceAsync)
			.Produces<Invoice>(StatusCodes.Status204NoContent)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RemoveProductFromInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router
			.MapPatch("/invoices/{id}/products", UpdateProductInInvoiceAsync)
			.Accepts<Product>("application/json")
			.Produces<Invoice>(StatusCodes.Status202Accepted)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(UpdateProductInInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router
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

		router
			.MapPost("/invoices/{id}/merchant", AddMerchantToInvoiceAsync)
			.Accepts<Merchant>("application/json")
			.Produces<Invoice>(StatusCodes.Status201Created)
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

		router
			.MapDelete("/invoices/{id}/merchant", RemoveMerchantFromInvoiceAsync)
			.Produces<Invoice>(StatusCodes.Status204NoContent)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RemoveMerchantFromInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router
			.MapPatch("/invoices/{id}/merchant", UpdateMerchantInInvoiceAsync)
			.Accepts<Merchant>("application/json")
			.Produces<Invoice>(StatusCodes.Status202Accepted)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(UpdateMerchantInInvoiceAsync))
			.RequireAuthorization()
			.WithOpenApi();
	}

	/// <summary>
	/// Maps the merchant endpoints for the web application.
	/// </summary>
	/// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
	private static void MapStandardMerchantEndpoints(this IEndpointRouteBuilder router)
	{
		router
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

		router
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

		router
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

		router
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

		router
			.MapDelete("/merchants/{id}", DeleteMerchantAsync)
			.Produces<Merchant>(StatusCodes.Status204NoContent)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(DeleteMerchantAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router
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

		router
			.MapPut("/merchants/{id}/invoices", AddInvoiceToMerchantAsync)
			.Accepts<IEnumerable<Guid>>("application/json")
			.Produces<Merchant>(StatusCodes.Status202Accepted)
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

		router
			.MapDelete("/merchants/{id}/invoices", RemoveInvoiceFromMerchantAsync)
			.Accepts<IEnumerable<Guid>>("application/json")
			.Produces<Merchant>(StatusCodes.Status204NoContent)
			.ProducesProblem(StatusCodes.Status400BadRequest)
			.ProducesProblem(StatusCodes.Status401Unauthorized)
			.ProducesProblem(StatusCodes.Status403Forbidden)
			.ProducesProblem(StatusCodes.Status404NotFound)
			.ProducesProblem(StatusCodes.Status429TooManyRequests)
			.ProducesProblem(StatusCodes.Status500InternalServerError)
			.WithName(nameof(RemoveInvoiceFromMerchantAsync))
			.RequireAuthorization()
			.WithOpenApi();

		router
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
		router
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
