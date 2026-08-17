namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the refusal marker used to distinguish provider refusals from schema violations.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisRefusalMarkerTests
{
  /// <summary>
  /// Verifies that marking a null exception fails with an argument null exception.
  /// </summary>
  [TestMethod]
  public void MarkAsRefusal_NullException_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() => GenerativeAnalysisRefusalMarker.MarkAsRefusal(null!));

  /// <summary>
  /// Verifies that a marked invalid structured output exception is recognized as a refusal.
  /// </summary>
  [TestMethod]
  public void IsRefusal_MarkedException_ReturnsTrue()
  {
    var exception = new InvalidStructuredOutputException("Provider refused.");

    InvalidStructuredOutputException marked = GenerativeAnalysisRefusalMarker.MarkAsRefusal(exception);

    Assert.AreSame(exception, marked);
    Assert.IsTrue(GenerativeAnalysisRefusalMarker.IsRefusal(marked));
  }

  /// <summary>
  /// Verifies that an unmarked exception is not recognized as a refusal.
  /// </summary>
  [TestMethod]
  public void IsRefusal_UnmarkedException_ReturnsFalse()
  {
    var exception = new InvalidStructuredOutputException("Schema violation.");

    Assert.IsFalse(GenerativeAnalysisRefusalMarker.IsRefusal(exception));
  }

  /// <summary>
  /// Verifies that a null exception is not recognized as a refusal.
  /// </summary>
  [TestMethod]
  public void IsRefusal_NullException_ReturnsFalse() =>
    Assert.IsFalse(GenerativeAnalysisRefusalMarker.IsRefusal(null));

  /// <summary>
  /// Verifies that a marker key with a false boolean value is not recognized as a refusal.
  /// </summary>
  [TestMethod]
  public void IsRefusal_FalseMarkerValue_ReturnsFalse()
  {
    var exception = new InvalidStructuredOutputException("Schema violation.");
    exception.Data[GenerativeAnalysisRefusalMarker.RefusalKey] = false;

    Assert.IsFalse(GenerativeAnalysisRefusalMarker.IsRefusal(exception));
  }

  /// <summary>
  /// Verifies that a marker key with a non-boolean value is not recognized as a refusal.
  /// </summary>
  [TestMethod]
  public void IsRefusal_NonBooleanMarkerValue_ReturnsFalse()
  {
    var exception = new InvalidStructuredOutputException("Schema violation.");
    exception.Data[GenerativeAnalysisRefusalMarker.RefusalKey] = "true";

    Assert.IsFalse(GenerativeAnalysisRefusalMarker.IsRefusal(exception));
  }
}
