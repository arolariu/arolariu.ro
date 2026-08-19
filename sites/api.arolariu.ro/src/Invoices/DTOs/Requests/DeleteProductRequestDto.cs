namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Identifies the first invoice product to delete by name.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct DeleteProductRequestDto(
  [Required] string ProductName);
