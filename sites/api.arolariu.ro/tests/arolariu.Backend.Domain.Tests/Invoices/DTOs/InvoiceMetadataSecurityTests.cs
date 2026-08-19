namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.DTOs.Responses;
using arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.Services.Management;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies invoice metadata request validation and response projection behavior.
/// </summary>
[TestClass]
public sealed class InvoiceMetadataSecurityTests
{
  /// <summary>
  /// Verifies every persisted metadata key is exposed by the response snapshot.
  /// </summary>
  [TestMethod]
  public void CreateMetadataSnapshot_PersistedEntries_ExposesAllKeys()
  {
    // Arrange
    var metadata = new Dictionary<string, object>
    {
      ["user.note"] = "Tax receipt",
      ["analysis.response"] = "model output",
      ["raw_ocr"] = "raw document text",
      ["analysis-run-id"] = Guid.CreateVersion7(),
      ["upload.sas"] = "sv=2026-01-01&sig=secret",
      ["internal.token"] = "token",
      ["custom.upload"] = "sv=2026-01-01&sig=secret",
      ["custom.authorization"] = "Bearer eyJhbGciOiJIUzI1NiJ9.token.signature",
      ["custom.object"] = new Dictionary<string, string> { ["nested"] = "value" },
      ["custom.nan"] = double.NaN,
      ["custom.jsonNull"] = ParseJsonElement("null"),
      ["custom.jsonObject"] = ParseJsonElement("""{"nested":"value"}"""),
    };

    // Act
    IReadOnlyDictionary<string, string?> snapshot = InvoiceResponseDto.CreateMetadataSnapshot(metadata);

    // Assert
    Assert.HasCount(12, snapshot);
    Assert.AreEqual("Tax receipt", snapshot["user.note"]);
    Assert.AreEqual("model output", snapshot["analysis.response"]);
    Assert.AreEqual("sv=2026-01-01&sig=secret", snapshot["upload.sas"]);
    Assert.AreEqual("""{"nested":"value"}""", snapshot["custom.object"]);
    Assert.IsNull(snapshot["custom.jsonNull"]);
    Assert.AreEqual("""{"nested":"value"}""", snapshot["custom.jsonObject"]);
  }

  /// <summary>
  /// Verifies protected metadata cannot reach a processing write through the metadata PATCH endpoint.
  /// </summary>
  [TestMethod]
  public async Task PatchInvoiceMetadataAsync_InternalMetadataKey_DoesNotInvokeProcessingService()
  {
    // Arrange
    var processingService = new Mock<IInvoiceManagementService>(MockBehavior.Strict);
    using ServiceProvider serviceProvider = new ServiceCollection().BuildServiceProvider();
    var accessor = new HttpContextAccessor
    {
      HttpContext = new DefaultHttpContext
      {
        RequestServices = serviceProvider,
        User = new ClaimsPrincipal(
          new ClaimsIdentity([new Claim("userIdentifier", Guid.CreateVersion7().ToString())], "Test")),
      },
    };
    var patch = new PatchMetadataRequestDto(
      new Dictionary<string, object> { ["analysis.response"] = "must not persist" });

    // Act
    IResult result = await InvoiceEndpoints
      .PatchInvoiceMetadataAsync(processingService.Object, accessor, Guid.CreateVersion7(), patch)
      .ConfigureAwait(false);

    // Assert
    Assert.IsInstanceOfType<IStatusCodeHttpResult>(result);
    Assert.AreEqual(StatusCodes.Status400BadRequest, ((IStatusCodeHttpResult)result).StatusCode);
    processingService.VerifyNoOtherCalls();
  }

  /// <summary>
  /// Verifies a failed patch validates all entries before changing the destination dictionary.
  /// </summary>
  [TestMethod]
  public void ApplyTo_InternalEntryAmongAllowedEntries_LeavesMetadataUnchanged()
  {
    // Arrange
    var existing = new Dictionary<string, object> { ["user.note"] = "original" };
    var patch = new PatchMetadataRequestDto(
      new Dictionary<string, object>
      {
        ["custom.project"] = "new",
        ["internal.token"] = "must not persist",
      });

    // Act + Assert
    Assert.ThrowsExactly<InvoiceMetadataValidationException>(() => patch.ApplyTo(existing));
    Assert.HasCount(1, existing);
    Assert.AreEqual("original", existing["user.note"]);
  }

  private static JsonElement ParseJsonElement(string json)
  {
    using JsonDocument document = JsonDocument.Parse(json);
    return document.RootElement.Clone();
  }
}
