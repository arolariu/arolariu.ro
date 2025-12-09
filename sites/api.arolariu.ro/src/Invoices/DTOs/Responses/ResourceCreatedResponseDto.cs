namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Response DTO indicating the result of a resource creation operation.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Provides a standardized response for POST operations that create resources.</para>
/// <para><b>Usage:</b> Return this from handlers that create invoices, merchants, products, etc.</para>
/// </remarks>
/// <param name="Id">The identifier of the newly created resource.</param>
/// <param name="Location">The URI where the resource can be retrieved.</param>
/// <param name="CreatedAt">The timestamp when the resource was created.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ResourceCreatedResponseDto(
  Guid Id,
  string Location,
  DateTimeOffset CreatedAt);
