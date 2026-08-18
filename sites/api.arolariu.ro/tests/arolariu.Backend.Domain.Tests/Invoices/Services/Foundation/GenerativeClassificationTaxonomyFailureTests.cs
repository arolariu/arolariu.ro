namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies that the two-phase structured classification pipeline surfaces a taxonomy resolution failure - a
/// model-selected code that is a bounded search candidate but is rejected by canonical resolution - as an
/// observable metric and a wrapped dependency-validation exception.
/// </summary>
/// <remarks>
/// <para>A real catalog-backed taxonomy broker can never disagree with itself between <c>Search</c> and
/// <c>Resolve</c> (both read the same index), so this scenario requires a mocked <see cref="ITaxonomyBroker"/> that
/// deliberately introduces that inconsistency: <c>Search</c> offers a candidate that <c>Resolve</c> then rejects.</para>
/// <para>Marked <see cref="DoNotParallelizeAttribute"/> because it uses <see cref="InvoiceMetricRecorder"/>, which
/// subscribes to the process-wide invoices meter.</para>
/// </remarks>
[TestClass]
[DoNotParallelize]
public sealed class GenerativeClassificationTaxonomyFailureTests
{
  private const string TaxonomyValidationFailuresInstrument = "invoices.analysis.taxonomy.validation_failures";
  private const string FakeCandidateCode = "FAKE001";

  /// <summary>
  /// Verifies that a model-selected code which is a bounded search candidate but is rejected by <c>Resolve</c> is
  /// classified as a dependency-validation failure and records the taxonomy validation-failure metric.
  /// </summary>
  [TestMethod]
  public async Task ClassifyProductsAsync_SelectedCandidateFailsResolution_RecordsTaxonomyValidationFailureAndThrows()
  {
    // Arrange
    var taxonomyBroker = new Mock<ITaxonomyBroker>();

    taxonomyBroker
      .Setup(broker => broker.GetArtifactVersion(ClassificationSystem.Gs1Gpc))
      .Returns("2026-05");

    taxonomyBroker
      .Setup(broker => broker.Search(ClassificationSystem.Gs1Gpc, It.IsAny<string>(), It.IsAny<int>()))
      .Returns(new List<TaxonomySearchResult>
      {
        new(
          ClassificationSystem.Gs1Gpc,
          "2026-05",
          FakeCandidateCode,
          "Fake candidate label",
          [new ClassificationNode("segment", FakeCandidateCode, "Fake candidate label")]),
      });

    taxonomyBroker
      .Setup(broker => broker.Resolve(
        ClassificationSystem.Gs1Gpc,
        FakeCandidateCode,
        It.IsAny<ClassificationOrigin>(),
        It.IsAny<double?>(),
        It.IsAny<IReadOnlyList<ClassificationEvidence>>()))
      .Throws(new TaxonomyCodeNotFoundException(ClassificationSystem.Gs1Gpc, FakeCandidateCode));

    var searchTermsResult = new GenerativeAnalysisFoundationService.SearchTermsBatchResult(
      [new GenerativeAnalysisFoundationService.SearchTermsEntry("item-0001", ["milk"])]);

    var selectionResult = new GenerativeAnalysisFoundationService.SelectionBatchResult(
      [new GenerativeAnalysisFoundationService.SelectionEntry("item-0001", FakeCandidateCode, 0.9)]);

    var broker = new ScriptedGenerativeAiBroker(
      ScriptedGenerativeAiBroker.Success(searchTermsResult),
      ScriptedGenerativeAiBroker.Success(selectionResult));

    GenerativeClassificationHarness harness = GenerativeClassificationHarness.Create(broker, taxonomyBroker: taxonomyBroker.Object);

    using var metricRecorder = new InvoiceMetricRecorder(TaxonomyValidationFailuresInstrument);

    // Act
    AnalysisFoundationDependencyValidationException exception =
      await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyValidationException>(async () =>
        await harness.Service.ClassifyProductsAsync(
          [new ProductAnalysisInput("item-0001", new Product { Name = "lapte" })],
          CancellationToken.None)
          .ConfigureAwait(false)).ConfigureAwait(false);

    // Assert
    Assert.IsInstanceOfType<TaxonomyCodeNotFoundException>(exception.InnerException);

    var measurements = metricRecorder.For(TaxonomyValidationFailuresInstrument);
    Assert.AreEqual(1, measurements.Count);
    InvoiceMetricRecorder.AssertTag(measurements[0], "system", "gs1_gpc");
  }
}
