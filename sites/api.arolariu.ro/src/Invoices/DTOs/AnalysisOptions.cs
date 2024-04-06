using System;

namespace arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// This class represents the invoice analysis options DTO.
/// </summary>
[Serializable]
public enum AnalysisOptions
{
    /// <summary>
    /// No analysis.
    /// </summary>
    NoAnalysis,

    /// <summary>
    /// Do a complete analysis of the invoice.
    /// </summary>
    CompleteAnalysis,

    /// <summary>
    /// Analyze the invoice description.
    /// </summary>
    InvoiceOnly,

    /// <summary>
    /// Analyze the invoice items only.
    /// </summary>
    InvoiceItemsOnly,
}
