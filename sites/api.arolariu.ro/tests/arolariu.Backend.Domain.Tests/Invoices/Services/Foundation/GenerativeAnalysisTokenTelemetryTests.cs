namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Diagnostics.Metrics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Telemetry.Metering;
using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAiBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using GenerativeService = arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis.GenerativeAnalysisFoundationService;

/// <summary>
/// Verifies token, retry, and provider-refusal telemetry emitted by the generative analysis foundation service.
/// </summary>
[TestClass]
[DoNotParallelize]
public sealed class GenerativeAnalysisTokenTelemetryTests
{
  /// <summary>
  /// Verifies that absent provider usage metadata records no token measurements.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_UsageIsNull_RecordsNoTokenMeasurements()
  {
    IReadOnlyList<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      () => ExecuteSummaryAsync(modelId: "gpt-test", usage: null),
      "invoices.analysis.tokens.input",
      "invoices.analysis.tokens.output");

    Assert.AreEqual(0, measurements.Count);
  }

  /// <summary>
  /// Verifies that usage metadata with no input or output counts records no fabricated zero-token measurements.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_UsageCountsAreNull_RecordsNoTokenMeasurements()
  {
    IReadOnlyList<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      () => ExecuteSummaryAsync("gpt-test", new GenerativeUsage(null, null, 44)),
      "invoices.analysis.tokens.input",
      "invoices.analysis.tokens.output");

    Assert.AreEqual(0, measurements.Count);
  }

  /// <summary>
  /// Verifies that usage metadata with only an input count records only the input token instrument.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_OnlyInputUsage_RecordsInputTokenMeasurement()
  {
    IReadOnlyList<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      () => ExecuteSummaryAsync("model-router", new GenerativeUsage(17, null, 17)),
      "invoices.analysis.tokens.input",
      "invoices.analysis.tokens.output");

    CapturedMeasurement measurement = measurements.Single();
    Assert.AreEqual("invoices.analysis.tokens.input", measurement.InstrumentName);
    Assert.AreEqual(17L, measurement.Value);
    AssertTag(measurement.Tags, "capability", "invoice_summary");
    AssertTag(measurement.Tags, "model.id", "model-router");
  }

  /// <summary>
  /// Verifies that usage metadata with only an output count records only the output token instrument.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_OnlyOutputUsage_RecordsOutputTokenMeasurement()
  {
    IReadOnlyList<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      () => ExecuteSummaryAsync("model-router", new GenerativeUsage(null, 23, 23)),
      "invoices.analysis.tokens.input",
      "invoices.analysis.tokens.output");

    CapturedMeasurement measurement = measurements.Single();
    Assert.AreEqual("invoices.analysis.tokens.output", measurement.InstrumentName);
    Assert.AreEqual(23L, measurement.Value);
    AssertTag(measurement.Tags, "capability", "invoice_summary");
    AssertTag(measurement.Tags, "model.id", "model-router");
  }

  /// <summary>
  /// Verifies that usage metadata with both counts records both token instruments.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_BothUsageCounts_RecordsInputAndOutputTokenMeasurements()
  {
    IReadOnlyList<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      () => ExecuteSummaryAsync("model-router", new GenerativeUsage(31, 13, 44)),
      "invoices.analysis.tokens.input",
      "invoices.analysis.tokens.output");

    CapturedMeasurement input = measurements.Single(measurement => measurement.InstrumentName == "invoices.analysis.tokens.input");
    CapturedMeasurement output = measurements.Single(measurement => measurement.InstrumentName == "invoices.analysis.tokens.output");

    Assert.AreEqual(31L, input.Value);
    Assert.AreEqual(13L, output.Value);
    AssertTag(input.Tags, "capability", "invoice_summary");
    AssertTag(output.Tags, "model.id", "model-router");
  }

  /// <summary>
  /// Verifies the priced, explicitly allowlisted underlying model emits an exact non-billing USD estimate with the
  /// finite pricing catalog version and the same bounded version dimensions as token telemetry.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_PricedModelWithCompleteUsage_RecordsExactEstimatedUsdCost()
  {
    IReadOnlyList<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      () => ExecuteSummaryAsync("gpt-4o-mini", new GenerativeUsage(1_000_000, 1_000_000, 2_000_000)),
      "invoices.analysis.tokens.input",
      "invoices.analysis.tokens.output",
      "invoices.analysis.cost.estimated");

    CapturedMeasurement input = measurements.Single(measurement => measurement.InstrumentName == "invoices.analysis.tokens.input");
    CapturedMeasurement output = measurements.Single(measurement => measurement.InstrumentName == "invoices.analysis.tokens.output");
    CapturedMeasurement cost = measurements.Single(measurement => measurement.InstrumentName == "invoices.analysis.cost.estimated");

    Assert.AreEqual(1_000_000L, input.Value);
    Assert.AreEqual(1_000_000L, output.Value);
    Assert.AreEqual(0.75d, (double)cost.Value, 0.0000000001d);
    AssertTag(cost.Tags, "capability", "invoice_summary");
    AssertTag(cost.Tags, "model.id", "gpt-4o-mini");
    AssertTag(cost.Tags, "schema.version", "invoice-summary-schema-v1");
    AssertTag(cost.Tags, "prompt.version", "invoice-summary-prompt-v1");
    AssertTag(cost.Tags, "taxonomy.version", "not_applicable");
    AssertTag(cost.Tags, "pricing.version", "openai-api-pricing-2026-08-17");
    AssertTag(cost.Tags, "outcome", "success");
  }

  /// <summary>
  /// Verifies the unpriced router still produces token telemetry but no cost estimate even when provider usage is
  /// complete, because its dynamic underlying model is not known.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_ModelRouterWithCompleteUsage_OmitsCostAndRetainsVersionedTokens()
  {
    IReadOnlyList<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      () => ExecuteSummaryAsync("model-router", new GenerativeUsage(17, 23, 40)),
      "invoices.analysis.tokens.input",
      "invoices.analysis.tokens.output",
      "invoices.analysis.cost.estimated");

    CapturedMeasurement token = measurements.Single(measurement => measurement.InstrumentName == "invoices.analysis.tokens.input");
    Assert.AreEqual(17L, token.Value);
    AssertTag(token.Tags, "model.id", "model-router");
    AssertTag(token.Tags, "schema.version", "invoice-summary-schema-v1");
    AssertTag(token.Tags, "prompt.version", "invoice-summary-prompt-v1");
    AssertTag(token.Tags, "taxonomy.version", "not_applicable");
    AssertTag(token.Tags, "outcome", "success");
    Assert.AreEqual(0, measurements.Count(measurement => measurement.InstrumentName == "invoices.analysis.cost.estimated"));
  }

  /// <summary>
  /// Verifies an otherwise priced model with partial provider usage retains the available token measurement but
  /// omits cost rather than estimating an unreported token side as zero.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_PricedModelWithPartialUsage_OmitsCostAndRetainsToken()
  {
    IReadOnlyList<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      () => ExecuteSummaryAsync("gpt-4o-mini", new GenerativeUsage(17, null, 17)),
      "invoices.analysis.tokens.input",
      "invoices.analysis.tokens.output",
      "invoices.analysis.cost.estimated");

    CapturedMeasurement token = measurements.Single(measurement => measurement.InstrumentName == "invoices.analysis.tokens.input");
    Assert.AreEqual(17L, token.Value);
    AssertTag(token.Tags, "model.id", "gpt-4o-mini");
    AssertTag(token.Tags, "outcome", "success");
    Assert.AreEqual(0, measurements.Count(measurement => measurement.InstrumentName == "invoices.analysis.cost.estimated"));
  }

  /// <summary>
  /// Verifies that missing provider model identifiers are normalized to the bounded unknown model tag.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_ModelIdIsNull_RecordsUnknownModelTag()
  {
    IReadOnlyList<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      () => ExecuteSummaryAsync(modelId: null, usage: new GenerativeUsage(5, null, 5)),
      "invoices.analysis.tokens.input");

    CapturedMeasurement measurement = measurements.Single();
    AssertTag(measurement.Tags, "model.id", "unknown");
  }

  /// <summary>
  /// Verifies an arbitrary provider-controlled model identifier is never exported by token telemetry or logs.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_ProviderModelIdIsArbitrary_UsesUnknownTelemetryAndLogValue()
  {
    const string ProviderModelId = "provider-controlled-model-8f172fb9-9f81-4db7-b856-c38f7543b4e4";
    using var loggerProvider = new CapturingLoggerProvider();
    using ILoggerFactory loggerFactory = LoggerFactory.Create(builder =>
      builder.SetMinimumLevel(LogLevel.Trace).AddProvider(loggerProvider));

    IReadOnlyList<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      () => ExecuteSummaryAsync(
        ProviderModelId,
        new GenerativeUsage(5, 7, 12),
        loggerFactory),
      "invoices.analysis.tokens.input",
      "invoices.analysis.cost.estimated");

    CapturedMeasurement measurement = measurements.Single(item => item.InstrumentName == "invoices.analysis.tokens.input");
    AssertTag(measurement.Tags, "model.id", "unknown");
    AssertTag(measurement.Tags, "schema.version", "invoice-summary-schema-v1");
    AssertTag(measurement.Tags, "prompt.version", "invoice-summary-prompt-v1");
    AssertTag(measurement.Tags, "taxonomy.version", "not_applicable");
    AssertTag(measurement.Tags, "outcome", "success");
    Assert.AreEqual(0, measurements.Count(item => item.InstrumentName == "invoices.analysis.cost.estimated"));
    Assert.IsFalse(loggerProvider.Messages.Any(message => message.Contains(ProviderModelId, StringComparison.Ordinal)));
    Assert.IsTrue(loggerProvider.Messages.Any(message => message.Contains("unknown", StringComparison.Ordinal)));
    Assert.IsTrue(loggerProvider.Messages.Any(message => message.Contains("invoice-summary-schema-v1", StringComparison.Ordinal)));
    Assert.IsTrue(loggerProvider.Messages.Any(message => message.Contains("not_applicable", StringComparison.Ordinal)));
  }

  /// <summary>
  /// Verifies an oversized provider-controlled model identifier is never exported by token telemetry or logs.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_ProviderModelIdIsOversized_UsesUnknownTelemetryAndLogValue()
  {
    string providerModelId = new('x', 4097);
    using var loggerProvider = new CapturingLoggerProvider();
    using ILoggerFactory loggerFactory = LoggerFactory.Create(builder =>
      builder.SetMinimumLevel(LogLevel.Trace).AddProvider(loggerProvider));

    IReadOnlyList<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      () => ExecuteSummaryAsync(
        providerModelId,
        new GenerativeUsage(5, null, 5),
        loggerFactory),
      "invoices.analysis.tokens.input");

    CapturedMeasurement measurement = measurements.Single();
    AssertTag(measurement.Tags, "model.id", "unknown");
    Assert.IsFalse(loggerProvider.Messages.Any(message => message.Contains(providerModelId, StringComparison.Ordinal)));
    Assert.IsTrue(loggerProvider.Messages.Any(message => message.Contains("unknown", StringComparison.Ordinal)));
  }

  /// <summary>
  /// Verifies that a scheduled retry records the capability retry metric with the failed attempt number.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_TransientFailureThenSuccess_RecordsRetryAttemptMetric()
  {
    var retryPolicy = new GenerativeAnalysisRetryPolicy((_, _) => Task.CompletedTask, () => 0);
    var searchTerms = new GenerativeService.SearchTermsBatchResult(
      [new GenerativeService.SearchTermsEntry("item-0001", ["milk"])]);
    var selection = new GenerativeService.SelectionBatchResult(
      [new GenerativeService.SelectionEntry("item-0001", "10000025", 0.9)]);
    var broker = new ScriptedGenerativeAiBroker(
      ScriptedGenerativeAiBroker.Failure(new TimeoutException("Transient timeout.")),
      ScriptedGenerativeAiBroker.Success(searchTerms),
      ScriptedGenerativeAiBroker.Success(selection));
    var service = new GenerativeAnalysisFoundationService(
      broker,
      TaxonomyBrokerTestFactory.Create(),
      NullLoggerFactory.Instance,
      retryPolicy);

    IReadOnlyList<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      () => service.ClassifyProductsAsync(
        [new ProductAnalysisInput("item-0001", new Product { Name = "lapte" })],
        CancellationToken.None),
      "invoices.analysis.capability.retries");

    CapturedMeasurement measurement = measurements.Single();
    Assert.AreEqual(1L, measurement.Value);
    AssertTag(measurement.Tags, "capability", "product_classification");
    AssertTag(measurement.Tags, "attempt", 1);
  }

  /// <summary>
  /// Verifies that broker content-filter refusals record telemetry, mark the inner exception, and preserve dependency wrapping.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_ContentFilterRefusal_RecordsMetricAndMarksException()
  {
    var broker = new ScriptedGenerativeAiBroker(
      ScriptedGenerativeAiBroker.Failure(new InvalidStructuredOutputException("Provider refused.")));
    var service = new GenerativeAnalysisFoundationService(
      broker,
      TaxonomyBrokerTestFactory.Create(),
      NullLoggerFactory.Instance);

    AnalysisFoundationDependencyException? capturedException = null;

    IReadOnlyList<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      async () =>
      {
        capturedException = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
          () => service.GenerateInvoiceSummaryAsync(CreateProducts(), Guid.NewGuid(), CancellationToken.None));
      },
      "invoices.analysis.capability.content_filter");

    CapturedMeasurement measurement = measurements.Single();
    Assert.AreEqual(1L, measurement.Value);
    AssertTag(measurement.Tags, "capability", "invoice_summary");
    Assert.IsInstanceOfType<InvalidStructuredOutputException>(capturedException!.InnerException);
    Assert.IsTrue(GenerativeAnalysisRefusalMarker.IsRefusal(capturedException.InnerException));
  }

  private static async Task ExecuteSummaryAsync(
    string? modelId,
    GenerativeUsage? usage,
    ILoggerFactory? loggerFactory = null)
  {
    var response = new GenerativeService.InvoiceSummaryStructuredResult("Weekly groceries", "Milk for breakfast.");
    var broker = new ScriptedGenerativeAiBroker(
      new ScriptedGenerativeAiBroker.ScriptedGenerativeResponse(response, TimeSpan.Zero, null, modelId, usage));
    var service = new GenerativeAnalysisFoundationService(
      broker,
      TaxonomyBrokerTestFactory.Create(),
      loggerFactory ?? NullLoggerFactory.Instance);

    _ = await service.GenerateInvoiceSummaryAsync(CreateProducts(), Guid.NewGuid(), CancellationToken.None);
  }

  private static IReadOnlyList<ProductAnalysisInput> CreateProducts() =>
    [new ProductAnalysisInput("item-0001", new Product { Name = "lapte", Quantity = 1, QuantityUnit = "l" })];

  private static async Task<List<CapturedMeasurement>> CaptureMeasurementsAsync(
    Func<Task> recordAction,
    params string[] instrumentNames)
  {
    var captured = new List<CapturedMeasurement>();

    using var listener = new MeterListener();
    listener.InstrumentPublished = (instrument, meterListener) =>
    {
      if (instrument.Meter.Name == MeterGenerators.InvoiceMeter.Name && instrumentNames.Contains(instrument.Name))
      {
        meterListener.EnableMeasurementEvents(instrument);
      }
    };

    listener.SetMeasurementEventCallback<long>((instrument, measurement, tags, _) =>
      captured.Add(new CapturedMeasurement(instrument.Name, measurement, tags.ToArray())));
    listener.SetMeasurementEventCallback<double>((instrument, measurement, tags, _) =>
      captured.Add(new CapturedMeasurement(instrument.Name, measurement, tags.ToArray())));

    listener.Start();
    await recordAction();
    listener.RecordObservableInstruments();

    return captured;
  }

  private static void AssertTag(IReadOnlyCollection<KeyValuePair<string, object?>> tags, string key, object expectedValue)
  {
    var matches = tags.Where(tag => tag.Key == key).ToList();
    Assert.AreEqual(1, matches.Count, $"Expected exactly one '{key}' tag.");
    Assert.AreEqual(expectedValue, matches[0].Value);
  }

  /// <summary>
  /// Captures one emitted metric measurement with its instrument name and tags.
  /// </summary>
  private readonly record struct CapturedMeasurement(string InstrumentName, object Value, KeyValuePair<string, object?>[] Tags);

  /// <summary>
  /// Captures rendered source-generated log messages for confidentiality assertions.
  /// </summary>
  private sealed class CapturingLoggerProvider : ILoggerProvider
  {
    internal List<string> Messages { get; } = [];

    /// <inheritdoc/>
    public ILogger CreateLogger(string categoryName) => new CapturingLogger(Messages);

    /// <inheritdoc/>
    public void Dispose()
    {
    }
  }

  /// <summary>
  /// Minimal logger implementation forwarding rendered messages to the supplied capture list.
  /// </summary>
  /// <param name="messages">The capture list receiving rendered messages.</param>
  private sealed class CapturingLogger(List<string> messages) : ILogger
  {
    /// <inheritdoc/>
    public IDisposable? BeginScope<TState>(TState state)
      where TState : notnull =>
      null;

    /// <inheritdoc/>
    public bool IsEnabled(LogLevel logLevel) => true;

    /// <inheritdoc/>
    public void Log<TState>(
      LogLevel logLevel,
      EventId eventId,
      TState state,
      Exception? exception,
      Func<TState, Exception?, string> formatter) =>
      messages.Add(formatter(state, exception));
  }
}
