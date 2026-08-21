namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies invoice-summary generation behavior for the generative analysis foundation service.
/// </summary>
[TestClass]
public sealed class InvoiceSummaryGenerationTests
{
  /// <summary>
  /// Verifies that a valid structured summary returns the concise name and description and uses exactly one typed request.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_ValidStructuredResponse_ReturnsSummary()
  {
    var harness = GenerativeCapabilityHarness.WithInvoiceSummary(
      "Breakfast essentials",
      "Milk and breakfast staples for the week.");

    (string Name, string Description) result = await harness.Service.GenerateInvoiceSummaryAsync(
      harness.Products,
      Guid.NewGuid(),
      CancellationToken.None);

    Assert.AreEqual("Breakfast essentials", result.Name);
    Assert.AreEqual("Milk and breakfast staples for the week.", result.Description);
    Assert.AreEqual(1, harness.Broker.InvocationCount);
  }

  /// <summary>
  /// Verifies that the summary prompt treats user payload as untrusted data and does not retain the legacy three-word humorous constraint.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_PromptRemovesLegacyConstraint()
  {
    var harness = GenerativeCapabilityHarness.WithInvoiceSummary(
      "Breakfast essentials",
      "Milk and breakfast staples for the week.");

    _ = await harness.Service.GenerateInvoiceSummaryAsync(
      harness.Products,
      Guid.NewGuid(),
      CancellationToken.None);

    string systemPrompt = harness.Broker.CapturedRequests[0].SystemPrompt;
    string payload = JsonSerializer.Serialize(harness.Broker.CapturedRequests[0].UserPayload);

    StringAssert.Contains(systemPrompt, "untrusted data", StringComparison.Ordinal);
    Assert.IsFalse(systemPrompt.Contains("3 words", StringComparison.Ordinal));
    Assert.IsFalse(systemPrompt.Contains("humorous", StringComparison.OrdinalIgnoreCase));
    StringAssert.Contains(payload, "lapte", StringComparison.Ordinal);
  }
}
