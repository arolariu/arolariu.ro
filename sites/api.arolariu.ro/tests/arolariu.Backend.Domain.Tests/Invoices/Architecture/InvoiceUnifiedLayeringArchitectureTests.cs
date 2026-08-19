namespace arolariu.Backend.Domain.Tests.Invoices.Architecture;

using System;
using System.Linq;
using System.Reflection;

using arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.Services.Management;
using arolariu.Backend.Domain.Invoices.Workers;

using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the approved unified invoice service graph without compile-time dependencies on types that do not exist yet.
/// </summary>
[TestClass]
public sealed class InvoiceUnifiedLayeringArchitectureTests
{
  private const string ServicesNamespace = "arolariu.Backend.Domain.Invoices.Services";
  private const string BrokersNamespace = "arolariu.Backend.Domain.Invoices.Brokers";
  private static readonly Assembly InvoiceAssembly = typeof(InvoiceManagementService).Assembly;

  /// <summary>
  /// Verifies the target Management, Processing, Orchestration, and Foundation constructors.
  /// </summary>
  [TestMethod]
  public void ServiceConstructors_UnifiedGraph_MatchExpectedDependencies()
  {
    Type management = RequireType($"{ServicesNamespace}.Management.InvoiceManagementService");
    Type processing = RequireType($"{ServicesNamespace}.Processing.InvoiceProcessingService");
    Type processingContract = RequireType($"{ServicesNamespace}.Processing.IInvoiceProcessingService");
    Type invoiceOrchestration = RequireType($"{ServicesNamespace}.Orchestration.InvoiceService.IInvoiceOrchestrationService");
    Type merchantOrchestration = RequireType($"{ServicesNamespace}.Orchestration.MerchantService.IMerchantOrchestrationService");
    Type analysisOrchestrationContract = RequireType($"{ServicesNamespace}.Orchestration.AnalysisService.IAnalysisOrchestrationService");
    Type analysisOrchestration = RequireType($"{ServicesNamespace}.Orchestration.AnalysisService.AnalysisOrchestrationService");
    Type analysisFoundationContract = RequireType($"{ServicesNamespace}.Foundation.Analysis.IAnalysisFoundationService");
    Type queueFoundationContract = RequireType($"{ServicesNamespace}.Foundation.AnalysisQueue.IAnalysisQueueFoundationService");
    Type analysisFoundation = RequireType($"{ServicesNamespace}.Foundation.Analysis.AnalysisFoundationService");
    Type documentBroker = RequireType($"{BrokersNamespace}.DocumentIntelligenceBroker.IDocumentIntelligenceBroker");
    Type generativeBroker = RequireType($"{BrokersNamespace}.GenerativeAnalysisBroker.IGenerativeAnalysisBroker");
    Type taxonomyBroker = RequireType($"{BrokersNamespace}.TaxonomyBroker.ITaxonomyBroker");

    AssertConstructor(management, processingContract);
    AssertConstructor(
      processing,
      invoiceOrchestration,
      merchantOrchestration,
      analysisOrchestrationContract,
      typeof(ILoggerFactory));
    AssertConstructor(
      analysisOrchestration,
      analysisFoundationContract,
      queueFoundationContract,
      typeof(ILoggerFactory));
    AssertConstructor(
      analysisFoundation,
      documentBroker,
      generativeBroker,
      taxonomyBroker,
      typeof(ILoggerFactory));
  }

  /// <summary>
  /// Verifies endpoint handlers and the worker retain Management-only entry points.
  /// </summary>
  [TestMethod]
  public void Adapters_PublicDependencies_UseManagementOnly()
  {
    Type managementContract = typeof(IInvoiceManagementService);
    Type[] endpointServiceParameters = typeof(InvoiceEndpoints)
      .GetMethods(BindingFlags.Static | BindingFlags.NonPublic)
      .SelectMany(method => method.GetParameters())
      .Select(parameter => parameter.ParameterType)
      .Where(type => type.Namespace?.StartsWith(ServicesNamespace, StringComparison.Ordinal) == true)
      .Distinct()
      .ToArray();

    CollectionAssert.AreEquivalent(new[] { managementContract }, endpointServiceParameters);

    Type[] workerServiceFields = typeof(AnalysisWorker)
      .GetFields(BindingFlags.Instance | BindingFlags.NonPublic)
      .Select(field => field.FieldType)
      .Where(type => type.Namespace?.StartsWith(ServicesNamespace, StringComparison.Ordinal) == true)
      .ToArray();

    Assert.AreEqual(0, workerServiceFields.Length);
  }

  /// <summary>
  /// Verifies Processing exposes one exception family after service consolidation.
  /// </summary>
  [TestMethod]
  public void ProcessingExceptions_UnifiedContract_ReplacesLegacyFamilies()
  {
    const string processingExceptions =
      "arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing";

    Assert.IsNotNull(InvoiceAssembly.GetType($"{processingExceptions}.InvoiceProcessingServiceValidationException"));
    Assert.IsNotNull(InvoiceAssembly.GetType($"{processingExceptions}.InvoiceProcessingServiceDependencyException"));
    Assert.IsNotNull(InvoiceAssembly.GetType($"{processingExceptions}.InvoiceProcessingServiceDependencyValidationException"));
    Assert.IsNotNull(InvoiceAssembly.GetType($"{processingExceptions}.InvoiceProcessingServiceException"));
    Assert.IsNull(InvoiceAssembly.GetType($"{processingExceptions}.CrudProcessingServiceException"));
    Assert.IsNull(InvoiceAssembly.GetType(
      "arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Processing.AnalysisProcessingServiceException"));
  }

  private static Type RequireType(string fullName) =>
    InvoiceAssembly.GetType(fullName)
    ?? throw new AssertFailedException($"Required unified architecture type '{fullName}' was not found.");

  private static void AssertConstructor(Type concreteType, params Type[] expectedParameterTypes)
  {
    ConstructorInfo constructor = concreteType
      .GetConstructors(BindingFlags.Public | BindingFlags.Instance)
      .Single();
    Type[] actualParameterTypes = constructor
      .GetParameters()
      .Select(parameter => parameter.ParameterType)
      .ToArray();

    CollectionAssert.AreEqual(expectedParameterTypes, actualParameterTypes, concreteType.FullName);
  }
}
