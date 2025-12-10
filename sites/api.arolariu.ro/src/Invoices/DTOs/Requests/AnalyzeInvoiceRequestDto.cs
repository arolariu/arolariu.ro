namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Request DTO for triggering AI-powered invoice analysis and enrichment.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Specifies which analysis operations should be performed on an invoice.
/// The analysis pipeline uses Azure Document Intelligence and Azure OpenAI to extract
/// and enrich invoice data.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Analysis Types:</b>
/// <list type="bullet">
///   <item><description><see cref="AnalysisOptions.NoAnalysis"/>: Skip AI processing.</description></item>
///   <item><description><see cref="AnalysisOptions.CompleteAnalysis"/>: Full extraction and enrichment.</description></item>
///   <item><description><see cref="AnalysisOptions.InvoiceOnly"/>: Extract invoice-level data only.</description></item>
///   <item><description><see cref="AnalysisOptions.InvoiceItemsOnly"/>: Extract line items only.</description></item>
///   <item><description><see cref="AnalysisOptions.InvoiceMerchantOnly"/>: Extract merchant data only.</description></item>
/// </list>
/// </para>
/// <para>
/// <b>Processing Time:</b> <c>CompleteAnalysis</c> may take 10-30 seconds depending on
/// invoice complexity. Consider using background processing for large batches.
/// </para>
/// </remarks>
/// <param name="Options">
/// The type of analysis to perform on the invoice. Required.
/// Determines which AI extraction pipelines are executed.
/// </param>
/// <example>
/// <code>
/// // Request complete analysis
/// var request = new AnalyzeInvoiceRequestDto(AnalysisOptions.CompleteAnalysis);
///
/// // Request merchant extraction only
/// var merchantOnly = new AnalyzeInvoiceRequestDto(AnalysisOptions.InvoiceMerchantOnly);
/// </code>
/// </example>
/// <seealso cref="AnalysisOptions"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct AnalyzeInvoiceRequestDto(
  [Required] AnalysisOptions Options)
{
  /// <summary>
  /// Converts this DTO to the domain <see cref="AnalysisOptions"/> value.
  /// </summary>
  /// <remarks>
  /// Simple passthrough method provided for consistency with other DTO conversion patterns.
  /// </remarks>
  /// <returns>
  /// The <see cref="AnalysisOptions"/> value encapsulated by this DTO.
  /// </returns>
  public AnalysisOptions ToAnalysisOptions() => Options;
}
