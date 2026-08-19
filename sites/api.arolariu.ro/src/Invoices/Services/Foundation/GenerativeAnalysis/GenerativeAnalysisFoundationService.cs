namespace arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using System;

using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;

using Microsoft.Extensions.Logging;

/// <summary>
/// Provides the reusable structured generation engine for the invoice analysis pipeline.
/// </summary>
public sealed partial class GenerativeAnalysisFoundationService : IGenerativeAnalysisFoundationService
{
  private readonly IGenerativeAnalysisBroker generativeAiBroker;
  private readonly GenerativeAnalysisRetryPolicy retryPolicy;
  private readonly ILogger<IGenerativeAnalysisFoundationService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="GenerativeAnalysisFoundationService"/> class.
  /// </summary>
  public GenerativeAnalysisFoundationService(
    IGenerativeAnalysisBroker generativeAiBroker,
    ILoggerFactory loggerFactory)
    : this(generativeAiBroker, loggerFactory, new GenerativeAnalysisRetryPolicy())
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="GenerativeAnalysisFoundationService"/> class with an injected retry policy.
  /// </summary>
  internal GenerativeAnalysisFoundationService(
    IGenerativeAnalysisBroker generativeAiBroker,
    ILoggerFactory loggerFactory,
    GenerativeAnalysisRetryPolicy retryPolicy)
  {
    ArgumentNullException.ThrowIfNull(generativeAiBroker);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    ArgumentNullException.ThrowIfNull(retryPolicy);
    this.generativeAiBroker = generativeAiBroker;
    this.generativeAiBroker = generativeAiBroker;
    this.retryPolicy = retryPolicy;
    logger = loggerFactory.CreateLogger<IGenerativeAnalysisFoundationService>();
  }
}
