namespace arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using System;

using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;

using Microsoft.Extensions.Logging;

/// <summary>
/// Provides broker-neighboring OCR, generative, and taxonomy capabilities for the invoice analysis pipeline.
/// </summary>
public sealed partial class AnalysisFoundationService : IAnalysisFoundationService
{
  private readonly IDocumentIntelligenceBroker documentIntelligenceBroker;
  private readonly IGenerativeAnalysisBroker generativeAiBroker;
  private readonly ITaxonomyBroker taxonomyBroker;
  private readonly GenerativeAnalysisRetryPolicy retryPolicy;
  private readonly ILogger<IAnalysisFoundationService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationService"/> class.
  /// </summary>
  public AnalysisFoundationService(
    IDocumentIntelligenceBroker documentIntelligenceBroker,
    IGenerativeAnalysisBroker generativeAiBroker,
    ITaxonomyBroker taxonomyBroker,
    ILoggerFactory loggerFactory)
    : this(
      documentIntelligenceBroker,
      generativeAiBroker,
      taxonomyBroker,
      loggerFactory,
      new GenerativeAnalysisRetryPolicy())
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisFoundationService"/> class with an injected retry policy.
  /// </summary>
  internal AnalysisFoundationService(
    IDocumentIntelligenceBroker documentIntelligenceBroker,
    IGenerativeAnalysisBroker generativeAiBroker,
    ITaxonomyBroker taxonomyBroker,
    ILoggerFactory loggerFactory,
    GenerativeAnalysisRetryPolicy retryPolicy)
  {
    ArgumentNullException.ThrowIfNull(documentIntelligenceBroker);
    ArgumentNullException.ThrowIfNull(generativeAiBroker);
    ArgumentNullException.ThrowIfNull(taxonomyBroker);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    ArgumentNullException.ThrowIfNull(retryPolicy);

    this.documentIntelligenceBroker = documentIntelligenceBroker;
    this.generativeAiBroker = generativeAiBroker;
    this.taxonomyBroker = taxonomyBroker;
    this.retryPolicy = retryPolicy;
    logger = loggerFactory.CreateLogger<IAnalysisFoundationService>();
  }
}
