namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies the unified three-broker Analysis Foundation.
/// </summary>
[TestClass]
public sealed class AnalysisFoundationServiceTests
{
  /// <summary>
  /// Verifies canonical classification resolution delegates directly to the Taxonomy Broker.
  /// </summary>
  [TestMethod]
  public async Task ResolveClassificationAsync_ValidCode_ReturnsCanonicalClassification()
  {
    var document = new Mock<IDocumentIntelligenceBroker>(MockBehavior.Strict);
    var generative = new Mock<IGenerativeAnalysisBroker>(MockBehavior.Strict);
    var taxonomy = new Mock<ITaxonomyBroker>(MockBehavior.Strict);
    StandardClassification expected = new(
      ClassificationSystem.EcoicopV2,
      "2",
      "01.1",
      "Food",
      [new ClassificationNode("group", "01.1", "Food")],
      ClassificationOrigin.Manual,
      confidence: null,
      evidence: []);
    taxonomy.Setup(broker => broker.Resolve(
        ClassificationSystem.EcoicopV2,
        "01.1",
        ClassificationOrigin.Manual,
        null,
        It.IsAny<System.Collections.Generic.IReadOnlyList<ClassificationEvidence>>()))
      .Returns(expected);
    var service = new AnalysisFoundationService(
      document.Object,
      generative.Object,
      taxonomy.Object,
      NullLoggerFactory.Instance);

    StandardClassification actual = await service.ResolveClassificationAsync(
      ClassificationSystem.EcoicopV2,
      "01.1",
      ClassificationOrigin.Manual,
      confidence: null,
      evidence: [],
      CancellationToken.None).ConfigureAwait(false);

    Assert.AreSame(expected, actual);
    taxonomy.VerifyAll();
  }

  /// <summary>
  /// Verifies the public constructor rejects a missing Broker dependency.
  /// </summary>
  [TestMethod]
  public void Constructor_NullDocumentBroker_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() => new AnalysisFoundationService(
      null!,
      Mock.Of<IGenerativeAnalysisBroker>(),
      Mock.Of<ITaxonomyBroker>(),
      NullLoggerFactory.Instance));
}
