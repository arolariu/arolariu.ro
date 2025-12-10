namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Response DTO indicating successful update of a resource via PUT/PATCH operation.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Provides a standardized response for HTTP PUT and PATCH operations
/// that modify existing resources, following REST best practices.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>HTTP Semantics:</b> This DTO is typically returned with HTTP 200 OK status.
/// For idempotent PUT operations, confirms the resource state was updated.
/// For partial PATCH operations, confirms the specified fields were modified.
/// </para>
/// <para>
/// <b>Applicable Resources:</b> Used for invoices, merchants, products, metadata, and any
/// other domain entity that supports modification via the API.
/// </para>
/// </remarks>
/// <param name="Id">
/// The unique identifier (Version 7 GUID) of the updated resource.
/// Confirms which resource was modified by the operation.
/// </param>
/// <param name="Location">
/// The absolute URI where the updated resource can be retrieved via GET.
/// Follows the pattern: <c>/api/invoices/{id}</c> or similar.
/// </param>
/// <param name="UpdatedAt">
/// UTC timestamp indicating when the resource was last modified.
/// Useful for optimistic concurrency, caching, and audit trails.
/// </param>
/// <example>
/// <code>
/// // Updating a resource and returning the response
/// var invoice = await invoiceService.UpdateInvoiceAsync(id, request);
/// var response = new ResourceUpdatedResponseDto(
///     Id: invoice.id,
///     Location: $"/api/invoices/{invoice.id}",
///     UpdatedAt: invoice.LastUpdatedAt);
///
/// return Results.Ok(response);
/// </code>
/// </example>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ResourceUpdatedResponseDto(
  Guid Id,
  string Location,
  DateTimeOffset UpdatedAt);
