namespace LocalDevelopment.Bootstrap.Tests.Scenarios.Invoices;

using System.Text.Json.Nodes;
using global::LocalDevelopment.Bootstrap.Scenarios.Invoices;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies the four-file scenario is an indivisible, owner-scoped input bundle.</summary>
[TestClass]
public sealed class SeedScenarioLoadingTests
{
  /// <summary>A missing persona must not silently produce a smaller scenario.</summary>
  [TestMethod]
  public void LoadScenario_MissingRequiredFile_ThrowsWithFileContext()
  {
    using var files = new SeedScenarioDirectory();
    files.Remove("dmitryi");
    AssertInvalid(files, "dmitryi.json");
  }

  /// <summary>Records cannot be moved into another owner's source file.</summary>
  [TestMethod]
  public void LoadScenario_WrongFileOwner_ThrowsWithFileContext()
  {
    using var files = new SeedScenarioDirectory();
    files.Mutate("bob", part => SeedScenarioDirectory.FirstInvoice(part)["ownerKey"] = "alice");
    AssertInvalid(files, "bob.json");
  }

  /// <summary>All persona files must describe the same supported scenario version.</summary>
  [TestMethod]
  public void LoadScenario_MixedVersions_ThrowsWithFileContext()
  {
    using var files = new SeedScenarioDirectory();
    files.Mutate("bob", part => part["version"] = "v1");
    AssertInvalid(files, "bob.json");
  }

  /// <summary>Missing required monetary fields must not become valid-looking zero values.</summary>
  [TestMethod]
  public void LoadScenario_OmittedRequiredField_ThrowsWithFileContext()
  {
    using var files = new SeedScenarioDirectory();
    files.Mutate("bob", part => SeedScenarioDirectory.FirstInvoice(part).Remove("totalAmount"));
    AssertInvalid(files, "bob.json");
  }

  /// <summary>An old single manifest is not a valid directory override.</summary>
  [TestMethod]
  public void LoadScenario_SingleFileOverride_ThrowsMigrationGuidance()
  {
    InvalidDataException failure = Assert.ThrowsExactly<InvalidDataException>(() =>
      SeedData.LoadScenario(Path.Combine(AppContext.BaseDirectory, "SeedData", "bob.json")));
    StringAssert.Contains(failure.Message, "SEED_DATA_DIRECTORY");
  }

  private static void AssertInvalid(SeedScenarioDirectory files, string expectedFile)
  {
    InvalidDataException failure = Assert.ThrowsExactly<InvalidDataException>(() => SeedData.LoadScenario(files.Path));
    StringAssert.Contains(failure.Message, expectedFile);
  }
}

internal sealed class SeedScenarioDirectory : IDisposable
{
  internal string Path { get; } = System.IO.Path.Combine(System.IO.Path.GetTempPath(), $"arolariu-seed-bundle-{Guid.NewGuid():N}");

  internal SeedScenarioDirectory()
  {
    Directory.CreateDirectory(Path);
    foreach (string owner in new[] { "alice", "bob", "charlie", "dmitryi" })
    {
      File.Copy(System.IO.Path.Combine(AppContext.BaseDirectory, "SeedData", $"{owner}.json"),
        System.IO.Path.Combine(Path, $"{owner}.json"));
    }
  }

  internal void Remove(string owner) => File.Delete(System.IO.Path.Combine(Path, $"{owner}.json"));

  internal void Mutate(string owner, Action<JsonObject> change)
  {
    string file = System.IO.Path.Combine(Path, $"{owner}.json");
    JsonObject part = JsonNode.Parse(File.ReadAllText(file))?.AsObject() ?? throw new InvalidDataException();
    change(part);
    File.WriteAllText(file, part.ToJsonString());
  }

  internal static JsonObject FirstInvoice(JsonObject part) =>
    part["invoices"]?.AsArray()[0]?.AsObject() ?? throw new InvalidDataException();

  public void Dispose() => Directory.Delete(Path, recursive: true);
}
