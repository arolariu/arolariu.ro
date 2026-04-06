namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using Microsoft.Extensions.Logging;

/// <summary>
/// The invoice analysis foundation service interface represents the foundation analysis service for the invoice domain.
/// </summary>
public partial class InvoiceAnalysisFoundationService : IInvoiceAnalysisFoundationService
{
  private readonly IClassifierBroker analysisBroker;
  private readonly IFormRecognizerBroker receiptRecognizerBroker;
  private readonly ILogger<IInvoiceAnalysisFoundationService> logger;

  /// <summary>
  /// DI Constructor.
  /// </summary>
  /// <param name="analysisBroker">The GPT/AI classifier broker for product categorization and allergen detection.</param>
  /// <param name="receiptRecognizerBroker">The OCR broker for extracting invoice data from images.</param>
  /// <param name="loggerFactory">The logger factory for creating scoped loggers.</param>
  public InvoiceAnalysisFoundationService(
    IClassifierBroker analysisBroker,
    IFormRecognizerBroker receiptRecognizerBroker,
    ILoggerFactory loggerFactory)
  {
    this.analysisBroker = analysisBroker;
    this.receiptRecognizerBroker = receiptRecognizerBroker;
    logger = loggerFactory.CreateLogger<IInvoiceAnalysisFoundationService>();
  }

  /// <inheritdoc/>
  public async Task<Invoice> AnalyzeInvoiceAsync(AnalysisOptions options, Invoice invoice) =>
  await TryCatchAsync(async () =>
  {
    invoice = await PerformOcrAnalysis(invoice, options).ConfigureAwait(false);
    invoice = await PerformGptAnalysis(invoice, options).ConfigureAwait(false);

    invoice.NumberOfUpdates++;

    return invoice;
  }).ConfigureAwait(false);

  private async Task<Invoice> PerformOcrAnalysis(Invoice invoice, AnalysisOptions options) => await receiptRecognizerBroker
      .PerformOcrAnalysisOnSingleInvoice(invoice, options)
      .ConfigureAwait(false);

  private async Task<Invoice> PerformGptAnalysis(Invoice invoice, AnalysisOptions options) => await analysisBroker
      .PerformGptAnalysisOnSingleInvoice(invoice, options)
      .ConfigureAwait(false);
}
