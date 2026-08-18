namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;

using Microsoft.Extensions.Logging;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Captures the complete structured logging and activity surface exposed by an analysis call for confidentiality tests.
/// </summary>
internal sealed class AnalysisTelemetryPrivacyCapture : ILoggerProvider, ILogger
{
  private readonly List<string> loggedSurface = [];

  /// <summary>
  /// Gets every rendered log message, exception surface, and structured property captured by this provider.
  /// </summary>
  internal IReadOnlyList<string> LoggedSurface => loggedSurface;

  /// <inheritdoc/>
  public ILogger CreateLogger(string categoryName) => this;

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
    Func<TState, Exception?, string> formatter)
  {
    loggedSurface.Add(formatter(state, exception));

    if (exception is not null)
    {
      loggedSurface.Add(exception.ToString());
    }

    if (state is IEnumerable<KeyValuePair<string, object?>> properties)
    {
      foreach (KeyValuePair<string, object?> property in properties)
      {
        loggedSurface.Add($"{property.Key}={property.Value}");
      }
    }
  }

  /// <summary>
  /// Asserts that neither captured logs nor any stopped activity can contain the supplied sensitive sentinel.
  /// </summary>
  /// <param name="activityRecorder">The recorder that observed activities for the tested call.</param>
  /// <param name="sensitiveSentinel">The exact sensitive value that must not leave the production path.</param>
  internal void AssertSurfaceExcludes(InvoiceActivityRecorder activityRecorder, string sensitiveSentinel)
  {
    ArgumentNullException.ThrowIfNull(activityRecorder);
    ArgumentException.ThrowIfNullOrWhiteSpace(sensitiveSentinel);

    string logged = string.Join(Environment.NewLine, LoggedSurface);
    string activities = string.Join(
      Environment.NewLine,
      activityRecorder.StoppedActivities.Select(ActivitySurface));

    if (logged.Contains(sensitiveSentinel, StringComparison.Ordinal))
    {
      throw new AssertFailedException("Logging exposed a sensitive sentinel.");
    }

    if (activities.Contains(sensitiveSentinel, StringComparison.Ordinal))
    {
      throw new AssertFailedException("Activity telemetry exposed a sensitive sentinel.");
    }
  }

  /// <inheritdoc/>
  public void Dispose()
  {
  }

  private static string ActivitySurface(Activity activity)
  {
    IEnumerable<string> tags = activity.TagObjects.Select(tag => $"{tag.Key}={tag.Value}");
    IEnumerable<string> events = activity.Events.SelectMany(@event =>
      @event.Tags.Select(tag => $"{@event.Name}:{tag.Key}={tag.Value}"));

    return string.Join(
      Environment.NewLine,
      [activity.OperationName, activity.DisplayName, activity.StatusDescription ?? string.Empty, .. tags, .. events]);
  }
}
