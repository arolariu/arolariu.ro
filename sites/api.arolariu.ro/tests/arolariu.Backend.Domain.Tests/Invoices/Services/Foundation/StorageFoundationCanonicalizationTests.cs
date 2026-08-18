namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies that the storage foundation services replace every caller-asserted classification with the canonical
/// taxonomy projection immediately before the aggregate reaches the persistence broker.
/// </summary>
/// <remarks>
/// <para><b>Why a real taxonomy broker:</b> These tests wire the production <see cref="JsonTaxonomyBroker"/> over
/// deterministic in-memory artifacts rather than a mock, because the behaviour under test is precisely that the
/// placeholder version/label/hierarchy produced by <see cref="ClassificationSelectionDto.ToManualSelection"/> is
/// overwritten by real catalog data. A mocked broker would let a foundation that skipped canonicalization pass.</para>
/// <para><b>Expected systems:</b> ECOICOP for the invoice, GPC for every product, NACE for the merchant.</para>
/// </remarks>
[TestClass]
public sealed class StorageFoundationCanonicalizationTests
{
  private const string PlaceholderMetadata = "unresolved";

  #region Invoice ECOICOP canonicalization

  /// <summary>
  /// Verifies that a manually selected ECOICOP code is persisted as the canonical taxonomy projection, replacing
  /// every placeholder value the caller-facing DTO produced.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_ManualEcoicopSelection_PersistsCanonicalInvoiceClassification()
  {
    // Arrange
    var harness = new InvoiceHarness();
    Invoice invoice = InvoiceHarness.CreateInvoice();
    invoice.Classification = new ClassificationSelectionDto(ClassificationSystem.EcoicopV2, "01.1.1").ToManualSelection();

    // Act
    await harness.Service.CreateInvoiceObject(invoice, invoice.UserIdentifier, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    StandardClassification persisted = harness.CreatedInvoice!.Classification!;
    Assert.AreEqual(ClassificationSystem.EcoicopV2, persisted.System);
    Assert.AreEqual("01.1.1", persisted.Code);
    Assert.AreEqual("2", persisted.Version);
    Assert.AreEqual("Cereals and cereal products (ND)", persisted.OfficialLabel);
    Assert.AreEqual(3, persisted.Hierarchy.Count);
    Assert.AreEqual("01", persisted.Hierarchy[0].Code);
    Assert.AreEqual("01.1.1", persisted.Hierarchy[^1].Code);
    Assert.AreNotEqual(PlaceholderMetadata, persisted.Version);
    Assert.AreNotEqual(PlaceholderMetadata, persisted.OfficialLabel);
  }

  /// <summary>
  /// Verifies that updating an invoice canonicalizes its classification on the write path too, so a manual
  /// selection made after creation cannot bypass the taxonomy catalog.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_ManualEcoicopSelection_PersistsCanonicalInvoiceClassification()
  {
    // Arrange
    var harness = new InvoiceHarness();
    Invoice invoice = InvoiceHarness.CreateInvoice();
    invoice.Classification = new ClassificationSelectionDto(ClassificationSystem.EcoicopV2, "01.1").ToManualSelection();

    // Act
    await harness.Service.UpdateInvoiceObject(invoice, invoice.id, invoice.UserIdentifier, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    StandardClassification persisted = harness.UpdatedInvoice!.Classification!;
    Assert.AreEqual("01.1", persisted.Code);
    Assert.AreEqual("Food", persisted.OfficialLabel);
    Assert.AreEqual("2", persisted.Version);
  }

  /// <summary>
  /// Verifies that a classification asserted against a system other than ECOICOP is rejected as a foundation
  /// validation failure rather than being silently re-homed or persisted unresolved.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_InvoiceClassificationFromWrongSystem_ThrowsFoundationValidationException()
  {
    // Arrange
    var harness = new InvoiceHarness();
    Invoice invoice = InvoiceHarness.CreateInvoice();
    invoice.Classification = new ClassificationSelectionDto(ClassificationSystem.Nace21, "01").ToManualSelection();

    // Act + Assert
    InvoiceFoundationValidationException exception =
      await Assert.ThrowsExactlyAsync<InvoiceFoundationValidationException>(async () =>
        await harness.Service.CreateInvoiceObject(invoice, invoice.UserIdentifier, CancellationToken.None)
          .ConfigureAwait(false)).ConfigureAwait(false);

    Assert.IsInstanceOfType<TaxonomyCodeNotFoundException>(exception.InnerException);
    Assert.IsNull(harness.CreatedInvoice);
  }

  #endregion

  #region Product GPC canonicalization

  /// <summary>
  /// Verifies that every product on the invoice is canonicalized, not only the first, so a partially enriched
  /// basket can never persist a mix of canonical and caller-asserted classifications.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_ManualGpcSelections_CanonicalizesEveryProduct()
  {
    // Arrange
    var harness = new InvoiceHarness();
    Invoice invoice = InvoiceHarness.CreateInvoice();
    invoice.Items =
    [
      new Product
      {
        Name = "Milk",
        Classification = new ClassificationSelectionDto(ClassificationSystem.Gs1Gpc, "10000025").ToManualSelection(),
      },
      new Product { Name = "Unclassified line" },
      new Product
      {
        Name = "Butter",
        Classification = new ClassificationSelectionDto(ClassificationSystem.Gs1Gpc, "10000025").ToManualSelection(),
      },
    ];

    // Act
    await harness.Service.CreateInvoiceObject(invoice, invoice.UserIdentifier, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    Product[] persisted = [.. harness.CreatedInvoice!.Items];
    Assert.AreEqual(3, persisted.Length);

    foreach (int index in new[] { 0, 2 })
    {
      StandardClassification classification = persisted[index].Classification!;
      Assert.AreEqual(ClassificationSystem.Gs1Gpc, classification.System);
      Assert.AreEqual("10000025", classification.Code);
      Assert.AreEqual("2026-05", classification.Version);
      Assert.AreEqual("Milk / Butter / Cream / Yogurt / Eggs / Egg Substitutes", classification.OfficialLabel);
      Assert.AreNotEqual(PlaceholderMetadata, classification.Version);
    }

    Assert.IsNull(persisted[1].Classification);
  }

  /// <summary>
  /// Verifies that the invoice update write path canonicalizes a manual GPC selection before the aggregate is
  /// persisted, preventing caller-provided placeholder labels, versions, and hierarchy from reaching storage.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_ManualGpcSelection_PersistsCanonicalProductClassification()
  {
    // Arrange
    var harness = new InvoiceHarness();
    Invoice invoice = InvoiceHarness.CreateInvoice();
    invoice.Items =
    [
      new Product
      {
        Name = "Milk",
        Classification = new ClassificationSelectionDto(ClassificationSystem.Gs1Gpc, "10000025").ToManualSelection(),
      },
    ];

    // Act
    await harness.Service.UpdateInvoiceObject(invoice, invoice.id, invoice.UserIdentifier, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    StandardClassification persisted = harness.UpdatedInvoice!.Items.Single().Classification!;
    Assert.AreEqual(ClassificationSystem.Gs1Gpc, persisted.System);
    Assert.AreEqual("10000025", persisted.Code);
    Assert.AreEqual("2026-05", persisted.Version);
    Assert.AreEqual("Milk / Butter / Cream / Yogurt / Eggs / Egg Substitutes", persisted.OfficialLabel);
    Assert.AreNotEqual(PlaceholderMetadata, persisted.Version);
    Assert.AreEqual(ClassificationOrigin.Manual, persisted.Origin);
    Assert.IsNull(persisted.Confidence);
  }

  /// <summary>
  /// Verifies that a targeted product patch preserves every untouched classification snapshot while still resolving
  /// the explicit manual selection that the patch introduced.
  /// </summary>
  [TestMethod]
  public async Task UpdateInvoiceObject_ProductPatch_PreservesExistingClassificationAndCanonicalizesManualSelection()
  {
    // Arrange
    var harness = new InvoiceHarness();
    StandardClassification existingClassification = new(
      ClassificationSystem.Gs1Gpc,
      "historic-version",
      "10000025",
      "Historic label",
      [new ClassificationNode("brick", "10000025", "Historic label")],
      ClassificationOrigin.Analysis,
      confidence: 0.81,
      evidence: [new ClassificationEvidence("analysis.product", "Persisted milk")]);
    Invoice invoice = InvoiceHarness.CreateInvoice();
    invoice.Items =
    [
      new Product { Name = "Persisted milk", Classification = existingClassification },
      new Product
      {
        Name = "Manually selected milk",
        Classification = new ClassificationSelectionDto(ClassificationSystem.Gs1Gpc, "10000025").ToManualSelection(),
      },
    ];
    invoice.PreserveUntouchedProductClassifications = true;

    // Act
    await harness.Service.UpdateInvoiceObject(invoice, invoice.id, invoice.UserIdentifier, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    Product[] persisted = [.. harness.UpdatedInvoice!.Items];
    StandardClassification retainedClassification = persisted[0].Classification!;
    StandardClassification canonicalClassification = persisted[1].Classification!;
    Assert.AreSame(existingClassification, retainedClassification);
    Assert.AreEqual("historic-version", retainedClassification.Version);
    Assert.AreEqual(1, retainedClassification.Evidence.Count);
    Assert.AreEqual("2026-05", canonicalClassification.Version);
    Assert.AreEqual(ClassificationOrigin.Manual, canonicalClassification.Origin);
    Assert.AreEqual(1, harness.Taxonomy.Calls.Count);
    Assert.AreEqual("10000025", harness.Taxonomy.Calls[0].Code);
  }

  /// <summary>
  /// Verifies that a product classification asserted against a system other than GPC is rejected as a foundation
  /// validation failure.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_ProductClassificationFromWrongSystem_ThrowsFoundationValidationException()
  {
    // Arrange
    var harness = new InvoiceHarness();
    Invoice invoice = InvoiceHarness.CreateInvoice();
    invoice.Items =
    [
      new Product
      {
        Name = "Milk",
        Classification = new ClassificationSelectionDto(ClassificationSystem.EcoicopV2, "01.1.1").ToManualSelection(),
      },
    ];

    // Act + Assert
    InvoiceFoundationValidationException exception =
      await Assert.ThrowsExactlyAsync<InvoiceFoundationValidationException>(async () =>
        await harness.Service.CreateInvoiceObject(invoice, invoice.UserIdentifier, CancellationToken.None)
          .ConfigureAwait(false)).ConfigureAwait(false);

    Assert.IsInstanceOfType<TaxonomyCodeNotFoundException>(exception.InnerException);
    Assert.IsNull(harness.CreatedInvoice);
  }

  /// <summary>
  /// Verifies the invoice foundation resolves both the invoice and every product through the taxonomy broker with
  /// <see cref="ClassificationOrigin.Manual"/> and a null confidence, because a human selection carries no model
  /// confidence.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_ManualSelections_ResolveWithManualOriginAndNullConfidence()
  {
    // Arrange
    var harness = new InvoiceHarness();
    Invoice invoice = InvoiceHarness.CreateInvoice();
    invoice.Classification = new ClassificationSelectionDto(ClassificationSystem.EcoicopV2, "01.1.1").ToManualSelection();
    invoice.Items =
    [
      new Product
      {
        Name = "Milk",
        Classification = new ClassificationSelectionDto(ClassificationSystem.Gs1Gpc, "10000025").ToManualSelection(),
      },
    ];

    // Act
    await harness.Service.CreateInvoiceObject(invoice, invoice.UserIdentifier, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    Assert.AreEqual(2, harness.Taxonomy.Calls.Count);
    CollectionAssert.AreEqual(
      new[] { ClassificationSystem.EcoicopV2, ClassificationSystem.Gs1Gpc },
      harness.Taxonomy.Calls.ConvertAll(call => call.System));

    foreach (TaxonomyResolveCall call in harness.Taxonomy.Calls)
    {
      Assert.AreEqual(ClassificationOrigin.Manual, call.Origin);
      Assert.IsNull(call.Confidence);
    }

    Assert.AreEqual(ClassificationOrigin.Manual, harness.CreatedInvoice!.Classification!.Origin);
    Assert.IsNull(harness.CreatedInvoice.Classification.Confidence);
  }

  #endregion

  #region Merchant NACE canonicalization

  /// <summary>
  /// Verifies that a manually selected NACE code is persisted as the canonical taxonomy projection.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_ManualNaceSelection_PersistsCanonicalMerchantClassification()
  {
    // Arrange
    var harness = new MerchantHarness();
    Merchant merchant = MerchantHarness.CreateMerchant();
    merchant.Classification = new ClassificationSelectionDto(ClassificationSystem.Nace21, "01").ToManualSelection();

    // Act
    await harness.Service.CreateMerchantObject(merchant, merchant.ParentCompanyId, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    StandardClassification persisted = harness.CreatedMerchant!.Classification!;
    Assert.AreEqual(ClassificationSystem.Nace21, persisted.System);
    Assert.AreEqual("01", persisted.Code);
    Assert.AreEqual("2.1", persisted.Version);
    Assert.AreEqual(
      "Crop and animal production, hunting and related service activities",
      persisted.OfficialLabel);
    Assert.AreEqual(2, persisted.Hierarchy.Count);
    Assert.AreEqual("A", persisted.Hierarchy[0].Code);
    Assert.AreNotEqual(PlaceholderMetadata, persisted.Version);
  }

  /// <summary>
  /// Verifies that updating a merchant canonicalizes its classification on the write path too.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchantObject_ManualNaceSelection_PersistsCanonicalMerchantClassification()
  {
    // Arrange
    var harness = new MerchantHarness();
    Merchant merchant = MerchantHarness.CreateMerchant();
    merchant.Classification = new ClassificationSelectionDto(ClassificationSystem.Nace21, "A").ToManualSelection();

    // Act
    await harness.Service.UpdateMerchantObject(
      merchant,
      merchant.id,
      merchant.ParentCompanyId,
      CancellationToken.None).ConfigureAwait(false);

    // Assert
    StandardClassification persisted = harness.UpdatedMerchant!.Classification!;
    Assert.AreEqual("A", persisted.Code);
    Assert.AreEqual("AGRICULTURE, FORESTRY AND FISHING", persisted.OfficialLabel);
    Assert.AreEqual("2.1", persisted.Version);
  }

  /// <summary>
  /// Verifies that a merchant classification asserted against a system other than NACE is rejected as a foundation
  /// validation failure.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_MerchantClassificationFromWrongSystem_ThrowsFoundationValidationException()
  {
    // Arrange
    var harness = new MerchantHarness();
    Merchant merchant = MerchantHarness.CreateMerchant();
    merchant.Classification = new ClassificationSelectionDto(ClassificationSystem.Gs1Gpc, "10000025").ToManualSelection();

    // Act + Assert
    MerchantFoundationServiceValidationException exception =
      await Assert.ThrowsExactlyAsync<MerchantFoundationServiceValidationException>(async () =>
        await harness.Service.CreateMerchantObject(merchant, merchant.ParentCompanyId, CancellationToken.None)
          .ConfigureAwait(false)).ConfigureAwait(false);

    Assert.IsInstanceOfType<TaxonomyCodeNotFoundException>(exception.InnerException);
    Assert.IsNull(harness.CreatedMerchant);
  }

  /// <summary>
  /// Verifies the merchant foundation resolves through the taxonomy broker with
  /// <see cref="ClassificationOrigin.Manual"/> and a null confidence.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_ManualSelection_ResolvesWithManualOriginAndNullConfidence()
  {
    // Arrange
    var harness = new MerchantHarness();
    Merchant merchant = MerchantHarness.CreateMerchant();
    merchant.Classification = new ClassificationSelectionDto(ClassificationSystem.Nace21, "01").ToManualSelection();

    // Act
    await harness.Service.CreateMerchantObject(merchant, merchant.ParentCompanyId, CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    TaxonomyResolveCall call = harness.Taxonomy.Calls[0];
    Assert.AreEqual(1, harness.Taxonomy.Calls.Count);
    Assert.AreEqual(ClassificationSystem.Nace21, call.System);
    Assert.AreEqual("01", call.Code);
    Assert.AreEqual(ClassificationOrigin.Manual, call.Origin);
    Assert.IsNull(call.Confidence);
  }

  #endregion

  /// <summary>
  /// Captures one taxonomy resolution request issued by a storage foundation service.
  /// </summary>
  /// <param name="System">The taxonomy system the foundation demanded.</param>
  /// <param name="Code">The taxonomy code the foundation forwarded.</param>
  /// <param name="Origin">The classification origin the foundation forwarded.</param>
  /// <param name="Confidence">The confidence the foundation forwarded.</param>
  internal sealed record TaxonomyResolveCall(
    ClassificationSystem System,
    string Code,
    ClassificationOrigin Origin,
    double? Confidence);

  /// <summary>
  /// Records every <see cref="ITaxonomyBroker.Resolve"/> call while delegating to the real catalog-backed broker.
  /// </summary>
  private sealed class RecordingTaxonomyBroker(ITaxonomyBroker inner) : ITaxonomyBroker
  {
    internal List<TaxonomyResolveCall> Calls { get; } = [];

    public string GetArtifactVersion(ClassificationSystem system) => inner.GetArtifactVersion(system);

    public IReadOnlyList<TaxonomySearchResult> Search(ClassificationSystem system, string query, int maximumResults) =>
      inner.Search(system, query, maximumResults);

    public StandardClassification Resolve(
      ClassificationSystem system,
      string code,
      ClassificationOrigin origin,
      double? confidence,
      IReadOnlyList<ClassificationEvidence> evidence)
    {
      Calls.Add(new TaxonomyResolveCall(system, code, origin, confidence));
      return inner.Resolve(system, code, origin, confidence, evidence);
    }

    public bool Contains(ClassificationSystem system, string code) => inner.Contains(system, code);
  }

  private sealed class InvoiceHarness
  {
    internal InvoiceHarness()
    {
      Taxonomy = new RecordingTaxonomyBroker(TaxonomyBrokerTestFactory.Create());
      var broker = new Mock<IInvoiceNoSqlBroker>();

      broker
        .Setup(b => b.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
        .Callback<Invoice, CancellationToken>((invoice, _) => CreatedInvoice = invoice)
        .ReturnsAsync((Invoice invoice, CancellationToken _) => invoice);

      broker
        .Setup(b => b.UpdateInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
        .Callback<Guid, Invoice, CancellationToken>((_, invoice, _) => UpdatedInvoice = invoice)
        .ReturnsAsync((Guid _, Invoice invoice, CancellationToken _) => invoice);

      Service = new InvoiceStorageFoundationService(broker.Object, Taxonomy, NullLoggerFactory.Instance);
    }

    internal RecordingTaxonomyBroker Taxonomy { get; }

    internal InvoiceStorageFoundationService Service { get; }

    internal Invoice? CreatedInvoice { get; private set; }

    internal Invoice? UpdatedInvoice { get; private set; }

    internal static Invoice CreateInvoice() => new()
    {
      id = Guid.CreateVersion7(),
      UserIdentifier = Guid.CreateVersion7(),
      Name = "Canonicalization subject",
    };
  }

  private sealed class MerchantHarness
  {
    internal MerchantHarness()
    {
      Taxonomy = new RecordingTaxonomyBroker(TaxonomyBrokerTestFactory.Create());
      var broker = new Mock<IInvoiceNoSqlBroker>();

      broker
        .Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
        .Callback<Merchant, CancellationToken>((merchant, _) => CreatedMerchant = merchant)
        .ReturnsAsync((Merchant merchant, CancellationToken _) => merchant);

      broker
        .Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync((Guid identifier, Guid? parentCompanyId, CancellationToken _) => new Merchant
        {
          id = identifier,
          ParentCompanyId = parentCompanyId ?? Guid.Empty,
          Name = "Stored merchant",
        });

      broker
        .Setup(b => b.UpdateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
        .Callback<Merchant, Merchant, CancellationToken>((_, merchant, _) => UpdatedMerchant = merchant)
        .ReturnsAsync((Merchant _, Merchant merchant, CancellationToken _) => merchant);

      Service = new MerchantStorageFoundationService(broker.Object, Taxonomy, NullLoggerFactory.Instance);
    }

    internal RecordingTaxonomyBroker Taxonomy { get; }

    internal MerchantStorageFoundationService Service { get; }

    internal Merchant? CreatedMerchant { get; private set; }

    internal Merchant? UpdatedMerchant { get; private set; }

    internal static Merchant CreateMerchant() => new()
    {
      id = Guid.CreateVersion7(),
      ParentCompanyId = Guid.CreateVersion7(),
      Name = "Canonicalization subject",
    };
  }
}
