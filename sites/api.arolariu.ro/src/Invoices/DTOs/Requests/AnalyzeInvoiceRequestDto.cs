namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Data transfer object for triggering invoice analysis.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Encapsulates the analysis options when requesting invoice enrichment.</para>
/// <para><b>Options:</b> See <see cref="AnalysisOptions"/> for available analysis modes.</para>
/// </remarks>
/// <param name="Options">The type of analysis to perform on the invoice.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct AnalyzeInvoiceRequestDto(
  [Required] AnalysisOptions Options)
{
  /// <summary>
  /// Converts this DTO to the domain <see cref="AnalysisOptions"/> value.
  /// </summary>
  /// <returns>The <see cref="AnalysisOptions"/> value represented by this DTO.</returns>
  public AnalysisOptions ToAnalysisOptions() => Options;
}
