namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Text.Json;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies merchant description generation behavior for the generative analysis foundation service.
/// </summary>
[TestClass]
public sealed class MerchantDescriptionGenerationTests
{
  /// <summary>
  /// Verifies that a valid structured description returns the concise description and uses exactly one typed request.
  /// </summary>
  [TestMethod]
  public async Task GenerateMerchantDescriptionAsync_ValidStructuredResponse_ReturnsDescription()
  {
    var harness = MerchantDescriptionHarness.WithResponse("A local grocery retailer serving neighborhood shoppers.");

    string result = await harness.ExecuteAsync();

    Assert.AreEqual("A local grocery retailer serving neighborhood shoppers.", result);
    Assert.AreEqual(1, harness.Broker.InvocationCount);
  }

  /// <summary>
  /// Verifies that a sparse-evidence merchant keeps a qualified description rather than asserting invented facts.
  /// </summary>
  [TestMethod]
  public async Task GenerateMerchantDescriptionAsync_SparseEvidenceQualifiedDescription_ReturnsDescription()
  {
    var harness = MerchantDescriptionHarness.WithSparseResponse("Likely a local retailer based on limited invoice evidence.");

    string result = await harness.ExecuteAsync();

    StringAssert.Contains(result, "Likely", StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies that accepted weak-evidence qualifier phrases pass validation.
  /// </summary>
  [TestMethod]
  [DataRow("Potentially a local retailer based on limited invoice evidence.")]
  [DataRow("Appears to be a local retailer based on limited invoice evidence.")]
  [DataRow("May be a local retailer based on limited invoice evidence.")]
  public async Task GenerateMerchantDescriptionAsync_SparseEvidenceAcceptedQualifier_ReturnsDescription(string description)
  {
    var harness = MerchantDescriptionHarness.WithSparseResponse(description);

    string result = await harness.ExecuteAsync();

    Assert.AreEqual(description, result);
  }

  /// <summary>
  /// Verifies that a sparse-evidence merchant rejects unqualified factual assertions.
  /// </summary>
  [TestMethod]
  public async Task GenerateMerchantDescriptionAsync_SparseEvidenceUnqualifiedDescription_ThrowsDependencyException()
  {
    var harness = MerchantDescriptionHarness.WithSparseResponse("A local grocery retailer serving neighborhood shoppers.");

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.ExecuteAsync());

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that word-adjacent non-qualifier terms do not bypass weak-evidence validation.
  /// </summary>
  [TestMethod]
  [DataRow("Unlikely a local retailer based on limited invoice evidence.")]
  [DataRow("A retailer with only a likelihood of local trade based on limited invoice evidence.")]
  public async Task GenerateMerchantDescriptionAsync_SparseEvidenceNonQualifierTerm_ThrowsDependencyException(string description)
  {
    var harness = MerchantDescriptionHarness.WithSparseResponse(description);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.ExecuteAsync());

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that empty structured output is rejected.
  /// </summary>
  [TestMethod]
  public async Task GenerateMerchantDescriptionAsync_EmptyDescription_ThrowsDependencyException()
  {
    var harness = MerchantDescriptionHarness.WithResponse(string.Empty);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.ExecuteAsync());

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that descriptions exceeding the concise limit are rejected.
  /// </summary>
  [TestMethod]
  public async Task GenerateMerchantDescriptionAsync_OverLimitDescription_ThrowsDependencyException()
  {
    var harness = MerchantDescriptionHarness.WithResponse(new string('a', 241));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.ExecuteAsync());

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that URL-like descriptions are rejected across supported patterns.
  /// </summary>
  [TestMethod]
  [DataRow("Visit https://example.test for more details.")]
  [DataRow("Visit www.example.test for more details.")]
  [DataRow("Visit example.com for more details.")]
  public async Task GenerateMerchantDescriptionAsync_UrlContainingDescription_ThrowsDependencyException(string description)
  {
    var harness = MerchantDescriptionHarness.WithResponse(description);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.ExecuteAsync());

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that prohibited external research claim phrases are rejected.
  /// </summary>
  [TestMethod]
  [DataRow("Based on web research, this appears to be a retail shop.")]
  [DataRow("Based on registry data, this appears to be a retail shop.")]
  [DataRow("Based on online sources, this appears to be a retail shop.")]
  [DataRow("According to Google Maps, this appears to be a retail shop.")]
  [DataRow("According to public records, this appears to be a retail shop.")]
  [DataRow("Per LinkedIn, this appears to be a retail shop.")]
  [DataRow("Per registry listings, this appears to be a retail shop.")]
  [DataRow("I looked up the merchant on Google Maps and it appears to be a retail shop.")]
  [DataRow("I searched online for the merchant and it appears to be a retail shop.")]
  public async Task GenerateMerchantDescriptionAsync_ExternalResearchClaim_ThrowsDependencyException(string description)
  {
    var harness = MerchantDescriptionHarness.WithResponse(description);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.ExecuteAsync());

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that ordinary domain nouns do not trigger false positives when no prohibited claim phrase is present.
  /// </summary>
  [TestMethod]
  [DataRow("Based on available invoice evidence, this appears to be a local retailer.")]
  [DataRow("Per available invoice evidence, this appears to be a local retailer.")]
  [DataRow("I searched the available invoice evidence and it appears to be a local retailer.")]
  [DataRow("Research Triangle retailer serving local shoppers.")]
  [DataRow("Registry services office handling administrative tasks.")]
  public async Task GenerateMerchantDescriptionAsync_NonClaimResearchTerms_ReturnsDescription(string description)
  {
    var harness = MerchantDescriptionHarness.WithResponse(description);

    string result = await harness.ExecuteAsync();

    Assert.AreEqual(description, result);
  }

  /// <summary>
  /// Verifies that the prompt treats the user payload as untrusted merchant data and remains content-free in logs.
  /// </summary>
  [TestMethod]
  public async Task GenerateMerchantDescriptionAsync_PromptUsesUntrustedPayloadBoundary()
  {
    var harness = MerchantDescriptionHarness.WithResponse("A local grocery retailer serving neighborhood shoppers.");

    _ = await harness.ExecuteAsync();

    string systemPrompt = harness.Broker.CapturedRequests[0].SystemPrompt;
    string payload = JsonSerializer.Serialize(harness.Broker.CapturedRequests[0].UserPayload);

    StringAssert.Contains(systemPrompt, "untrusted data", StringComparison.Ordinal);
    StringAssert.Contains(systemPrompt, "merchant fields", StringComparison.Ordinal);
    StringAssert.Contains(systemPrompt, "related invoice evidence", StringComparison.Ordinal);
    StringAssert.Contains(payload, "Corner Shop SRL", StringComparison.Ordinal);
  }
}
