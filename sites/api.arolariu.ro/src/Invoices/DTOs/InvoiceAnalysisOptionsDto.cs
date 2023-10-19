using System;

namespace arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// This class represents the invoice analysis options DTO.
/// </summary>
[Serializable]
public sealed class InvoiceAnalysisOptionsDto
{
    /// <summary>
    /// Do a complete analysis of the invoice.
    /// </summary>
    public bool CompleteAnalysis { get; set; } = false;

    /// <summary>
    /// Analyze the invoice description.
    /// </summary>
    public bool InvoiceOnly { get; set; } = false;

    /// <summary>
    /// Analyze the invoice items only.
    /// </summary>
    public bool InvoiceItemsOnly { get; set; } = false;
}
