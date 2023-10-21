using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.Entities.Invoices;

/// <summary>
/// This struct represents the invoice metadata.
/// This metadata is used to store additional information about the invoice.
/// The metadata contains both system-assigned and user-assigned information.
/// Thus, the struct is divided into two parts: system-assigned and user-assigned.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public record struct InvoiceMetadata(
    bool IsAnalyzed,
    bool IsEdited,
    bool IsComplete,
    bool IsSoftDeleted,
    bool IsImportant);
