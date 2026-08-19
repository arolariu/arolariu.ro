namespace arolariu.Backend.Domain.Tests.Invoices.Architecture;

using System;
using System.Linq;
using System.Reflection;

using arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;
using arolariu.Backend.Domain.Invoices.Services.Foundation.ClassificationAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Management;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.ClassificationService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

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
      typeof(ICrudProcessingService),
      typeof(IAnalysisProcessingService));

    AssertConstructorDependencies(
      typeof(CrudProcessingService),
      typeof(IInvoiceOrchestrationService),
      typeof(IMerchantOrchestrationService),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(AnalysisProcessingService),
      typeof(IClassificationOrchestrationService),
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
      typeof(ClassificationOrchestrationService),
      typeof(IClassificationAnalysisFoundationService),
      typeof(IGenerativeAnalysisFoundationService),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(AnalysisOrchestrationService),
      typeof(IAnalysisRunFoundationService),
      typeof(IDocumentAnalysisFoundationService),
      typeof(IGenerativeAnalysisFoundationService),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(InvoiceStorageFoundationService),
      typeof(IDatabaseBroker),
      typeof(IInvoiceBlobStorageBroker),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(MerchantStorageFoundationService),
      typeof(IDatabaseBroker),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(ClassificationAnalysisFoundationService),
      typeof(ITaxonomyBroker),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(GenerativeAnalysisFoundationService),
      typeof(IGenerativeAnalysisBroker),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(DocumentAnalysisFoundationService),
      typeof(IDocumentIntelligenceBroker),
      typeof(ILoggerFactory));

    AssertConstructorDependencies(
      typeof(AnalysisRunFoundationService),
      typeof(IDatabaseBroker),
      typeof(ILoggerFactory));
  }

  private static void AssertConstructorDependencies(Type concreteType, params Type[] expectedParameterTypes)
  {
    ConstructorInfo constructor = concreteType.GetConstructors(BindingFlags.Public | BindingFlags.Instance).Single();
    Type[] actualParameterTypes = constructor.GetParameters().Select(parameter => parameter.ParameterType).ToArray();
    CollectionAssert.AreEqual(expectedParameterTypes, actualParameterTypes, concreteType.FullName);
  }
}
