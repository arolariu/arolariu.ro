namespace arolariu.Backend.Domain.Tests.Invoices.Architecture;

using System;
using System.Linq;
using System.Reflection;

using arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;
using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Management;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the approved service-layer dependency graph through constructor reflection.
/// </summary>
[TestClass]
public sealed class InvoiceStandardLayeringArchitectureTests
{
  /// <summary>
  /// Verifies the primary services expose the approved dependency graph from management down to foundations.
  /// </summary>
  [TestMethod]
  public void ServiceConstructors_ApprovedGraph_MatchesExpectedDependencies()
  {
    AssertConstructorDependencies(
      typeof(InvoiceManagementService),
      typeof(IInvoiceProcessingService));

    AssertConstructorDependencies(
      typeof(InvoiceProcessingService),
      typeof(IInvoiceOrchestrationService),
      typeof(IMerchantOrchestrationService),
      typeof(IAnalysisOrchestrationService),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(InvoiceOrchestrationService),
      typeof(IInvoiceStorageFoundationService),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(MerchantOrchestrationService),
      typeof(IMerchantStorageFoundationService),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(AnalysisOrchestrationService),
      typeof(IAnalysisFoundationService),
      typeof(IAnalysisQueueFoundationService),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(InvoiceStorageFoundationService),
      typeof(IDatabaseBroker),
      typeof(IBlobStorageBroker),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(MerchantStorageFoundationService),
      typeof(IDatabaseBroker),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(AnalysisFoundationService),
      typeof(IDocumentIntelligenceBroker),
      typeof(IGenerativeAnalysisBroker),
      typeof(ITaxonomyBroker),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(AnalysisQueueFoundationService),
      typeof(IQueueBroker),
      typeof(ILoggerFactory));
  }

  private static void AssertConstructorDependencies(Type concreteType, params Type[] expectedParameterTypes)
  {
    ConstructorInfo constructor = concreteType.GetConstructors(BindingFlags.Public | BindingFlags.Instance).Single();
    Type[] actualParameterTypes = constructor.GetParameters().Select(parameter => parameter.ParameterType).ToArray();
    CollectionAssert.AreEqual(expectedParameterTypes, actualParameterTypes, concreteType.FullName);
  }
}
