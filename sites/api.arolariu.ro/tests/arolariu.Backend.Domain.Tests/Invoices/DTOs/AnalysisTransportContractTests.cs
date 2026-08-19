namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies stable analysis transport JSON.
/// </summary>
[TestClass]
public sealed class AnalysisTransportContractTests
{
  /// <summary>
  /// Verifies accepted responses serialize the provider message identifier.
  /// </summary>
  [TestMethod]
  public void AcceptedResponse_Serialize_UsesMessageId()
  {
    var response = new AnalysisAcceptedResponseDto(
      "message-1",
      AnalysisTargetType.Invoice,
      Guid.Parse("11111111-1111-1111-1111-111111111111"));

    string json = JsonSerializer.Serialize(response);

    StringAssert.Contains(json, "\"MessageId\":\"message-1\"", StringComparison.Ordinal);
    StringAssert.Contains(json, "\"TargetType\":\"invoice\"", StringComparison.Ordinal);
  }
}
