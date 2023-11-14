using System;

namespace arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// This class represents the invoice analysis options DTO.
/// </summary>
[Serializable]
public enum AnalysisOptionsDto
{
    /// <summary>
    /// No analysis.
    /// </summary>
    NoAnalysis = 0,

    /// <summary>
    /// Do a complete analysis of the invoice.
    /// </summary>
    CompleteAnalysis = 10,

    /// <summary>
    /// Analyze the invoice description.
    /// </summary>
    InvoiceOnly = 20,

    /// <summary>
    /// Analyze the invoice items only.
    /// </summary>
    InvoiceItemsOnly = 30,
}
