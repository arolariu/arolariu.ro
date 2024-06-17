namespace arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DTOs;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

using System.Collections.Generic;

public static partial class InvoiceEndpoints
{
	/// <summary>
	/// Maps the standard invoice endpoints for the web application.
	/// </summary>
	/// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
	private static void MapStandardInvoiceEndpoints(IEndpointRouteBuilder router)
	{
		router
			.MapPost("/rest/invoices", CreateNewInvoiceAsync)
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
			.MapGet("/rest/invoices", RetrieveAllInvoicesAsync)
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
			.MapGet("/rest/invoices/{id}", RetrieveSpecificInvoiceAsync)
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
			.MapPut("/rest/invoices/{id}", UpdateSpecificInvoiceAsync)
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
			.MapDelete("/rest/invoices/{id}", DeleteInvoiceAsync)
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
	}

	/// <summary>
	/// Maps the merchant endpoints for the web application.
	/// </summary>
	/// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
	private static void MapStandardMerchantEndpoints(IEndpointRouteBuilder router)
	{
		router
			.MapGet("/rest/merchants", RetrieveAllMerchantsAsync)
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
			.MapPost("/rest/merchants", CreateNewMerchantAsync)
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
			.MapGet("/rest/merchants/{id}", RetrieveSpecificMerchantAsync)
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
			.MapPut("/rest/merchants/{id}", UpdateSpecificMerchantAsync)
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
			.MapDelete("/rest/merchants/{id}", DeleteMerchantAsync)
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
	}

	/// <summary>
	/// The invoice analysis endpoints.
	/// </summary>
	/// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
	private static void MapInvoiceAnalysisEndpoints(IEndpointRouteBuilder router)
	{
		router
			.MapPost("/rest/invoices/{id}/analyze", AnalyzeInvoiceAsync)
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
