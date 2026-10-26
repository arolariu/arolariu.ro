namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;
using System.Collections.Generic;
using System.Diagnostics.Metrics;
using System.Linq;

using arolariu.Backend.Common.Telemetry.Metering;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// A scoped <see cref="MeterListener"/> that captures every measurement emitted on the invoices meter for the
/// lifetime of the recorder, so tests can assert on telemetry emitted from real production call paths.
/// </summary>
/// <remarks>
/// <para>Instrument subscription is opt-in by name: a recorder only observes the instruments it was created for,
/// which keeps assertions immune to unrelated telemetry emitted by the code under test.</para>
/// <para>Because <see cref="MeterListener"/> subscribes to a process-wide meter, any test class using this
/// recorder must be marked <c>[DoNotParallelize]</c>.</para>
/// </remarks>
internal sealed class InvoiceMetricRecorder : IDisposable
{
  private readonly MeterListener listener;
  private readonly List<CapturedMeasurement> measurements = [];
  private readonly object gate = new();

  /// <summary>
  /// Initializes a new recorder subscribed to the given invoices-meter instruments.
  /// </summary>
  /// <param name="instrumentNames">The instrument names to observe.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="instrumentNames"/> is null.</exception>
  internal InvoiceMetricRecorder(params string[] instrumentNames)
  {
    ArgumentNullException.ThrowIfNull(instrumentNames);

    listener = new MeterListener
    {
      InstrumentPublished = (instrument, activeListener) =>
      {
        if (instrument.Meter.Name == MeterGenerators.InvoiceMeter.Name && instrumentNames.Contains(instrument.Name))
        {
          activeListener.EnableMeasurementEvents(instrument);
        }
      },
    };

    listener.SetMeasurementEventCallback<long>((instrument, measurement, tags, _) => Capture(instrument.Name, measurement, tags));
    listener.SetMeasurementEventCallback<int>((instrument, measurement, tags, _) => Capture(instrument.Name, measurement, tags));
    listener.SetMeasurementEventCallback<double>((instrument, measurement, tags, _) => Capture(instrument.Name, measurement, tags));
    listener.Start();
  }

  /// <summary>Gets every measurement captured so far, in emission order.</summary>
  internal IReadOnlyList<CapturedMeasurement> Measurements
  {
    get
    {
      lock (gate)
      {
        return [.. measurements];
      }
    }
  }

  /// <summary>Forces every subscribed observable instrument to report, then returns all captured measurements.</summary>
  /// <returns>Every measurement captured so far, including freshly observed gauge values.</returns>
  internal IReadOnlyList<CapturedMeasurement> ObserveAll()
  {
    listener.RecordObservableInstruments();
    return Measurements;
  }

  /// <summary>Returns every captured measurement emitted by the given instrument.</summary>
  /// <param name="instrumentName">The instrument name to filter by.</param>
  /// <returns>The matching measurements, in emission order.</returns>
  internal IReadOnlyList<CapturedMeasurement> For(string instrumentName) =>
    [.. Measurements.Where(measurement => measurement.InstrumentName == instrumentName)];

  /// <summary>Asserts that the given measurement carries exactly one tag with the expected key and value.</summary>
  /// <param name="measurement">The measurement whose tags are inspected.</param>
  /// <param name="key">The expected tag key.</param>
  /// <param name="expectedValue">The expected tag value.</param>
  internal static void AssertTag(CapturedMeasurement measurement, string key, object expectedValue)
  {
    var matches = measurement.Tags.Where(tag => tag.Key == key).ToList();
    Assert.AreEqual(1, matches.Count, $"Expected exactly one '{key}' tag on '{measurement.InstrumentName}'.");
    Assert.AreEqual(expectedValue, matches[0].Value);
  }

  /// <summary>Reports whether the given measurement carries a tag with the expected key and value.</summary>
  /// <param name="measurement">The measurement whose tags are inspected.</param>
  /// <param name="key">The tag key to look for.</param>
  /// <param name="expectedValue">The expected tag value.</param>
  /// <returns><see langword="true"/> when the measurement carries the tag with the expected value.</returns>
  internal static bool HasTag(CapturedMeasurement measurement, string key, object expectedValue) =>
    measurement.Tags.Any(tag => tag.Key == key && Equals(tag.Value, expectedValue));

  /// <inheritdoc/>
  public void Dispose() => listener.Dispose();

  private void Capture(string instrumentName, object value, ReadOnlySpan<KeyValuePair<string, object?>> tags)
  {
    var tagArray = tags.ToArray();
    lock (gate)
    {
      measurements.Add(new CapturedMeasurement(instrumentName, value, tagArray));
    }
  }

  /// <summary>A single captured measurement, together with the instrument that emitted it and its tags.</summary>
  /// <param name="InstrumentName">The emitting instrument's name.</param>
  /// <param name="Value">The recorded value.</param>
  /// <param name="Tags">The tags attached to the measurement.</param>
  internal sealed record CapturedMeasurement(string InstrumentName, object Value, KeyValuePair<string, object?>[] Tags);
}
