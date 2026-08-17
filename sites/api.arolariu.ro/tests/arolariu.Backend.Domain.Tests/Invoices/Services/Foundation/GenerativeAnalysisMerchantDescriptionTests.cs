namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Tests.Builders;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies weak-evidence and structured-output branches for merchant description generation.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisMerchantDescriptionTests
{
  /// <summary>
  /// Verifies that each merchant evidence signal contributes to the weak-evidence qualifier requirement.
  /// </summary>
  [TestMethod]
  [DataRow(false, false, false, false, false, false, true)]
  [DataRow(true, false, false, false, false, false, true)]
  [DataRow(false, true, false, false, false, false, true)]
  [DataRow(false, false, true, false, false, false, true)]
  [DataRow(false, false, false, true, false, false, true)]
  [DataRow(false, false, false, false, true, false, true)]
  [DataRow(false, false, false, false, false, true, true)]
  [DataRow(true, true, false, false, false, false, false)]
  [DataRow(false, false, true, true, false, false, false)]
  [DataRow(false, false, false, false, true, true, false)]
  public async Task GenerateMerchantDescriptionAsync_EvidenceSignalMatrix_RequiresQualifierOnlyWhenEvidenceIsWeak(
    bool hasDescription,
    bool hasClassification,
    bool hasContactEvidence,
    bool hasReferencedInvoice,
    bool hasMetadata,
    bool hasParentCompany,
    bool expectsWeakEvidence)
  {
    Merchant merchant = CreateMerchant(
      hasDescription,
      hasClassification,
      hasContactEvidence ? CreateContact(address: "Bucharest") : new ContactInformation(),
      hasReferencedInvoice,
      hasMetadata,
      hasParentCompany);
    MerchantDescriptionHarness harness = MerchantDescriptionHarness.WithResponse("Corner Shop sells groceries.", merchant);

    if (expectsWeakEvidence)
    {
      AnalysisFoundationDependencyException exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
        () => harness.ExecuteAsync());

      Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
    }
    else
    {
      MerchantDescriptionResult result = await harness.ExecuteAsync();

      Assert.AreEqual("Corner Shop sells groceries.", result.Description);
    }
  }

  /// <summary>
  /// Verifies that every independent contact field is accepted as contact evidence.
  /// </summary>
  [TestMethod]
  [DataRow("Strada Exemplu 1", null, null, null)]
  [DataRow(null, "+40 21 000 0000", null, null)]
  [DataRow(null, null, "contact@example.test", null)]
  [DataRow(null, null, null, "https://example.test")]
  public async Task GenerateMerchantDescriptionAsync_IndependentContactEvidenceFields_SupportStrongEvidence(
    string? address,
    string? phoneNumber,
    string? emailAddress,
    string? website)
  {
    Merchant merchant = CreateMerchant(
      hasDescription: true,
      hasClassification: false,
      CreateContact(address, phoneNumber, emailAddress, website),
      hasReferencedInvoice: false,
      hasMetadata: false,
      hasParentCompany: false);
    MerchantDescriptionHarness harness = MerchantDescriptionHarness.WithResponse("Corner Shop sells groceries.", merchant);

    MerchantDescriptionResult result = await harness.ExecuteAsync();

    Assert.AreEqual("Corner Shop sells groceries.", result.Description);
  }

  /// <summary>
  /// Verifies that qualified language satisfies the weak-evidence description guard.
  /// </summary>
  [TestMethod]
  [DataRow("Market likely sells groceries.")]
  [DataRow("Market may be a grocery merchant.")]
  [DataRow("Market appears to be a grocery merchant.")]
  public async Task GenerateMerchantDescriptionAsync_WeakEvidenceQualifiedResponse_ReturnsDescription(string description)
  {
    MerchantDescriptionHarness harness = MerchantDescriptionHarness.WithSparseResponse(description);

    MerchantDescriptionResult result = await harness.ExecuteAsync();

    Assert.AreEqual(description, result.Description);
  }

  /// <summary>
  /// Verifies that null, empty, and whitespace structured descriptions are rejected.
  /// </summary>
  [TestMethod]
  [DataRow(null)]
  [DataRow("")]
  [DataRow("   ")]
  public async Task GenerateMerchantDescriptionAsync_BlankStructuredDescription_ThrowsDependencyException(string? description)
  {
    MerchantDescriptionHarness harness = MerchantDescriptionHarness.WithResponse(description!);

    AnalysisFoundationDependencyException exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.ExecuteAsync());

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  private static Merchant CreateMerchant(
    bool hasDescription,
    bool hasClassification,
    ContactInformation contactInformation,
    bool hasReferencedInvoice,
    bool hasMetadata,
    bool hasParentCompany) =>
    new()
    {
      Name = "Corner Shop",
      Description = hasDescription ? "Neighborhood grocery retailer." : string.Empty,
      Classification = hasClassification ? ClassificationTestData.Nace("47.11", "Retail sale in non-specialised stores") : null,
      Address = contactInformation,
      ReferencedInvoices = hasReferencedInvoice ? [Guid.NewGuid()] : [],
      AdditionalMetadata = hasMetadata ? new Dictionary<string, string>(StringComparer.Ordinal) { ["source"] = "receipt" } : new Dictionary<string, string>(StringComparer.Ordinal),
      ParentCompanyId = hasParentCompany ? Guid.NewGuid() : Guid.Empty,
    };

  private static ContactInformation CreateContact(
    string? address = null,
    string? phoneNumber = null,
    string? emailAddress = null,
    string? website = null) =>
    new()
    {
      Address = address ?? string.Empty,
      PhoneNumber = phoneNumber ?? string.Empty,
      EmailAddress = emailAddress ?? string.Empty,
      Website = website ?? string.Empty,
    };
}
