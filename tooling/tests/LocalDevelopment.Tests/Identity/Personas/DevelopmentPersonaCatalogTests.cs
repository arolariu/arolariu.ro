namespace LocalDevelopment.Tests.Identity.Personas;

using global::LocalDevelopment.Identity.Personas;
using global::LocalDevelopment.Bootstrap.Scenarios.Invoices;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies development personas align with deterministic seed ownership.
/// </summary>
[TestClass]
public sealed class DevelopmentPersonaCatalogTests
{
  /// <summary>Verifies runtime identity and seeded ownership contracts agree.</summary>
  [TestMethod]
  public void All_SeedFixture_PreservesKeysSubjectsAndIdentifiers()
  {
    SeedScenarioManifest manifest = SeedData.LoadManifest(
      Path.Combine(AppContext.BaseDirectory, "SeedData", "scenario.v1.json"));
    Assert.AreEqual(manifest.Personas.Count, DevelopmentPersonaCatalog.All.Count);
    foreach (DevelopmentPersona persona in DevelopmentPersonaCatalog.All)
    {
      SeedPersonaDefinition definition = manifest.Personas.Single(candidate => candidate.Key == persona.Key);
      Assert.AreEqual(definition.Subject, persona.Subject);
      Assert.AreEqual(definition.UserIdentifier, persona.UserIdentifier);
    }
  }

  /// <summary>
  /// Verifies all approved persona identifiers remain stable.
  /// </summary>
  [TestMethod]
  public void All_Always_ContainsApprovedPersonaIdentifiers()
  {
    Assert.AreEqual(
      Guid.Parse("7574070c-3ee9-5031-9b1b-0dc08c61ee86"),
      DevelopmentPersonaCatalog.Alice.UserIdentifier);
    Assert.AreEqual(
      Guid.Parse("6a40503e-c1af-51b0-8b60-3c6648b3724e"),
      DevelopmentPersonaCatalog.Bob.UserIdentifier);
    Assert.AreEqual(
      Guid.Parse("fc687d5c-39d5-5541-868c-f76a3fdbd4e4"),
      DevelopmentPersonaCatalog.Charlie.UserIdentifier);
    Assert.HasCount(3, DevelopmentPersonaCatalog.All);
  }
}
