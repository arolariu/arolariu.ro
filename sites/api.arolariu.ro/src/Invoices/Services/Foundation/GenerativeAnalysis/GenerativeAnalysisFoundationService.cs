namespace arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Provides the reusable structured analysis engine for summaries, merchant descriptions, allergen assessments,
/// classifications, and recipes.
/// </summary>
public sealed partial class GenerativeAnalysisFoundationService : IGenerativeAnalysisFoundationService
{
  private readonly IGenerativeAnalysisBroker generativeAiBroker;
  private readonly ITaxonomyBroker taxonomyBroker;
  private readonly GenerativeAnalysisRetryPolicy retryPolicy;
  private readonly ILogger<IGenerativeAnalysisFoundationService> logger;

  /// <summary>
  /// Initializes a new instance of the <see cref="GenerativeAnalysisFoundationService"/> class.
  /// </summary>
  /// <param name="generativeAiBroker">The provider-neutral generative AI broker.</param>
  /// <param name="taxonomyBroker">The canonical taxonomy catalog broker.</param>
  /// <param name="loggerFactory">The logger factory used to create the service logger.</param>
  public GenerativeAnalysisFoundationService(
    IGenerativeAnalysisBroker generativeAiBroker,
    ITaxonomyBroker taxonomyBroker,
    ILoggerFactory loggerFactory)
    : this(generativeAiBroker, taxonomyBroker, loggerFactory, new GenerativeAnalysisRetryPolicy())
  {
  }

  /// <summary>
  /// Initializes a new instance of the <see cref="GenerativeAnalysisFoundationService"/> class with an injected retry policy.
  /// </summary>
  /// <param name="generativeAiBroker">The provider-neutral generative AI broker.</param>
  /// <param name="taxonomyBroker">The canonical taxonomy catalog broker.</param>
  /// <param name="loggerFactory">The logger factory used to create the service logger.</param>
  /// <param name="retryPolicy">The bounded transient-failure retry policy applied to generative AI calls.</param>
  internal GenerativeAnalysisFoundationService(
    IGenerativeAnalysisBroker generativeAiBroker,
    ITaxonomyBroker taxonomyBroker,
    ILoggerFactory loggerFactory,
    GenerativeAnalysisRetryPolicy retryPolicy)
  {
    ArgumentNullException.ThrowIfNull(generativeAiBroker);
    ArgumentNullException.ThrowIfNull(taxonomyBroker);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    ArgumentNullException.ThrowIfNull(retryPolicy);

    this.generativeAiBroker = generativeAiBroker;
    this.taxonomyBroker = taxonomyBroker;
    this.retryPolicy = retryPolicy;
    logger = loggerFactory.CreateLogger<IGenerativeAnalysisFoundationService>();
  }

  /// <inheritdoc/>
  public async Task<ProductClassificationResult> ClassifyProductsAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(
      async () =>
      {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ClassifyProductsAsync));
        ValidateProductsAreSet(products);

        ClassificationSubject[] subjects = products
          .Select(product => new ClassificationSubject(product.CorrelationToken, product.Product.Name))
          .ToArray();

        IReadOnlyDictionary<string, StandardClassification> classifications = await ClassifyBatchAsync(
          AnalysisCapability.ProductClassification,
          ClassificationSystem.Gs1Gpc,
          subjects,
          cancellationToken)
          .ConfigureAwait(false);

        return new ProductClassificationResult(classifications);
      },
      cancellationToken)
      .ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<InvoiceClassificationResult> ClassifyInvoiceAsync(
    ReceiptExtractionResult extraction,
    ProductClassificationResult products,
    Guid sourceRunId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(
      async () =>
      {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ClassifyInvoiceAsync));
        ValidateExtractionIsSet(extraction);
        ValidateProductClassificationResultIsSet(products);
        ValidateSourceRunId(sourceRunId, nameof(sourceRunId));

        var subject = new ClassificationSubject(sourceRunId.ToString(), BuildInvoiceDescription(extraction, products));

        IReadOnlyDictionary<string, StandardClassification> classifications = await ClassifyBatchAsync(
          AnalysisCapability.InvoiceClassification,
          ClassificationSystem.EcoicopV2,
          [subject],
          cancellationToken)
          .ConfigureAwait(false);

        return new InvoiceClassificationResult(classifications[subject.CorrelationToken]);
      },
      cancellationToken)
      .ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<MerchantClassificationResult> ClassifyMerchantAsync(
    Merchant merchant,
    Guid sourceRunId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(
      async () =>
      {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ClassifyMerchantAsync));
        ValidateMerchantIsSet(merchant);
        ValidateSourceRunId(sourceRunId, nameof(sourceRunId));

        var subject = new ClassificationSubject(sourceRunId.ToString(), BuildMerchantDescription(merchant));

        IReadOnlyDictionary<string, StandardClassification> classifications = await ClassifyBatchAsync(
          AnalysisCapability.MerchantClassification,
          ClassificationSystem.Nace21,
          [subject],
          cancellationToken)
          .ConfigureAwait(false);

        return new MerchantClassificationResult(classifications[subject.CorrelationToken]);
      },
      cancellationToken)
      .ConfigureAwait(false);
}
