namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using GenerativeService = arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis.AnalysisFoundationService;

/// <summary>
/// Verifies invoice summary structured-output mapping branches.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisInvoiceSummaryTests
{
  /// <summary>
  /// Verifies a valid structured invoice summary is returned.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_ValidStructuredSummary_ReturnsSummary()
  {
    InvoiceSummaryResult result = await ExecuteSummaryAsync(new GenerativeService.InvoiceSummaryStructuredResult(
      "Weekly groceries",
      "Milk and pantry items for breakfast."));

    Assert.AreEqual("Weekly groceries", result.Name);
    Assert.AreEqual("Milk and pantry items for breakfast.", result.Description);
  }

  /// <summary>
  /// Verifies blank structured summary fields are rejected.
  /// </summary>
  [TestMethod]
  [DataRow(null, "Description")]
  [DataRow("", "Description")]
  [DataRow("   ", "Description")]
  [DataRow("Name", null)]
  [DataRow("Name", "")]
  [DataRow("Name", "   ")]
  public async Task GenerateInvoiceSummaryAsync_BlankStructuredField_ThrowsDependencyException(string? name, string? description)
  {
    AnalysisFoundationDependencyException exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => ExecuteSummaryAsync(new GenerativeService.InvoiceSummaryStructuredResult(name!, description!)));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  private static async Task<InvoiceSummaryResult> ExecuteSummaryAsync(GenerativeService.InvoiceSummaryStructuredResult response)
  {
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(response));
    GenerativeClassificationHarness harness = GenerativeClassificationHarness.Create(broker);

    return await harness.Service.GenerateInvoiceSummaryAsync(CreateProducts(), Guid.NewGuid(), CancellationToken.None);
  }

  private static List<ProductAnalysisInput> CreateProducts() =>
    [new ProductAnalysisInput("item-0001", new Product { Name = "lapte", Quantity = 1, QuantityUnit = "l" })];
}
