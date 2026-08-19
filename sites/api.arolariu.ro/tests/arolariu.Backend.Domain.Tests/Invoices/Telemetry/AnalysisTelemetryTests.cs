namespace arolariu.Backend.Domain.Tests.Invoices.Telemetry;

using System;
using System.Collections.Generic;
using System.Diagnostics.Metrics;
using System.Linq;
using System.Reflection;

using arolariu.Backend.Common.Telemetry.Metering;
using arolariu.Backend.Domain.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using Microsoft.Extensions.Logging;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for the analysis pipeline observability surface: the run/capability metric instruments on
/// <see cref="InvoiceMetrics"/> and the run/capability log methods on <see cref="Log"/>.
/// </summary>
/// <remarks>
/// Every test in this class also enforces the pipeline's confidentiality contract: no instrument or log method
/// under test may accept a parameter whose name suggests product names, merchant names, OCR text, scan URLs,
/// prompts, or model responses. See <see cref="AnalysisMetricMethods_NeverAcceptSensitiveParameters"/> and
/// <see cref="AnalysisLogMethods_NeverAcceptSensitiveParameters"/>.
/// </remarks>
[TestClass]
[DoNotParallelize]
public sealed class AnalysisTelemetryTests
{
  /// <summary>
  /// Parameter name fragments that would indicate a telemetry API is capable of carrying sensitive data.
  /// Matched case-insensitively as substrings against every public parameter name.
  /// </summary>
  private static readonly string[] ForbiddenParameterNameFragments =
  [
    "product",
    "merchant",
    "prompt",
    "response",
    "ocr",
    "scanurl",
    "url",
    "usermetadata",
    "rawtext",
    "documenttext",
  ];

  #region Queue Telemetry

  /// <summary>
  /// Verifies that queuing an analysis run increments the durable enqueue counter with the bounded target type tag.
  /// </summary>
  /// <remarks>
  /// Enqueue no longer nudges a per-process depth counter: depth is a property of the shared durable store and is
  /// published as an observable gauge instead. What enqueue owns is the monotonic arrival rate.
  /// </remarks>
  [TestMethod]
  public void RecordAnalysisMessageQueued_ValidTargetType_IncrementsEnqueueCounter()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordAnalysisMessageQueued(AnalysisTargetType.Invoice),
      "invoices.analysis.queue.enqueued");

    var measurement = measurements.Single();
    Assert.AreEqual(1L, measurement.Value);
    AssertTag(measurement.Tags, "target_type", "invoice");
  }

  /// <summary>
  /// Verifies that queuing an analysis run does not mutate the queue depth gauge, which is owned exclusively by the
  /// durable-store sampler.
  /// </summary>
  [TestMethod]
  public void RecordAnalysisMessageQueued_ValidTargetType_DoesNotMutateQueueDepth()
  {
    InvoiceMetrics.ResetAnalysisQueueDepth();
    try
    {
      var measurements = CaptureMeasurements(
        () => InvoiceMetrics.RecordAnalysisMessageQueued(AnalysisTargetType.Invoice),
        "invoices.analysis.queue.depth");

      Assert.AreEqual(0, measurements.Count);
    }
    finally
    {
      InvoiceMetrics.ResetAnalysisQueueDepth();
    }
  }

  /// <summary>
  /// Verifies that claiming an analysis run records the queue wait duration and leaves the depth gauge untouched.
  /// </summary>
  [TestMethod]
  public void RecordAnalysisMessageReceived_ValidTargetType_RecordsWaitWithoutMutatingDepth()
  {
    InvoiceMetrics.ResetAnalysisQueueDepth();
    try
    {
      var measurements = CaptureMeasurements(
        () => InvoiceMetrics.RecordAnalysisMessageReceived(AnalysisTargetType.Merchant, 42.5),
        "invoices.analysis.queue.depth",
        "invoices.analysis.queue.wait");

      var wait = measurements.Single(m => m.InstrumentName == "invoices.analysis.queue.wait");

      Assert.AreEqual(42.5, wait.Value);
      AssertTag(wait.Tags, "target_type", "merchant");
      Assert.IsFalse(
        measurements.Any(m => m.InstrumentName == "invoices.analysis.queue.depth"),
        "Claiming must not mutate the queue depth gauge; a reclaim would otherwise drive it negative.");
    }
    finally
    {
      InvoiceMetrics.ResetAnalysisQueueDepth();
    }
  }

  /// <summary>
  /// Verifies that a published depth is reported by the observable gauge with the bounded target type tag.
  /// </summary>
  [TestMethod]
  public void PublishAnalysisQueueDepth_ValidDepth_IsReportedByObservableGauge()
  {
    InvoiceMetrics.ResetAnalysisQueueDepth();
    try
    {
      var measurements = CaptureMeasurements(
        () => InvoiceMetrics.PublishAnalysisQueueDepth(AnalysisTargetType.Invoice, 12L),
        "invoices.analysis.queue.depth");

      var measurement = measurements.Single();
      Assert.AreEqual(12L, measurement.Value);
      AssertTag(measurement.Tags, "target_type", "invoice");
    }
    finally
    {
      InvoiceMetrics.ResetAnalysisQueueDepth();
    }
  }

  /// <summary>
  /// Verifies that a re-published depth replaces the previous sample rather than accumulating onto it, which is the
  /// property an additive instrument could not provide across processes.
  /// </summary>
  [TestMethod]
  public void PublishAnalysisQueueDepth_RepublishedDepth_ReplacesPreviousSample()
  {
    InvoiceMetrics.ResetAnalysisQueueDepth();
    try
    {
      var measurements = CaptureMeasurements(
        () =>
        {
          InvoiceMetrics.PublishAnalysisQueueDepth(AnalysisTargetType.Invoice, 9L);
          InvoiceMetrics.PublishAnalysisQueueDepth(AnalysisTargetType.Invoice, 3L);
        },
        "invoices.analysis.queue.depth");

      var measurement = measurements.Single();
      Assert.AreEqual(3L, measurement.Value);
    }
    finally
    {
      InvoiceMetrics.ResetAnalysisQueueDepth();
    }
  }

  /// <summary>
  /// Verifies that a drained queue publishes an explicit zero, so the gauge cannot keep reporting a stale depth.
  /// </summary>
  [TestMethod]
  public void PublishAnalysisQueueDepth_DrainedQueue_ReportsZero()
  {
    InvoiceMetrics.ResetAnalysisQueueDepth();
    try
    {
      var measurements = CaptureMeasurements(
        () =>
        {
          InvoiceMetrics.PublishAnalysisQueueDepth(AnalysisTargetType.Merchant, 5L);
          InvoiceMetrics.PublishAnalysisQueueDepth(AnalysisTargetType.Merchant, 0L);
        },
        "invoices.analysis.queue.depth");

      Assert.AreEqual(0L, measurements.Single().Value);
    }
    finally
    {
      InvoiceMetrics.ResetAnalysisQueueDepth();
    }
  }

  /// <summary>
  /// Verifies an expired queue-depth sample is omitted rather than reported indefinitely as current depth.
  /// </summary>
  [TestMethod]
  public void PublishAnalysisQueueDepth_ExpiredSample_OmitsObservableGaugeMeasurement()
  {
    InvoiceMetrics.ResetAnalysisQueueDepth();
    try
    {
      var measurements = CaptureMeasurements(
        () => InvoiceMetrics.PublishAnalysisQueueDepth(
          AnalysisTargetType.Invoice,
          12L,
          DateTimeOffset.UtcNow.Subtract(TimeSpan.FromMinutes(2)),
          TimeSpan.FromMinutes(1)),
        "invoices.analysis.queue.depth");

      Assert.AreEqual(0, measurements.Count);
    }
    finally
    {
      InvoiceMetrics.ResetAnalysisQueueDepth();
    }
  }

  /// <summary>
  /// Verifies that a negative depth is rejected: a queue cannot hold fewer than zero runs, and accepting one would
  /// reintroduce exactly the drift the additive instrument suffered from.
  /// </summary>
  [TestMethod]
  public void PublishAnalysisQueueDepth_NegativeDepth_Throws() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(
      () => InvoiceMetrics.PublishAnalysisQueueDepth(AnalysisTargetType.Invoice, -1L));

  /// <summary>
  /// Verifies that resetting clears every published sample so the gauge reports nothing at all.
  /// </summary>
  [TestMethod]
  public void ResetAnalysisQueueDepth_AfterPublish_ReportsNothing()
  {
    InvoiceMetrics.PublishAnalysisQueueDepth(AnalysisTargetType.Invoice, 4L);

    var measurements = CaptureMeasurements(
      InvoiceMetrics.ResetAnalysisQueueDepth,
      "invoices.analysis.queue.depth");

    Assert.AreEqual(0, measurements.Count);
  }

  #endregion

  #region Message Telemetry

  /// <summary>
  /// Verifies that recording a successful run outcome, without a failure reason, records the outcome and
  /// duration but does not attach a <c>failure.reason</c> tag.
  /// </summary>
  [TestMethod]
  public void RecordAnalysisMessageOutcome_SuccessWithoutFailureReason_OmitsFailureReasonTag()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordAnalysisMessageOutcome(AnalysisTargetType.Invoice, AnalysisOutcome.Success, 1234.0),
      "invoices.analysis.messages",
      "invoices.analysis.message.duration");

    var outcome = measurements.Single(m => m.InstrumentName == "invoices.analysis.messages");
    var duration = measurements.Single(m => m.InstrumentName == "invoices.analysis.message.duration");

    Assert.AreEqual(1L, outcome.Value);
    AssertTag(outcome.Tags, "target_type", "invoice");
    AssertTag(outcome.Tags, "outcome", "success");
    Assert.IsFalse(outcome.Tags.Any(t => t.Key == "failure.reason"));

    Assert.AreEqual(1234.0, duration.Value);
    Assert.IsFalse(duration.Tags.Any(t => t.Key == "failure.reason"));
  }

  /// <summary>
  /// Verifies that recording a failed run outcome, with a failure reason, attaches the bounded
  /// <c>failure.reason</c> tag to both the counter and the duration histogram.
  /// </summary>
  [TestMethod]
  public void RecordAnalysisMessageOutcome_FailureWithFailureReason_AttachesFailureReasonTag()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordAnalysisMessageOutcome(
        AnalysisTargetType.Invoice,
        AnalysisOutcome.Failure,
        987.0,
        AnalysisFailureReason.Taxonomy),
      "invoices.analysis.messages",
      "invoices.analysis.message.duration");

    var outcome = measurements.Single(m => m.InstrumentName == "invoices.analysis.messages");
    var duration = measurements.Single(m => m.InstrumentName == "invoices.analysis.message.duration");

    AssertTag(outcome.Tags, "outcome", "failure");
    AssertTag(outcome.Tags, "failure.reason", "taxonomy");
    AssertTag(duration.Tags, "failure.reason", "taxonomy");
  }

  /// <summary>
  /// Verifies that a partial run outcome is recorded with the bounded <c>partial</c> tag value.
  /// </summary>
  [TestMethod]
  public void RecordAnalysisMessageOutcome_Partial_RecordsPartialOutcomeTag()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordAnalysisMessageOutcome(AnalysisTargetType.Product, AnalysisOutcome.Partial, 10.0),
      "invoices.analysis.messages");

    AssertTag(measurements.Single().Tags, "outcome", "partial");
    AssertTag(measurements.Single().Tags, "target_type", "product");
  }

  /// <summary>
  /// Verifies that recovering a run from an expired lease records the target type and attempt count.
  /// </summary>
  [TestMethod]
  public void RecordAnalysisLeaseRecovered_ValidParameters_RecordsTargetTypeAndAttempt()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordAnalysisLeaseRecovered(AnalysisTargetType.Merchant, 3),
      "invoices.analysis.lease.recovered");

    var measurement = measurements.Single();
    Assert.AreEqual(1L, measurement.Value);
    AssertTag(measurement.Tags, "target_type", "merchant");
    AssertTag(measurement.Tags, "attempt", 3);
  }

  /// <summary>
  /// Verifies that losing an in-flight lease records the target type on the dedicated lease-lost counter.
  /// </summary>
  [TestMethod]
  public void RecordAnalysisLeaseLost_ValidTargetType_RecordsTargetType()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordAnalysisLeaseLost(AnalysisTargetType.Invoice),
      "invoices.analysis.lease.lost");

    var measurement = measurements.Single();
    Assert.AreEqual(1L, measurement.Value);
    AssertTag(measurement.Tags, "target_type", "invoice");
  }

  #endregion

  #region Capability Telemetry

  /// <summary>
  /// Verifies that a successful capability invocation records both the outcome counter and the duration histogram
  /// without a failure reason tag.
  /// </summary>
  [TestMethod]
  public void RecordCapabilityOutcome_Success_RecordsOutcomeAndDuration()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordCapabilityOutcome(AnalysisCapability.InvoiceSummary, AnalysisOutcome.Success, 55.5),
      "invoices.analysis.capability.outcomes",
      "invoices.analysis.capability.duration");

    var outcome = measurements.Single(m => m.InstrumentName == "invoices.analysis.capability.outcomes");
    var duration = measurements.Single(m => m.InstrumentName == "invoices.analysis.capability.duration");

    Assert.AreEqual(1L, outcome.Value);
    AssertTag(outcome.Tags, "capability", "invoice_summary");
    AssertTag(outcome.Tags, "outcome", "success");
    Assert.IsFalse(outcome.Tags.Any(t => t.Key == "failure.reason"));
    Assert.AreEqual(55.5, duration.Value);
  }

  /// <summary>
  /// Verifies that a failed capability invocation attaches the bounded failure reason tag.
  /// </summary>
  [TestMethod]
  public void RecordCapabilityOutcome_FailureWithReason_AttachesFailureReasonTag()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordCapabilityOutcome(
        AnalysisCapability.RecipeGeneration,
        AnalysisOutcome.Failure,
        12.0,
        AnalysisFailureReason.Dependency),
      "invoices.analysis.capability.outcomes");

    AssertTag(measurements.Single().Tags, "capability", "recipe_generation");
    AssertTag(measurements.Single().Tags, "failure.reason", "dependency");
  }

  /// <summary>
  /// Verifies that a retry attempt is counted with the capability and the 1-based attempt number.
  /// </summary>
  [TestMethod]
  public void RecordCapabilityRetry_ValidParameters_RecordsCapabilityAndAttempt()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordCapabilityRetry(AnalysisCapability.AllergenAssessment, 2),
      "invoices.analysis.capability.retries");

    var measurement = measurements.Single();
    Assert.AreEqual(1L, measurement.Value);
    AssertTag(measurement.Tags, "capability", "allergen_assessment");
    AssertTag(measurement.Tags, "attempt", 2);
  }

  /// <summary>
  /// Verifies that a content filter or refusal event is counted with only the capability tag.
  /// </summary>
  [TestMethod]
  public void RecordCapabilityContentFilterOrRefusal_ValidCapability_RecordsCapability()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordCapabilityContentFilterOrRefusal(AnalysisCapability.MerchantClassification),
      "invoices.analysis.capability.content_filter");

    var measurement = measurements.Single();
    Assert.AreEqual(1L, measurement.Value);
    AssertTag(measurement.Tags, "capability", "merchant_classification");
  }

  /// <summary>
  /// Verifies that an invalid structured output event is counted with only the capability tag.
  /// </summary>
  [TestMethod]
  public void RecordCapabilityInvalidStructuredOutput_ValidCapability_RecordsCapability()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordCapabilityInvalidStructuredOutput(AnalysisCapability.ProductClassification),
      "invoices.analysis.capability.invalid_structured_output");

    var measurement = measurements.Single();
    Assert.AreEqual(1L, measurement.Value);
    AssertTag(measurement.Tags, "capability", "product_classification");
  }

  #endregion

  #region Taxonomy And Token Telemetry

  /// <summary>
  /// Verifies that a taxonomy validation failure is counted with the bounded classification system tag.
  /// </summary>
  [TestMethod]
  public void RecordTaxonomyValidationFailure_ValidSystem_RecordsSystemTag()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordTaxonomyValidationFailure(ClassificationSystem.EcoicopV2),
      "invoices.analysis.taxonomy.validation_failures");

    var measurement = measurements.Single();
    Assert.AreEqual(1L, measurement.Value);
    AssertTag(measurement.Tags, "system", "ecoicop_v2");
  }

  /// <summary>
  /// Verifies that both input and output token counts are recorded with capability and model tags.
  /// </summary>
  [TestMethod]
  public void RecordTokenUsage_BothCounts_RecordsInputAndOutput()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordTokenUsage(
        GenerativeTelemetryCatalog.ForNonTaxonomyCapability(AnalysisCapability.InvoiceSummary),
        "model-router",
        120,
        45),
      "invoices.analysis.tokens.input",
      "invoices.analysis.tokens.output");

    var input = measurements.Single(m => m.InstrumentName == "invoices.analysis.tokens.input");
    var output = measurements.Single(m => m.InstrumentName == "invoices.analysis.tokens.output");

    Assert.AreEqual(120L, input.Value);
    Assert.AreEqual(45L, output.Value);
    AssertTag(input.Tags, "capability", "invoice_summary");
    AssertTag(input.Tags, "model.id", "model-router");
  }

  /// <summary>
  /// Verifies unrecognized model identifiers cannot create unbounded metric-tag values.
  /// </summary>
  [TestMethod]
  public void RecordTokenUsage_UnrecognizedModelIdentifier_RecordsUnknownModelTag()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordTokenUsage(
        GenerativeTelemetryCatalog.ForNonTaxonomyCapability(AnalysisCapability.InvoiceSummary),
        "provider-controlled-model-8f172fb9-9f81-4db7-b856-c38f7543b4e4",
        120,
        outputTokens: null),
      "invoices.analysis.tokens.input");

    var measurement = measurements.Single();
    AssertTag(measurement.Tags, "model.id", "unknown");
  }

  /// <summary>
  /// Verifies that an absent input token count records only the output histogram, so missing provider usage data
  /// is never fabricated into a zero-token data point.
  /// </summary>
  [TestMethod]
  public void RecordTokenUsage_OnlyOutputCount_RecordsOutputOnly()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordTokenUsage(
        GenerativeTelemetryCatalog.ForNonTaxonomyCapability(AnalysisCapability.DescriptionGeneration),
        "model-router",
        null,
        7),
      "invoices.analysis.tokens.input",
      "invoices.analysis.tokens.output");

    Assert.AreEqual(1, measurements.Count);
    Assert.AreEqual("invoices.analysis.tokens.output", measurements[0].InstrumentName);
    Assert.AreEqual(7L, measurements[0].Value);
  }

  /// <summary>
  /// Verifies that an absent output token count records only the input histogram.
  /// </summary>
  [TestMethod]
  public void RecordTokenUsage_OnlyInputCount_RecordsInputOnly()
  {
    var measurements = CaptureMeasurements(
      () => InvoiceMetrics.RecordTokenUsage(
        GenerativeTelemetryCatalog.ForNonTaxonomyCapability(AnalysisCapability.InvoiceSummary),
        "model-router",
        9,
        null),
      "invoices.analysis.tokens.input",
      "invoices.analysis.tokens.output");

    Assert.AreEqual(1, measurements.Count);
    Assert.AreEqual("invoices.analysis.tokens.input", measurements[0].InstrumentName);
    Assert.AreEqual(9L, measurements[0].Value);
  }

  #endregion

  #region Bounded Tag Conversion

  /// <summary>
  /// Verifies that every declared <see cref="AnalysisTargetType"/> maps to a distinct, non-<c>unknown</c> tag value.
  /// </summary>
  [TestMethod]
  public void ToTag_EveryTargetType_MapsToDistinctBoundedValue()
    => AssertExhaustiveMapping(Enum.GetValues<AnalysisTargetType>(), InvoiceMetrics.ToTag);

  /// <summary>
  /// Verifies that every declared <see cref="AnalysisCapability"/> maps to a distinct, non-<c>unknown</c> tag value.
  /// </summary>
  [TestMethod]
  public void ToTag_EveryCapability_MapsToDistinctBoundedValue()
    => AssertExhaustiveMapping(Enum.GetValues<AnalysisCapability>(), InvoiceMetrics.ToTag);

  /// <summary>
  /// Verifies that every declared <see cref="AnalysisOutcome"/> maps to a distinct, non-<c>unknown</c> tag value.
  /// </summary>
  [TestMethod]
  public void ToTag_EveryOutcome_MapsToDistinctBoundedValue()
    => AssertExhaustiveMapping(Enum.GetValues<AnalysisOutcome>(), InvoiceMetrics.ToTag);

  /// <summary>
  /// Verifies that every declared <see cref="AnalysisFailureReason"/> maps to a distinct, non-<c>unknown</c> tag value.
  /// </summary>
  [TestMethod]
  public void ToTag_EveryFailureReason_MapsToDistinctBoundedValue()
    => AssertExhaustiveMapping(Enum.GetValues<AnalysisFailureReason>(), InvoiceMetrics.ToTag);

  /// <summary>
  /// Verifies that every declared <see cref="ClassificationSystem"/> maps to a distinct, non-<c>unknown</c> tag value.
  /// </summary>
  [TestMethod]
  public void ToTag_EveryClassificationSystem_MapsToDistinctBoundedValue()
    => AssertExhaustiveMapping(Enum.GetValues<ClassificationSystem>(), InvoiceMetrics.ToTag);

  /// <summary>
  /// Verifies that an undeclared target type value falls back to the bounded <c>unknown</c> tag instead of
  /// leaking an arbitrary numeric value into the metric dimension.
  /// </summary>
  [TestMethod]
  public void ToTag_UndeclaredTargetType_FallsBackToUnknown()
    => Assert.AreEqual("unknown", InvoiceMetrics.ToTag((AnalysisTargetType)9999));

  /// <summary>
  /// Verifies that an undeclared capability value falls back to the bounded <c>unknown</c> tag.
  /// </summary>
  [TestMethod]
  public void ToTag_UndeclaredCapability_FallsBackToUnknown()
    => Assert.AreEqual("unknown", InvoiceMetrics.ToTag((AnalysisCapability)9999));

  /// <summary>
  /// Verifies that an undeclared outcome value falls back to the bounded <c>unknown</c> tag.
  /// </summary>
  [TestMethod]
  public void ToTag_UndeclaredOutcome_FallsBackToUnknown()
    => Assert.AreEqual("unknown", InvoiceMetrics.ToTag((AnalysisOutcome)9999));

  /// <summary>
  /// Verifies that an undeclared failure reason value falls back to the bounded <c>unknown</c> tag.
  /// </summary>
  [TestMethod]
  public void ToTag_UndeclaredFailureReason_FallsBackToUnknown()
    => Assert.AreEqual("unknown", InvoiceMetrics.ToTag((AnalysisFailureReason)9999));

  /// <summary>
  /// Verifies that an undeclared classification system value falls back to the bounded <c>unknown</c> tag.
  /// </summary>
  [TestMethod]
  public void ToTag_UndeclaredClassificationSystem_FallsBackToUnknown()
    => Assert.AreEqual("unknown", InvoiceMetrics.ToTag((ClassificationSystem)9999));

  #endregion

  #region Log Methods

  /// <summary>
  /// Verifies that logging a queued run records the run identifier and target type under event id 300220.
  /// </summary>
  [TestMethod]
  public void LogAnalysisMessageQueued_ValidParameters_RecordsCorrelationIdAndTargetType()
  {
    var logger = new CapturingLogger();
    var correlationId = Guid.NewGuid();

    logger.LogAnalysisMessageQueued(correlationId, AnalysisTargetType.Invoice);

    var entry = logger.Entries.Single();
    Assert.AreEqual(300_220, entry.EventId.Id);
    Assert.AreEqual(LogLevel.Information, entry.Level);
    AssertProperty(entry.Properties, "correlationId", correlationId);
    AssertProperty(entry.Properties, "targetType", AnalysisTargetType.Invoice);
  }

  /// <summary>
  /// Verifies that logging a capability outcome records the capability, outcome, and duration.
  /// </summary>
  [TestMethod]
  public void LogAnalysisCapabilityOutcomeObserved_ValidParameters_RecordsCapabilityOutcomeAndDuration()
  {
    var logger = new CapturingLogger();

    logger.LogAnalysisCapabilityOutcomeObserved(Guid.NewGuid(), AnalysisCapability.RecipeGeneration, AnalysisOutcome.Failure, 4.5);

    var entry = logger.Entries.Single();
    Assert.AreEqual(300_224, entry.EventId.Id);
    AssertProperty(entry.Properties, "capability", AnalysisCapability.RecipeGeneration);
    AssertProperty(entry.Properties, "durationMs", 4.5);
  }

  /// <summary>
  /// Verifies that logging a capability failure reason records it at warning level.
  /// </summary>
  [TestMethod]
  public void LogAnalysisCapabilityFailureReasonObserved_ValidParameters_RecordsReasonAtWarning()
  {
    var logger = new CapturingLogger();

    logger.LogAnalysisCapabilityFailureReasonObserved(
      Guid.NewGuid(),
      AnalysisCapability.ProductClassification,
      AnalysisFailureReason.InvalidStructuredOutput);

    var entry = logger.Entries.Single();
    Assert.AreEqual(300_225, entry.EventId.Id);
    Assert.AreEqual(LogLevel.Warning, entry.Level);
    AssertProperty(entry.Properties, "failureReason", AnalysisFailureReason.InvalidStructuredOutput);
  }

  /// <summary>
  /// Verifies that logging a retry attempt records the capability and attempt number without a run identifier,
  /// because the generative foundation layer has no run context.
  /// </summary>
  [TestMethod]
  public void LogAnalysisCapabilityRetryAttempted_ValidParameters_RecordsCapabilityAndAttempt()
  {
    var logger = new CapturingLogger();

    logger.LogAnalysisCapabilityRetryAttempted(AnalysisCapability.AllergenAssessment, 2);

    var entry = logger.Entries.Single();
    Assert.AreEqual(300_226, entry.EventId.Id);
    Assert.AreEqual(LogLevel.Warning, entry.Level);
    AssertProperty(entry.Properties, "attempt", 2);
  }

  /// <summary>
  /// Verifies that logging a content filter or refusal records only the capability.
  /// </summary>
  [TestMethod]
  public void LogAnalysisContentFilterOrRefusalTriggered_ValidCapability_RecordsCapability()
  {
    var logger = new CapturingLogger();

    logger.LogAnalysisContentFilterOrRefusalTriggered(AnalysisCapability.InvoiceSummary);

    var entry = logger.Entries.Single();
    Assert.AreEqual(300_227, entry.EventId.Id);
    AssertProperty(entry.Properties, "capability", AnalysisCapability.InvoiceSummary);
  }

  /// <summary>
  /// Verifies that logging an invalid structured output detection records only the capability.
  /// </summary>
  [TestMethod]
  public void LogAnalysisInvalidStructuredOutputDetected_ValidCapability_RecordsCapability()
  {
    var logger = new CapturingLogger();

    logger.LogAnalysisInvalidStructuredOutputDetected(AnalysisCapability.MerchantClassification);

    var entry = logger.Entries.Single();
    Assert.AreEqual(300_228, entry.EventId.Id);
    AssertProperty(entry.Properties, "capability", AnalysisCapability.MerchantClassification);
  }

  /// <summary>
  /// Verifies that logging a taxonomy validation failure records the classification system.
  /// </summary>
  [TestMethod]
  public void LogAnalysisTaxonomyValidationFailed_ValidSystem_RecordsSystem()
  {
    var logger = new CapturingLogger();

    logger.LogAnalysisTaxonomyValidationFailed(ClassificationSystem.Nace21);

    var entry = logger.Entries.Single();
    Assert.AreEqual(300_229, entry.EventId.Id);
    AssertProperty(entry.Properties, "classificationSystem", ClassificationSystem.Nace21);
  }

  /// <summary>
  /// Verifies that logging a lease recovery records the run identifier, target type, and attempt count.
  /// </summary>
  [TestMethod]
  public void LogAnalysisLeaseRecovered_ValidParameters_RecordsRunIdTargetTypeAndAttemptCount()
  {
    var logger = new CapturingLogger();
    var runId = Guid.NewGuid();

    logger.LogAnalysisLeaseRecovered(runId, AnalysisTargetType.Invoice, 4);

    var entry = logger.Entries.Single();
    Assert.AreEqual(300_230, entry.EventId.Id);
    Assert.AreEqual(LogLevel.Warning, entry.Level);
    AssertProperty(entry.Properties, "runId", runId);
    AssertProperty(entry.Properties, "attemptCount", 4);
  }

  /// <summary>
  /// Verifies that logging a lost lease records the run identifier and target type at warning level.
  /// </summary>
  [TestMethod]
  public void LogAnalysisLeaseLost_ValidParameters_RecordsRunIdAndTargetType()
  {
    var logger = new CapturingLogger();
    var runId = Guid.NewGuid();

    logger.LogAnalysisLeaseLost(runId, AnalysisTargetType.Merchant);

    var entry = logger.Entries.Single();
    Assert.AreEqual(300_231, entry.EventId.Id);
    Assert.AreEqual(LogLevel.Warning, entry.Level);
    AssertProperty(entry.Properties, "runId", runId);
    AssertProperty(entry.Properties, "targetType", AnalysisTargetType.Merchant);
  }

  /// <summary>
  /// Verifies that logging observed token usage records only the trusted bounded capability, version, model, and
  /// token dimensions.
  /// </summary>
  [TestMethod]
  public void LogAnalysisTokenUsageObserved_ValidParameters_RecordsCapabilityModelAndTokenCounts()
  {
    var logger = new CapturingLogger();

    logger.LogAnalysisTokenUsageObserved(
      GenerativeTelemetryCatalog.ForNonTaxonomyCapability(AnalysisCapability.InvoiceSummary),
      "gpt-4o-mini",
      120,
      45);

    var entry = logger.Entries.Single();
    Assert.AreEqual(300_232, entry.EventId.Id);
    AssertProperty(entry.Properties, "modelId", "gpt-4o-mini");
    AssertProperty(entry.Properties, "schemaVersion", "invoice-summary-schema-v1");
    AssertProperty(entry.Properties, "promptVersion", "invoice-summary-prompt-v1");
    AssertProperty(entry.Properties, "taxonomyVersion", "not_applicable");
    AssertProperty(entry.Properties, "inputTokens", 120L);
    AssertProperty(entry.Properties, "outputTokens", 45L);
  }

  #endregion

  #region Confidentiality Guards

  /// <summary>
  /// Enumerates every public <c>Record*</c> method declared on <see cref="InvoiceMetrics"/> and asserts that no
  /// parameter name suggests it could carry product names, merchant names, OCR text, scan URLs, prompts, or
  /// model responses. This is a durable, reflection-based guard against future accidental sensitive-data leaks.
  /// </summary>
  [TestMethod]
  public void AnalysisMetricMethods_NeverAcceptSensitiveParameters()
  {
    var offendingParameters = typeof(InvoiceMetrics)
      .GetMethods(BindingFlags.Public | BindingFlags.Static)
      .Where(method => method.Name.StartsWith("Record", StringComparison.Ordinal))
      .SelectMany(method => method.GetParameters(), (method, parameter) => (method, parameter))
      .Where(pair => ForbiddenParameterNameFragments.Any(fragment =>
        pair.parameter.Name!.Contains(fragment, StringComparison.OrdinalIgnoreCase)))
      .Select(pair => $"{pair.method.Name}({pair.parameter.Name})")
      .ToList();

    Assert.IsTrue(
      offendingParameters.Count == 0,
      $"Sensitive-looking parameter(s) found on InvoiceMetrics: {string.Join(", ", offendingParameters)}");
  }

  /// <summary>
  /// Enumerates every public Task 12 analysis-pipeline <c>Log*</c> method declared on <see cref="Log"/> and
  /// asserts that it cannot accept raw exception objects, free-form messages, or sensitive content dimensions.
  /// </summary>
  [TestMethod]
  public void AnalysisLogMethods_NeverAcceptSensitiveParameters()
  {
    var offendingParameters = typeof(Log)
      .GetMethods(BindingFlags.Public | BindingFlags.Static)
      .Where(method =>
        method.Name.StartsWith("LogAnalysis", StringComparison.Ordinal)
        || method.Name.StartsWith("LogDocumentAnalysis", StringComparison.Ordinal)
        || method.Name.StartsWith("LogGenerativeAnalysis", StringComparison.Ordinal))
      .SelectMany(method => method.GetParameters(), (method, parameter) => (method, parameter))
      .Where(pair =>
        ForbiddenParameterNameFragments.Any(fragment =>
          pair.parameter.Name!.Contains(fragment, StringComparison.OrdinalIgnoreCase))
        || pair.parameter.ParameterType == typeof(Exception)
        || (pair.parameter.ParameterType == typeof(string)
            && !string.Equals(pair.parameter.Name, "modelId", StringComparison.Ordinal)))
      .Select(pair => $"{pair.method.Name}({pair.parameter.Name})")
      .ToList();

    Assert.IsTrue(
      offendingParameters.Count == 0,
      $"Sensitive-looking parameter(s) found on Log: {string.Join(", ", offendingParameters)}");
  }

  #endregion

  #region Test Infrastructure

  /// <summary>
  /// A single captured metric measurement, together with the instrument that emitted it and its tags.
  /// </summary>
  private readonly record struct CapturedMeasurement(string InstrumentName, object Value, KeyValuePair<string, object?>[] Tags);

  /// <summary>
  /// Subscribes a <see cref="MeterListener"/> to the named instruments on the invoices meter, invokes
  /// <paramref name="recordAction"/>, and returns every measurement observed on those instruments.
  /// </summary>
  /// <param name="recordAction">The action expected to emit measurements on the given instruments.</param>
  /// <param name="instrumentNames">The instrument names to listen for.</param>
  /// <returns>The captured measurements, in emission order.</returns>
  private static List<CapturedMeasurement> CaptureMeasurements(Action recordAction, params string[] instrumentNames)
  {
    var captured = new List<CapturedMeasurement>();

    using var listener = new MeterListener();
    listener.InstrumentPublished = (instrument, l) =>
    {
      if (instrument.Meter.Name == MeterGenerators.InvoiceMeter.Name && instrumentNames.Contains(instrument.Name))
      {
        l.EnableMeasurementEvents(instrument);
      }
    };

    listener.SetMeasurementEventCallback<long>((instrument, measurement, tags, _) =>
      captured.Add(new CapturedMeasurement(instrument.Name, measurement, tags.ToArray())));
    listener.SetMeasurementEventCallback<double>((instrument, measurement, tags, _) =>
      captured.Add(new CapturedMeasurement(instrument.Name, measurement, tags.ToArray())));

    listener.Start();
    recordAction();
    listener.RecordObservableInstruments();

    return captured;
  }

  /// <summary>
  /// Asserts that the given tag set contains a tag with the expected key and value.
  /// </summary>
  private static void AssertTag(IReadOnlyCollection<KeyValuePair<string, object?>> tags, string key, object expectedValue)
  {
    var match = tags.Where(t => t.Key == key).ToList();
    Assert.AreEqual(1, match.Count, $"Expected exactly one '{key}' tag.");
    Assert.AreEqual(expectedValue, match[0].Value);
  }

  /// <summary>
  /// Asserts that every declared value of an enum maps to a distinct, non-<c>unknown</c>, non-empty tag value.
  /// This makes an unmapped enum member a test failure instead of a silent <c>unknown</c> dimension in production.
  /// </summary>
  /// <typeparam name="TEnum">The enum being mapped.</typeparam>
  /// <param name="values">Every declared value of the enum.</param>
  /// <param name="converter">The bounded tag converter under test.</param>
  private static void AssertExhaustiveMapping<TEnum>(TEnum[] values, Func<TEnum, string> converter)
    where TEnum : struct, Enum
  {
    var mapped = values.Select(converter).ToList();

    foreach ((TEnum value, string tag) in values.Zip(mapped))
    {
      Assert.IsFalse(string.IsNullOrWhiteSpace(tag), $"{typeof(TEnum).Name}.{value} produced an empty tag.");
      Assert.AreNotEqual("unknown", tag, $"{typeof(TEnum).Name}.{value} is not mapped to a bounded tag value.");
    }

    Assert.AreEqual(
      mapped.Count,
      mapped.Distinct(StringComparer.Ordinal).Count(),
      $"{typeof(TEnum).Name} produced duplicate tag values: {string.Join(", ", mapped)}");
  }

  /// <summary>
  /// Asserts that the given structured log state contains a property with the expected key and value.
  /// </summary>
  private static void AssertProperty(IReadOnlyList<KeyValuePair<string, object?>> properties, string key, object expectedValue)
  {
    var match = properties.Where(p => p.Key == key).ToList();
    Assert.AreEqual(1, match.Count, $"Expected exactly one '{key}' property.");
    Assert.AreEqual(expectedValue, match[0].Value);
  }

  /// <summary>
  /// A minimal <see cref="ILogger"/> test double that captures every logged entry, including its structured
  /// state as a flat property list, without relying on mocking framework generic-method gymnastics.
  /// </summary>
  private sealed class CapturingLogger : ILogger
  {
    /// <summary>The entries captured by this logger, in emission order.</summary>
    public List<CapturedLogEntry> Entries { get; } = [];

    /// <inheritdoc />
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

    /// <inheritdoc />
    public bool IsEnabled(LogLevel logLevel) => true;

    /// <inheritdoc />
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
    {
      var properties = (state as IEnumerable<KeyValuePair<string, object?>>)?.ToList()
        ?? new List<KeyValuePair<string, object?>>();

      Entries.Add(new CapturedLogEntry(logLevel, eventId, formatter(state, exception), properties));
    }
  }

  /// <summary>
  /// A single captured log entry: its level, event id, formatted message, and structured properties.
  /// </summary>
  private sealed record CapturedLogEntry(LogLevel Level, EventId EventId, string Message, IReadOnlyList<KeyValuePair<string, object?>> Properties);

  #endregion
}
