namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;
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
  /// Verifies the public constructor rejects a missing Broker dependency.
  /// </summary>
  [TestMethod]
  public void Constructor_NullDocumentBroker_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() => new AnalysisFoundationService(
      null!,
      Mock.Of<IGenerativeAnalysisBroker>(),
      NullLoggerFactory.Instance));
}
