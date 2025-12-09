namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Response DTO indicating the result of a resource update operation.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Provides a standardized response for PUT/PATCH operations.</para>
/// <para><b>Usage:</b> Return this from handlers that update invoices, merchants, products, etc.</para>
/// </remarks>
/// <param name="Id">The identifier of the updated resource.</param>
/// <param name="Location">The URI where the resource can be retrieved.</param>
/// <param name="UpdatedAt">The timestamp when the resource was updated.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ResourceUpdatedResponseDto(
  Guid Id,
  string Location,
  DateTimeOffset UpdatedAt);
