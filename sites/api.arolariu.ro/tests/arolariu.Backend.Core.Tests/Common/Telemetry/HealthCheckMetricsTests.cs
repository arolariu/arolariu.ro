namespace arolariu.Backend.Core.Tests.Common.Telemetry;

using System.Collections.Generic;
using System.Linq;
using arolariu.Backend.Common.Telemetry.Metering;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenTelemetry;
using OpenTelemetry.Metrics;

/// <summary>Unit tests for <see cref="HealthCheckMetrics"/>.</summary>
[TestClass]
public sealed class HealthCheckMetricsTests
{
  /// <summary>
  /// Verifies that each failing check produces exactly one metric point tagged with its name,
  /// with a sum of 1. Two inputs must produce two distinct points.
  /// </summary>
  [TestMethod]
  public void RecordFailures_FailedChecks_ExportsOneMeasurementPerCheck()
  {
    var exported = new List<Metric>();
    using var provider = Sdk.CreateMeterProviderBuilder()
      .AddMeter("arolariu.Backend.Core")
      .AddInMemoryExporter(exported)
      .Build()!;

    HealthCheckMetrics.RecordFailures(["mssql", "cosmosdb"]);
    provider.ForceFlush();

    var metric = exported.Find(m => m.Name == HealthCheckMetrics.MetricName);
    Assert.IsNotNull(metric, "The failure counter must be exported.");

    // Materialise the metric points so we can assert per-point dimensioning.
    var points = new List<(string checkTag, long sum)>();
    foreach (ref readonly var point in metric.GetMetricPoints())
    {
      string? checkTag = null;
      foreach (var tag in point.Tags)
      {
        if (tag.Key == "check")
        {
          checkTag = tag.Value?.ToString();
        }
      }

      Assert.IsNotNull(checkTag, "Every metric point must carry a 'check' tag.");
      points.Add((checkTag!, point.GetSumLong()));
    }

    Assert.AreEqual(2, points.Count, "Exactly one metric point per failing check.");

    var tagValues = points.Select(p => p.checkTag).ToHashSet();
    CollectionAssert.Contains(tagValues.ToList(), "mssql", "Expected a point tagged check=mssql.");
    CollectionAssert.Contains(tagValues.ToList(), "cosmosdb", "Expected a point tagged check=cosmosdb.");

    foreach (var (checkTag, sum) in points)
    {
      Assert.AreEqual(1L, sum, $"Point for check={checkTag} must have sum=1.");
    }
  }

  /// <summary>Verifies that a healthy probe emits no measurements.</summary>
  [TestMethod]
  public void RecordFailures_NoFailures_ExportsNothing()
  {
    var exported = new List<Metric>();
    using var provider = Sdk.CreateMeterProviderBuilder()
      .AddMeter("arolariu.Backend.Core")
      .AddInMemoryExporter(exported)
      .Build()!;

    HealthCheckMetrics.RecordFailures([]);
    provider.ForceFlush();

    var metric = exported.Find(m => m.Name == HealthCheckMetrics.MetricName);
    Assert.IsNull(metric, "A healthy probe must not emit any measurement.");
  }
}
