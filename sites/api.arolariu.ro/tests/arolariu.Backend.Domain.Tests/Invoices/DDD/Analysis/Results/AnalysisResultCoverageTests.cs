namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Analysis.Results;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies analysis patch change detection after merchant resolution was removed.
/// </summary>
[TestClass]
public sealed class AnalysisResultCoverageTests
{
  /// <summary>
  /// Verifies an empty invoice patch reports no changes.
  /// </summary>
  [TestMethod]
  public void HasChanges_AllSectionsNull_ReturnsFalse()
  {
    var patch = new InvoiceAnalysisPatch(null, null, null, null, null, null);

    Assert.IsFalse(patch.HasChanges);
  }

  /// <summary>
  /// Verifies a summary update marks the patch as changed.
  /// </summary>
  [TestMethod]
  public void HasChanges_SummaryPresent_ReturnsTrue()
  {
    var patch = new InvoiceAnalysisPatch(
      null,
      new InvoiceSummaryResult("Groceries", "Weekly groceries"),
      null,
      null,
      null,
      null);

    Assert.IsTrue(patch.HasChanges);
  }
}
