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
  /// Registers CRUD + ancillary resource routes for the Invoice aggregate and its owned / associated sub-resources.
  /// </summary>
  /// <remarks>
  /// <para><b>Scope:</b> Core invoice lifecycle (create, read single/many, full replace, partial update, delete), product collection management, merchant association,
  /// scan (OCR source asset) management and arbitrary metadata dictionary operations.</para>
  /// <para><b>Design:</b> Separate route declarations from handler implementations to keep a clean composition boundary (OpenAPI metadata, auth policies, media types).</para>
  /// <para><b>Security:</b> All endpoints require authentication; fine‑grained authorization (roles / ownership) enforced in handler / service layers.</para>
  /// <para><b>Status Code Policy:</b> Uses:
  /// <list type="bullet">
  ///   <item><description><c>201 Created</c> for create operations producing new aggregates or sub-resources.</description></item>
  ///   <item><description><c>202 Accepted</c> for idempotent mutations that conceptually could become async (update / patch).</description></item>
  ///   <item><description><c>204 No Content</c> for destructive operations (delete).</description></item>
  ///   <item><description><c>409 Conflict</c> when attempting to create an already existing singular subordinate resource (e.g. scan already present).</description></item>
  /// </list></para>
  /// <para><b>OpenAPI:</b> Names each endpoint with handler method name via <see cref="EndpointNameMetadata"/> for consistent client generation keys.</para>
  /// <para><b>Extensibility:</b> Future concerns (pagination on list endpoints, ETag concurrency, conditional requests) SHOULD extend this mapping with additional
  /// metadata (e.g. <c>.WithMetadata(new ResponseCacheAttribute())</c> or custom filters) rather than modifying handlers.</para>
  /// </remarks>
  /// <param name="router">Route builder used during startup; MUST NOT be null.</param>
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
      .RequireAuthorization();

    router // Retrieve all invoices for a given user (extracted from principal context).
      .MapGet("/invoices", RetrieveAllInvoicesAsync)
      .Produces<IEnumerable<Invoice>>(StatusCodes.Status200OK)
      .ProducesProblem(StatusCodes.Status401Unauthorized)
      .ProducesProblem(StatusCodes.Status403Forbidden)
      .ProducesProblem(StatusCodes.Status404NotFound)
      .ProducesProblem(StatusCodes.Status429TooManyRequests)
      .ProducesProblem(StatusCodes.Status500InternalServerError)
      .WithName(nameof(RetrieveAllInvoicesAsync))
      .RequireAuthorization();

    router // Delete all invoices for a given user (extracted from principal context).
      .MapDelete("/invoices", DeleteInvoicesAsync)
      .Produces(StatusCodes.Status204NoContent)
      .ProducesProblem(StatusCodes.Status401Unauthorized)
      .ProducesProblem(StatusCodes.Status403Forbidden)
      .ProducesProblem(StatusCodes.Status404NotFound)
      .ProducesProblem(StatusCodes.Status429TooManyRequests)
      .ProducesProblem(StatusCodes.Status500InternalServerError)
      .WithName(nameof(DeleteInvoicesAsync))
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

    router // Delete a specific invoice, given its identifier.
      .MapDelete("/invoices/{id}", DeleteInvoiceAsync)
      .Produces(StatusCodes.Status204NoContent)
      .ProducesProblem(StatusCodes.Status400BadRequest)
      .ProducesProblem(StatusCodes.Status401Unauthorized)
      .ProducesProblem(StatusCodes.Status403Forbidden)
      .ProducesProblem(StatusCodes.Status404NotFound)
      .ProducesProblem(StatusCodes.Status429TooManyRequests)
      .ProducesProblem(StatusCodes.Status500InternalServerError)
      .WithName(nameof(DeleteInvoiceAsync))
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

    router // Update a product in a given invoice.
      .MapPut("/invoices/{id}/products", UpdateProductInInvoiceAsync)
      .Accepts<Product>("application/json")
      .Produces<Product>(StatusCodes.Status202Accepted)
      .ProducesProblem(StatusCodes.Status400BadRequest)
      .ProducesProblem(StatusCodes.Status401Unauthorized)
      .ProducesProblem(StatusCodes.Status403Forbidden)
      .ProducesProblem(StatusCodes.Status404NotFound)
      .ProducesProblem(StatusCodes.Status429TooManyRequests)
      .ProducesProblem(StatusCodes.Status500InternalServerError)
      .WithName(nameof(UpdateProductInInvoiceAsync))
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

    router // Update the invoice metadata for a given invoice.
      .MapPatch("/invoices/{id}/metadata", PatchInvoiceMetadataAsync)
      .Accepts<Dictionary<string, string>>("application/json")
      .Produces<Dictionary<string, string>>(StatusCodes.Status202Accepted)
      .ProducesProblem(StatusCodes.Status400BadRequest)
      .ProducesProblem(StatusCodes.Status401Unauthorized)
      .ProducesProblem(StatusCodes.Status403Forbidden)
      .ProducesProblem(StatusCodes.Status404NotFound)
      .ProducesProblem(StatusCodes.Status429TooManyRequests)
      .ProducesProblem(StatusCodes.Status500InternalServerError)
      .WithName(nameof(PatchInvoiceMetadataAsync))
      .RequireAuthorization();

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
      .RequireAuthorization();
  }

  /// <summary>
  /// Registers merchant aggregate endpoints and cross-aggregate relationship management routes (merchant ↔ invoice, merchant ↔ products via invoices).
  /// </summary>
  /// <remarks>
  /// <para><b>Scope:</b> Merchant CRUD plus association / dissociation of invoices and retrieval of transitive product collections.</para>
  /// <para><b>Consistency:</b> Association endpoints (patch / delete on invoices relationship) maintain bidirectional integrity (merchant reference on invoice
  /// and invoice id in merchant’s reference list) in handler layer; future refactor may move to domain service for transactional cohesion.</para>
  /// <para><b>Performance:</b> Retrieval of products across all merchant invoices performs N invoice reads; future optimization backlog: fan-out query or projection
  /// in persistence layer.</para>
  /// <para><b>Status Codes:</b> Mirrors invoice conventions; PATCH used for additive invoice linkage to avoid misuse of PUT semantics.</para>
  /// </remarks>
  /// <param name="router">Route builder used at startup configuration time.</param>
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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();

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
      .RequireAuthorization();
  }

  /// <summary>
  /// Registers invoice analysis endpoints (computational enrichment and AI / OCR driven classification).
  /// </summary>
  /// <remarks>
  /// <para><b>Operation:</b> Current surface exposes a single POST analyze route performing synchronous orchestration then returning <c>202 Accepted</c>.</para>
  /// <para><b>Backlog:</b> Potential evolution to long‑running asynchronous workflow (introduce operation status resource, webhooks or push notifications).</para>
  /// <para><b>Charging / Billing:</b> Includes <c>402 PaymentRequired</c> problem mapping placeholder for future usage-based billing enforcement.</para>
  /// <para><b>Idempotency:</b> Re-analysis overwrites prior enrichment; idempotent only when source inputs have not changed.</para>
  /// </remarks>
  /// <param name="router">Route builder instance.</param>
  private static void MapInvoiceAnalysisEndpoints(this IEndpointRouteBuilder router) => router // Analyze a specific invoice, given its identifier.
      .MapPost("/invoices/{id}/analyze", AnalyzeInvoiceAsync)
      .Accepts<AnalysisOptions>("application/json")
      .Produces(StatusCodes.Status202Accepted)
      .ProducesProblem(StatusCodes.Status400BadRequest)
      .ProducesProblem(StatusCodes.Status401Unauthorized)
      .ProducesProblem(StatusCodes.Status402PaymentRequired)
      .ProducesProblem(StatusCodes.Status403Forbidden)
      .ProducesProblem(StatusCodes.Status404NotFound)
      .ProducesProblem(StatusCodes.Status429TooManyRequests)
      .ProducesProblem(StatusCodes.Status500InternalServerError)
      .WithName(nameof(AnalyzeInvoiceAsync))
      .RequireAuthorization();
}
