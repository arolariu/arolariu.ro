namespace arolariu.Backend.Domain.Tests.Invoices.Categories;

using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Exercises direct category selection through the real Foundation and a scripted provider.</summary>
[TestClass]
public sealed class DirectCategorySelectionTests
{
  /// <summary>One request carries all eligible subjects and a single finite catalog.</summary>
  [TestMethod]
  public async Task SelectProductCategoriesAsync_AbstentionAndOther_AreDistinct()
  {
    var result = new AnalysisFoundationService.CategorySelectionBatch([new("product:0", null), new("product:1", 1100)]);
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(result));
    var service = GenerativeClassificationHarness.Create(broker).Service;

    var selected = await service.SelectProductCategoriesAsync(
      new Dictionary<string, string> { ["product:0"] = "?", ["product:1"] = "A recognized unlisted item" }, CancellationToken.None);

    Assert.IsNull(selected["product:0"]);
    Assert.AreEqual(ProductCategory.Other, selected["product:1"]);
    Assert.AreEqual(1, broker.InvocationCount);
    JsonElement payload = JsonSerializer.SerializeToElement(broker.CapturedRequests[0].UserPayload);
    Assert.AreEqual(100, payload.GetProperty("categories").GetArrayLength());
    Assert.AreEqual(2, payload.GetProperty("subjects").GetArrayLength());
  }

  /// <summary>Wrong-domain IDs and invented tokens fail the request before it can be applied.</summary>
  [TestMethod]
  [DataRow("product:0", 2001)]
  [DataRow("invented", 1001)]
  [DataRow(" product:0 ", 1001)]
  public async Task SelectProductCategoriesAsync_InvalidProviderOutput_RejectsTheBatch(string token, int id)
  {
    var result = new AnalysisFoundationService.CategorySelectionBatch([new(token, id)]);
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(result));
    var service = GenerativeClassificationHarness.Create(broker).Service;

    var error = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(() =>
      service.SelectProductCategoriesAsync(new Dictionary<string, string> { ["product:0"] = "Fruit" }, CancellationToken.None));
    Assert.IsInstanceOfType<InvalidStructuredOutputException>(error.InnerException);
    Assert.AreEqual(1, broker.InvocationCount);
  }
}
