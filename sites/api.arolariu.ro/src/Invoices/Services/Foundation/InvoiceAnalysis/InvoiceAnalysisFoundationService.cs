namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using Microsoft.Extensions.Logging;

/// <summary>
/// The invoice analysis foundation service interface represents the foundation analysis service for the invoice domain.
/// </summary>
public partial class InvoiceAnalysisFoundationService : IInvoiceAnalysisFoundationService
{
	private readonly IOpenAiBroker analysisBroker;
	private readonly ITranslatorBroker translatorBroker;
	private readonly IFormRecognizerBroker receiptRecognizerBroker;
	private readonly ILogger<IInvoiceAnalysisFoundationService> logger;

	/// <summary>
	/// DI Constructor.
	/// </summary>
	/// <param name="analysisBroker"></param>
	/// <param name="translatorBroker"></param>
	/// <param name="receiptRecognizerBroker"></param>
	/// <param name="loggerFactory"></param>
	public InvoiceAnalysisFoundationService(
		IOpenAiBroker analysisBroker,
		ITranslatorBroker translatorBroker,
		IFormRecognizerBroker receiptRecognizerBroker,
		ILoggerFactory loggerFactory)
	{
		this.analysisBroker = analysisBroker;
		this.translatorBroker = translatorBroker;
		this.receiptRecognizerBroker = receiptRecognizerBroker;
		logger = loggerFactory.CreateLogger<IInvoiceAnalysisFoundationService>();
	}

	/// <inheritdoc/>
	public async Task<Invoice> AnalyzeInvoiceAsync(AnalysisOptions options, Invoice invoice) =>
	await TryCatchAsync(async () =>
	{
		invoice = await PerformOcrAnalysis(invoice, options).ConfigureAwait(false);
		invoice = await PerformTranslationAnalysis(invoice).ConfigureAwait(false);
		invoice = await PerformGptAnalysis(invoice, options).ConfigureAwait(false);

		invoice.NumberOfUpdates++;

		return invoice;
	}).ConfigureAwait(false);

	private async Task<Invoice> PerformOcrAnalysis(Invoice invoice, AnalysisOptions options)
	{
		return await receiptRecognizerBroker
			.PerformOcrAnalysisOnSingleInvoice(invoice, options)
			.ConfigureAwait(false);
	}

	private async Task<Invoice> PerformTranslationAnalysis(Invoice invoice)
	{
		foreach (var product in invoice.Items)
		{
			var productRawName = product.RawName;
			var translatedName = await translatorBroker
				.Translate(productRawName)
				.ConfigureAwait(false);

			product.GenericName = translatedName;
		}
		return invoice;
	}
	private async Task<Invoice> PerformGptAnalysis(Invoice invoice, AnalysisOptions options)
	{
		return await analysisBroker
			.PerformGptAnalysisOnSingleInvoice(invoice, options)
			.ConfigureAwait(false);
	}
}
