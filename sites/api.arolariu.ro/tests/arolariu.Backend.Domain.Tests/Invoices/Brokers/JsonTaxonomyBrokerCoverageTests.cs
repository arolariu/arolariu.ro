namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers taxonomy broker private token-overlap and artifact-loading edge branches.
/// </summary>
[TestClass]
public sealed class JsonTaxonomyBrokerCoverageTests
{
  /// <summary>
  /// Verifies embedded artifacts can be loaded repeatedly through the default constructor.
  /// </summary>
  [TestMethod]
  public void Constructor_CalledTwice_LoadsEmbeddedArtifactsEachTime()
  {
    var first = new JsonTaxonomyBroker();
    var second = new JsonTaxonomyBroker();

    Assert.IsTrue(first.Contains(ClassificationSystem.Gs1Gpc, "10000025"));
    Assert.IsTrue(second.Contains(ClassificationSystem.Nace21, "A"));
  }

  /// <summary>
  /// Verifies construction rejects injected artifacts that omit a supported taxonomy system.
  /// </summary>
  [TestMethod]
  public void Constructor_MissingInjectedArtifact_ThrowsArgumentException()
  {
    var artifacts = new Dictionary<ClassificationSystem, string>(TaxonomyBrokerTestFactory.CreateArtifactJsonBySystem());
    _ = artifacts.Remove(ClassificationSystem.Nace21);

    Assert.ThrowsExactly<ArgumentException>(() => new JsonTaxonomyBroker(artifacts));
  }
}
