namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies analysis transport DTOs.
/// </summary>
[TestClass]
public sealed class AnalysisDtoTests
{
  /// <summary>
  /// Verifies the accepted response exposes Azure Queue's message identifier.
  /// </summary>
  [TestMethod]
  public void AnalysisAcceptedResponseDto_ValidValues_PreservesMessageIdentity()
  {
    Guid targetId = Guid.NewGuid();
    var response = new AnalysisAcceptedResponseDto(
      "message-1",
      AnalysisTargetType.Invoice,
      targetId);

    Assert.AreEqual("message-1", response.MessageId);
    Assert.AreEqual(AnalysisTargetType.Invoice, response.TargetType);
    Assert.AreEqual(targetId, response.TargetId);
  }
}
