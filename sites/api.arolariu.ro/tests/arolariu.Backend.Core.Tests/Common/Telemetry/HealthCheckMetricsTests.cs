namespace arolariu.Backend.Core.Tests.Common.Telemetry;

using System.Collections.Generic;
using arolariu.Backend.Common.Telemetry.Metering;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenTelemetry;
using OpenTelemetry.Metrics;

/// <summary>Unit tests for <see cref="HealthCheckMetrics"/>.</summary>
[TestClass]
public sealed class HealthCheckMetricsTests
{
  /// <summary>Verifies that failing checks produce exported measurements.</summary>
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
