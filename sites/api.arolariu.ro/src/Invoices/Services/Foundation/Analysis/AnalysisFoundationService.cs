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
  /// <param name="documentIntelligenceBroker">The broker used for typed receipt extraction.</param>
  /// <param name="generativeAiBroker">The broker used for structured generative capabilities.</param>
  /// <param name="taxonomyBroker">The broker used for deterministic taxonomy search and resolution.</param>
  /// <param name="loggerFactory">The factory used to create the foundation logger.</param>
  /// <exception cref="ArgumentNullException">Thrown when a required dependency is <see langword="null"/>.</exception>
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
  /// <param name="documentIntelligenceBroker">The broker used for typed receipt extraction.</param>
  /// <param name="generativeAiBroker">The broker used for structured generative capabilities.</param>
  /// <param name="taxonomyBroker">The broker used for deterministic taxonomy search and resolution.</param>
  /// <param name="loggerFactory">The factory used to create the foundation logger.</param>
  /// <param name="retryPolicy">The bounded policy applied to transient generative dependency failures.</param>
  /// <exception cref="ArgumentNullException">Thrown when a required dependency is <see langword="null"/>.</exception>
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
