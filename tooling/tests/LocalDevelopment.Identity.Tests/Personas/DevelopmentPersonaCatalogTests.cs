namespace LocalDevelopment.Identity.Tests.Personas;

using global::LocalDevelopment.Identity.Personas;
using System.Text.Json;

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
    Assert.HasCount(4, DevelopmentPersonaCatalog.All);
    foreach (DevelopmentPersona persona in DevelopmentPersonaCatalog.All)
    {
      using JsonDocument manifest = JsonDocument.Parse(File.ReadAllText(
        Path.Combine(AppContext.BaseDirectory, "SeedData", $"{persona.Key}.json")));
      JsonElement definition = manifest.RootElement.GetProperty("personas").EnumerateArray().Single();
      Assert.AreEqual(persona.Key, definition.GetProperty("key").GetString());
      Assert.AreEqual(definition.GetProperty("subject").GetString(), persona.Subject);
      Assert.AreEqual(definition.GetProperty("userIdentifier").GetGuid(), persona.UserIdentifier);
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
    Assert.AreEqual(Guid.Parse("2e92f011-8157-564d-a059-af27f4026fd6"),
      DevelopmentPersonaCatalog.Dmitryi.UserIdentifier);
    Assert.HasCount(4, DevelopmentPersonaCatalog.All);
    CollectionAssert.AreEqual(new[] { "alice", "bob", "charlie", "dmitryi" },
      DevelopmentPersonaCatalog.All.Select(persona => persona.Key).ToArray());
  }
}
