using System;
using System.Runtime.InteropServices;

namespace arolariu.Backend.Core.Domain.Invoices.Entities.Invoices;

/// <summary>
/// This struct represents the invoice metadata.
/// This metadata is used to store additional information about the invoice.
/// The metadata contains both system-assigned and user-assigned information.
/// Thus, the struct is divided into two parts: system-assigned and user-assigned.
/// </summary>
[Serializable]
[StructLayout(LayoutKind.Auto)]
public partial record struct InvoiceMetadata
{
    /// <summary>
    /// Parametrized constructor.
    /// </summary>
    /// <param name="isAnalyzed"></param>
    /// <param name="isEdited"></param>
    /// <param name="isComplete"></param>
    /// <param name="isSoftDeleted"></param>
    /// <param name="isImportant"></param>
    public InvoiceMetadata(
        bool isAnalyzed,
        bool isEdited,
        bool isComplete,
        bool isSoftDeleted,
        bool isImportant) : this()
    {
        IsAnalyzed = isAnalyzed;
        IsEdited = isEdited;
        IsComplete = isComplete;
        IsSoftDeleted = isSoftDeleted;
        IsImportant = isImportant;
    }

    /// <summary>
    /// Basic constructor.
    /// </summary>
    public InvoiceMetadata()
    {
    }
}
