namespace arolariu.Backend.Domain.Tests.Invoices.Architecture;

using System;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies the consolidated database broker contract.</summary>
[TestClass]
public sealed class DatabaseBrokerArchitectureTests
{
  /// <summary>Verifies invoice, merchant, and durable queue operations share one contract.</summary>
  [TestMethod]
  public void DatabaseBroker_ContainsInvoiceMerchantAndQueueOperations()
  {
    Type contract = typeof(IDatabaseBroker);

    Assert.IsNotNull(contract.GetMethod("CreateInvoiceAsync"));
    Assert.IsNotNull(contract.GetMethod("CreateMerchantAsync"));
    Assert.IsNotNull(contract.GetMethod("CreateAnalysisRunAsync"));
    Assert.IsNotNull(contract.GetMethod("StreamAnalysisRunClaimCandidatesAsync"));
  }
}
