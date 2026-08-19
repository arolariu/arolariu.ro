namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.Security.Claims;
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
/// Verifies invoice metadata never crosses the public transport boundary with analysis or credential artifacts.
/// </summary>
[TestClass]
public sealed class InvoiceMetadataSecurityTests
{
  /// <summary>
  /// Verifies sentinel internal keys and non-scalar values are excluded from every public metadata snapshot.
  /// </summary>
  [TestMethod]
  public void CreatePublicSnapshot_InternalSentinelsAndNonScalarValues_ExcludesThem()
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
    };

    // Act
    IReadOnlyDictionary<string, string?> snapshot = InvoiceMetadataProjector.CreatePublicSnapshot(metadata);

    // Assert
    Assert.HasCount(1, snapshot);
    Assert.AreEqual("Tax receipt", snapshot["user.note"]);
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
}

