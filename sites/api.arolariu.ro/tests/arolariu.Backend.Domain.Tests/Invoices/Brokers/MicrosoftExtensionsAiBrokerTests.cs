namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using Microsoft.Extensions.AI;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Defines materialization tests for the real <see cref="AzureFoundryBroker"/> driven over a deterministic
/// external <see cref="IChatClient"/> double.
/// </summary>
/// <remarks>
/// These tests close the risk parked during Task 8: the generative foundation services declare their structured
/// output contracts as <see langword="private"/> nested records, so the broker must be able to materialize a
/// non-public typed contract through <see cref="ChatResponse{T}"/>. The output contract below is deliberately a
/// private nested record so the production DTO visibility never has to be widened for testability.
/// </remarks>
[TestClass]
public sealed class AzureFoundryBrokerTests
{
  /// <summary>
  /// Verifies that the broker materializes a non-public typed structured output contract, proving the production
  /// foundation services can keep their output records private.
  /// </summary>
  [TestMethod]
  public async Task GenerateStructuredAsync_PrivateNestedOutputContract_MaterializesTypedResult()
  {
    // Arrange
    const string payload = """{"description":"A neighbourhood grocery retailer.","confidence":0.87}""";
    using var chatClient = new ScriptedChatClient(payload, "unit-test-model");
    var broker = new AzureFoundryBroker(chatClient);
    var request = new GenerativeRequest("Describe the merchant.", new { name = "Test Merchant" });

    // Act
    GenerativeResponse<PrivateStructuredOutput> response = await broker
      .GenerateStructuredAsync<PrivateStructuredOutput>(request, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    Assert.AreEqual("A neighbourhood grocery retailer.", response.Value.Description);
    Assert.AreEqual(0.87, response.Value.Confidence, 0.0001);
    Assert.AreEqual("unit-test-model", response.ModelId);
    Assert.IsTrue(chatClient.UsedJsonSchemaResponseFormat);
  }

  /// <summary>
  /// Verifies that a response that cannot be materialized into the requested contract surfaces the typed inner
  /// structured-output failure instead of a silent null result.
  /// </summary>
  [TestMethod]
  public async Task GenerateStructuredAsync_UnparsableResponse_ThrowsInvalidStructuredOutput()
  {
    // Arrange
    using var chatClient = new ScriptedChatClient("this is not json", modelId: null);
    var broker = new AzureFoundryBroker(chatClient);
    var request = new GenerativeRequest("Describe the merchant.", new { name = "Test Merchant" });

    // Act + Assert
    await Assert.ThrowsExactlyAsync<InvalidStructuredOutputException>(async () =>
      await broker.GenerateStructuredAsync<PrivateStructuredOutput>(request, CancellationToken.None)
        .ConfigureAwait(false)).ConfigureAwait(false);
  }

  /// <summary>
  /// Represents a private, non-public structured output contract mirroring the visibility of the production
  /// generative foundation output records.
  /// </summary>
  [SuppressMessage(
    "Performance",
    "CA1812:Avoid uninstantiated internal classes",
    Justification = "Instantiated exclusively by the structured-output deserializer under test.")]
  private sealed record PrivateStructuredOutput(string Description, double Confidence);

  private sealed class ScriptedChatClient(string responseText, string? modelId) : IChatClient
  {
    internal bool UsedJsonSchemaResponseFormat { get; private set; }

    public Task<ChatResponse> GetResponseAsync(
      IEnumerable<ChatMessage> messages,
      ChatOptions? options = null,
      CancellationToken cancellationToken = default)
    {
      UsedJsonSchemaResponseFormat = options?.ResponseFormat is ChatResponseFormatJson { Schema: not null };

      return Task.FromResult(new ChatResponse(new ChatMessage(ChatRole.Assistant, responseText))
      {
        ModelId = modelId,
        Usage = new UsageDetails { InputTokenCount = 11, OutputTokenCount = 7, TotalTokenCount = 18 },
      });
    }

    public IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(
      IEnumerable<ChatMessage> messages,
      ChatOptions? options = null,
      CancellationToken cancellationToken = default) =>
        throw new NotSupportedException();

    public object? GetService(Type serviceType, object? serviceKey = null) => null;

    public void Dispose()
    {
      // No unmanaged resources are held by the scripted double.
    }
  }
}
