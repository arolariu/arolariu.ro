namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;

/// <summary>
/// Records stopped invoice-domain activities for telemetry branch coverage tests.
/// </summary>
internal sealed class InvoiceActivityRecorder : IDisposable
{
  private const string InvoiceActivitySourceName = "arolariu.Backend.Domain.Invoices";

  private readonly object gate = new();
  private readonly List<Activity> stopped = [];
  private readonly Activity? originalActivity;
  private readonly ActivityListener listener;

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceActivityRecorder"/> class.
  /// </summary>
  public InvoiceActivityRecorder()
  {
    originalActivity = Activity.Current;
    listener = new ActivityListener
    {
      ShouldListenTo = source => source.Name == InvoiceActivitySourceName,
      Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
      SampleUsingParentId = (ref ActivityCreationOptions<string> _) => ActivitySamplingResult.AllDataAndRecorded,
      ActivityStopped = activity =>
      {
        lock (gate)
        {
          stopped.Add(activity);
        }
      },
    };

    ActivitySource.AddActivityListener(listener);
  }

  /// <summary>
  /// Gets a snapshot of invoice-domain activities observed after they stopped.
  /// </summary>
  public IReadOnlyList<Activity> StoppedActivities
  {
    get
    {
      lock (gate)
      {
        return stopped.ToArray();
      }
    }
  }

  /// <summary>
  /// Finds a stopped activity by operation name.
  /// </summary>
  /// <param name="operationName">The activity operation name.</param>
  /// <returns>The first matching stopped activity, or <see langword="null"/> when none was recorded.</returns>
  public Activity? FindActivity(string operationName)
  {
    ArgumentNullException.ThrowIfNull(operationName);

    lock (gate)
    {
      return stopped.FirstOrDefault(activity => string.Equals(activity.OperationName, operationName, StringComparison.Ordinal));
    }
  }

  /// <summary>
  /// Reads an activity tag as an invariant string representation.
  /// </summary>
  /// <param name="activity">The activity containing the tag.</param>
  /// <param name="tagKey">The tag key to read.</param>
  /// <returns>The tag value, or <see langword="null"/> when the tag is absent or null.</returns>
  public static string? TagValue(Activity activity, string tagKey)
  {
    ArgumentNullException.ThrowIfNull(activity);
    ArgumentNullException.ThrowIfNull(tagKey);

    object? value = activity.GetTagItem(tagKey);

    return value switch
    {
      null => null,
      string text => text,
      IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
      _ => value.ToString(),
    };
  }

  /// <inheritdoc/>
  public void Dispose()
  {
    listener.Dispose();
    Activity.Current = originalActivity;
    GC.SuppressFinalize(this);
  }
}

