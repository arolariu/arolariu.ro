namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using Azure.AI.FormRecognizer.DocumentAnalysis;

using Microsoft.Extensions.Logging;

using System;
using System.Threading.Tasks;

/// <summary>
/// The invoice analysis foundation service interface represents the foundation analysis service for the invoice domain.
/// </summary>
public partial class InvoiceAnalysisFoundationService : IInvoiceAnalysisFoundationService
{
	private readonly IClassifierBroker analysisBroker;
	private readonly ITranslatorBroker translatorBroker;
	private readonly IIdentifierBroker<AnalyzedDocument> receiptRecognizerBroker;
	private readonly ILogger<IInvoiceAnalysisFoundationService> logger;

	/// <summary>
	/// DI Constructor.
	/// </summary>
	/// <param name="analysisBroker"></param>
	/// <param name="translatorBroker"></param>
	/// <param name="receiptRecognizerBroker"></param>
	/// <param name="loggerFactory"></param>
	public InvoiceAnalysisFoundationService(
		IClassifierBroker analysisBroker,
		ITranslatorBroker translatorBroker,
		IIdentifierBroker<AnalyzedDocument> receiptRecognizerBroker,
		ILoggerFactory loggerFactory)
	{
		this.analysisBroker = analysisBroker;
		this.translatorBroker = translatorBroker;
		this.receiptRecognizerBroker = receiptRecognizerBroker;
		logger = loggerFactory.CreateLogger<IInvoiceAnalysisFoundationService>();
	}

	/// <inheritdoc/>
	public async Task AnalyzeInvoiceAsync(Invoice invoice, AnalysisOptions options) =>
	await TryCatchAsync(async () =>
	{
		ValidateInvoiceExists(invoice);
		ValidateAnalysisOptionsAreSet(options);

		await Task.CompletedTask.ConfigureAwait(false);

		throw new NotImplementedException(nameof(AnalyzeInvoiceAsync));
	}).ConfigureAwait(false);
}
