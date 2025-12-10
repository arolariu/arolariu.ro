namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Response DTO indicating successful creation of a resource via POST operation.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Provides a standardized response for HTTP POST operations that create
/// new resources, following REST best practices for resource creation responses.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>HTTP Semantics:</b> This DTO is typically returned with HTTP 201 Created status.
/// The <see cref="Location"/> field should be set in the Location header as well.
/// </para>
/// <para>
/// <b>Applicable Resources:</b> Used for invoices, merchants, products, scans, and any
/// other domain entity that supports creation via the API.
/// </para>
/// </remarks>
/// <param name="Id">
/// The unique identifier (Version 7 GUID) of the newly created resource.
/// Clients should use this ID for subsequent operations on the resource.
/// </param>
/// <param name="Location">
/// The absolute URI where the newly created resource can be retrieved via GET.
/// Follows the pattern: <c>/api/invoices/{id}</c> or similar.
/// </param>
/// <param name="CreatedAt">
/// UTC timestamp indicating when the resource was created.
/// Useful for client-side caching and audit purposes.
/// </param>
/// <example>
/// <code>
/// // Creating a resource and returning the response
/// var invoice = await invoiceService.CreateInvoiceAsync(request);
/// var response = new ResourceCreatedResponseDto(
///     Id: invoice.id,
///     Location: $"/api/invoices/{invoice.id}",
///     CreatedAt: invoice.CreatedAt);
///
/// return Results.Created(response.Location, response);
/// </code>
/// </example>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ResourceCreatedResponseDto(
  Guid Id,
  string Location,
  DateTimeOffset CreatedAt);
