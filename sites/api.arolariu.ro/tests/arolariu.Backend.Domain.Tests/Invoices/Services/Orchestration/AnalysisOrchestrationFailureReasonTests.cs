namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Collections.Generic;
using System.Diagnostics.Metrics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Telemetry.Metering;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies capability outcome telemetry emitted by orchestration best-effort failure handling.
/// </summary>
[TestClass]
[DoNotParallelize]
public sealed class AnalysisOrchestrationFailureReasonTests
{
  private const string CapabilityOutcomesInstrument = "invoices.analysis.capability.outcomes";
  private const string CapabilityDurationInstrument = "invoices.analysis.capability.duration";
  private const string InvalidStructuredOutputInstrument = "invoices.analysis.capability.invalid_structured_output";

  /// <summary>Verifies successful capabilities omit the failure reason and still record duration.</summary>
  [TestMethod]
  public async Task AnalyzeMerchantAsync_SuccessfulCapability_RecordsSuccessWithoutFailureReason()
  {
    MerchantAnalysisResult? result = null;
    var service = AnalysisOrchestrationTestData.CreateService();
    var run = AnalysisOrchestrationTestData.CreateMerchantRun(
      new MerchantAnalysisOptions(AnalysisProfile.Custom, merchantClassification: true, descriptionGeneration: false));

    List<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      async () => result = await service.AnalyzeMerchantAsync(
        run,
        AnalysisOrchestrationTestData.CreateMerchant(),
        CancellationToken.None).ConfigureAwait(true),
      CapabilityOutcomesInstrument,
      CapabilityDurationInstrument,
      InvalidStructuredOutputInstrument).ConfigureAwait(true);

    Assert.IsNotNull(result);
    Assert.IsNotNull(result.ClassificationResult);

    CapturedMeasurement outcome = measurements.Single(m => m.InstrumentName == CapabilityOutcomesInstrument);
    CapturedMeasurement duration = measurements.Single(m => m.InstrumentName == CapabilityDurationInstrument);

    AssertTag(outcome.Tags, "capability", "merchant_classification");
    AssertTag(outcome.Tags, "outcome", "success");
    AssertNoTag(outcome.Tags, "failure.reason");
    AssertNoTag(duration.Tags, "failure.reason");
    Assert.IsFalse(measurements.Any(m => m.InstrumentName == InvalidStructuredOutputInstrument));
  }

  /// <summary>Verifies failed capabilities record the bounded failure reason resolved from the foundation exception.</summary>
  /// <param name="failureCase">The scripted exception case.</param>
  /// <param name="expectedFailureReasonTag">The expected bounded failure-reason tag.</param>
  /// <param name="expectsInvalidStructuredOutputMetric">Whether the dedicated invalid structured output counter should increment.</param>
  [TestMethod]
  [DataRow("content_filter", "content_filter", false)]
  [DataRow("invalid_structured_output", "invalid_structured_output", true)]
  [DataRow("taxonomy", "taxonomy", false)]
  [DataRow("validation", "validation", false)]
  [DataRow("dependency_validation", "dependency_validation", false)]
  [DataRow("dependency", "dependency", false)]
  [DataRow("service", "service", false)]
  [DataRow("service_with_inner", "service", false)]
  public async Task AnalyzeMerchantAsync_FailedCapability_RecordsResolvedFailureReason(
    string failureCase,
    string expectedFailureReasonTag,
    bool expectsInvalidStructuredOutputMetric)
  {
    MerchantAnalysisResult? result = null;
    var service = AnalysisOrchestrationTestData.CreateService(CreateFoundationFailure(failureCase));
    var run = AnalysisOrchestrationTestData.CreateMerchantRun(
      new MerchantAnalysisOptions(AnalysisProfile.Custom, merchantClassification: true, descriptionGeneration: false));

    List<CapturedMeasurement> measurements = await CaptureMeasurementsAsync(
      async () => result = await service.AnalyzeMerchantAsync(
        run,
        AnalysisOrchestrationTestData.CreateMerchant(),
        CancellationToken.None).ConfigureAwait(true),
      CapabilityOutcomesInstrument,
      CapabilityDurationInstrument,
      InvalidStructuredOutputInstrument).ConfigureAwait(true);

    Assert.IsNotNull(result);
    Assert.IsNull(result.ClassificationResult);

    CapturedMeasurement outcome = measurements.Single(m => m.InstrumentName == CapabilityOutcomesInstrument);
    CapturedMeasurement duration = measurements.Single(m => m.InstrumentName == CapabilityDurationInstrument);

    AssertTag(outcome.Tags, "capability", "merchant_classification");
    AssertTag(outcome.Tags, "outcome", "failure");
    AssertTag(outcome.Tags, "failure.reason", expectedFailureReasonTag);
    AssertTag(duration.Tags, "failure.reason", expectedFailureReasonTag);

    int invalidStructuredOutputCount = measurements.Count(m => m.InstrumentName == InvalidStructuredOutputInstrument);
    Assert.AreEqual(expectsInvalidStructuredOutputMetric ? 1 : 0, invalidStructuredOutputCount);
  }

  private static Exception CreateFoundationFailure(string failureCase) => failureCase switch
  {
    "content_filter" => new AnalysisFoundationDependencyException(
      GenerativeAnalysisRefusalMarker.MarkAsRefusal(new InvalidStructuredOutputException("refusal"))),
    "invalid_structured_output" => new AnalysisFoundationDependencyException(new InvalidStructuredOutputException("invalid")),
    "taxonomy" => new AnalysisFoundationDependencyValidationException(new TaxonomyCodeNotFoundException("missing taxonomy")),
    "validation" => new AnalysisFoundationValidationException(),
    "dependency_validation" => new AnalysisFoundationDependencyValidationException(),
    "dependency" => new AnalysisFoundationDependencyException(),
    "service" => new AnalysisFoundationServiceException(),
    "service_with_inner" => new AnalysisFoundationServiceException(new InvalidOperationException("boom")),
    _ => throw new ArgumentOutOfRangeException(nameof(failureCase), failureCase, "Unsupported failure case."),
  };

  private static async Task<List<CapturedMeasurement>> CaptureMeasurementsAsync(Func<Task> recordAction, params string[] instrumentNames)
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
    await recordAction().ConfigureAwait(true);
    listener.RecordObservableInstruments();

    return captured;
  }

  private static void AssertTag(IReadOnlyCollection<KeyValuePair<string, object?>> tags, string key, object expectedValue)
  {
    var matches = tags.Where(tag => tag.Key == key).ToList();
    Assert.AreEqual(1, matches.Count, $"Expected exactly one '{key}' tag.");
    Assert.AreEqual(expectedValue, matches[0].Value);
  }

  private static void AssertNoTag(IReadOnlyCollection<KeyValuePair<string, object?>> tags, string key) =>
    Assert.IsFalse(tags.Any(tag => tag.Key == key), $"Did not expect a '{key}' tag.");

  /// <summary>
  /// Captures a single metric measurement with its emitting instrument and tags.
  /// </summary>
  private readonly record struct CapturedMeasurement(string InstrumentName, object Value, KeyValuePair<string, object?>[] Tags);
}
