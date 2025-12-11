namespace arolariu.Backend.Domain.Invoices.DTOs;

using System;

/// <summary>
/// Specifies the type of AI/ML analysis to perform on an invoice.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Controls the scope and depth of invoice analysis operations.
/// Different options have different computational costs and processing times.
/// </para>
/// <para>
/// <b>Usage:</b> Passed to the invoice analysis endpoint via <see cref="Requests.AnalyzeInvoiceRequestDto"/>.
/// </para>
/// <para>
/// <b>Processing Impact:</b>
/// <list type="bullet">
///   <item><description><see cref="NoAnalysis"/>: Immediate return, no AI processing.</description></item>
///   <item><description><see cref="InvoiceOnly"/>: Fast (~2-5 seconds), basic metadata extraction.</description></item>
///   <item><description><see cref="InvoiceItemsOnly"/>: Medium (~5-15 seconds), OCR and item parsing.</description></item>
///   <item><description><see cref="InvoiceMerchantOnly"/>: Fast (~2-5 seconds), merchant identification.</description></item>
///   <item><description><see cref="CompleteAnalysis"/>: Slow (~15-60 seconds), full pipeline with recipes.</description></item>
/// </list>
/// </para>
/// </remarks>
/// <seealso cref="Requests.AnalyzeInvoiceRequestDto"/>
[Serializable]
public enum AnalysisOptions
{
  /// <summary>
  /// Skip analysis entirely. Returns the invoice unchanged.
  /// </summary>
  /// <remarks>
  /// Use when you only need to validate invoice existence or retrieve current state
  /// without triggering any AI processing.
  /// </remarks>
  NoAnalysis,

  /// <summary>
  /// Perform comprehensive analysis including items, merchant, and recipe inference.
  /// </summary>
  /// <remarks>
  /// <para>
  /// Executes the full analysis pipeline:
  /// <list type="number">
  ///   <item><description>OCR extraction from scans</description></item>
  ///   <item><description>Line item parsing and categorization</description></item>
  ///   <item><description>Merchant identification and linking</description></item>
  ///   <item><description>Recipe inference from detected food items</description></item>
  ///   <item><description>Allergen detection</description></item>
  /// </list>
  /// </para>
  /// <para>
  /// <b>Cost:</b> Highest computational cost. Use sparingly for initial invoice processing.
  /// </para>
  /// </remarks>
  CompleteAnalysis,

  /// <summary>
  /// Analyze invoice metadata only (name, description, category, payment info).
  /// </summary>
  /// <remarks>
  /// Performs basic document analysis without extracting individual line items.
  /// Useful for quick categorization or when items are already manually entered.
  /// </remarks>
  InvoiceOnly,

  /// <summary>
  /// Extract and categorize line items from invoice scans via OCR.
  /// </summary>
  /// <remarks>
  /// <para>
  /// Focuses on product extraction:
  /// <list type="bullet">
  ///   <item><description>OCR text extraction from scans</description></item>
  ///   <item><description>Line item parsing (name, quantity, price)</description></item>
  ///   <item><description>Product categorization</description></item>
  ///   <item><description>Allergen detection for food items</description></item>
  /// </list>
  /// </para>
  /// <para>Does not identify merchant or infer recipes.</para>
  /// </remarks>
  InvoiceItemsOnly,

  /// <summary>
  /// Identify and link the merchant from invoice scans.
  /// </summary>
  /// <remarks>
  /// Extracts merchant information (name, address, category) and attempts to match
  /// against existing merchants in the system. Creates a new merchant if no match found.
  /// Does not extract line items or infer recipes.
  /// </remarks>
  InvoiceMerchantOnly,
}
