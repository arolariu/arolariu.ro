namespace arolariu.Backend.Core.Tests.Common.Telemetry;

using arolariu.Backend.Common.Telemetry;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests for <see cref="HealthTelemetryPolicy"/> covering path classification and suppression flag parsing.
/// </summary>
[TestClass]
public sealed class HealthTelemetryPolicyTests
{
  /// <summary>Verifies health endpoints are correctly identified as suppressed.</summary>
  [TestMethod]
  [DataRow("/health")]
  [DataRow("/api/health")]
  [DataRow("/api/ready")]
  [DataRow("/HEALTH")]
  [DataRow("/Api/Health")]
  [DataRow("/health/")]
  [DataRow("/health?foo=bar")]
  [DataRow("/api/ready/?x=1")]
  public void IsSuppressedPath_HealthPath_ReturnsTrue(string path)
  {
    Assert.IsTrue(HealthTelemetryPolicy.IsSuppressedPath(path));
  }

  /// <summary>Verifies non-health paths are not suppressed.</summary>
  [TestMethod]
  [DataRow("/")]
  [DataRow("/api/invoices")]
  [DataRow("/terms")]
  [DataRow("/healthcheck-admin")]
  [DataRow("/health/details")]
  [DataRow("/api/healthy")]
  [DataRow("")]
  [DataRow(null)]
  public void IsSuppressedPath_NonHealthPath_ReturnsFalse(string? path)
  {
    Assert.IsFalse(HealthTelemetryPolicy.IsSuppressedPath(path));
  }

  /// <summary>Verifies environment variable parsing yields expected defaults.</summary>
  [TestMethod]
  [DataRow(null, true)]
  [DataRow("", true)]
  [DataRow("   ", true)]
  [DataRow("true", true)]
  [DataRow("TRUE", true)]
  [DataRow("false", false)]
  [DataRow("False", false)]
  [DataRow("not-a-bool", true)]
  [DataRow("0", true)]
  public void ParseSuppressionFlag_Value_ReturnsExpected(string? raw, bool expected)
  {
    Assert.AreEqual(expected, HealthTelemetryPolicy.ParseSuppressionFlag(raw));
  }
}
