namespace LocalDevelopment.Tests.AppHost.Applications.Exp;

using System.Text.Json;
using global::AppHost.Applications.Exp;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for <see cref="ExpConfigGenerator.GenerateAspireConfig"/>.
/// </summary>
[TestClass]
public sealed class ExpConfigGeneratorTests
{
  [TestMethod]
  public void GenerateAspireConfig_MalformedJson_PreservesPreviousTarget()
  {
    string source = Path.GetTempFileName();
    string target = Path.GetTempFileName();
    File.WriteAllText(source, "{");
    File.WriteAllText(target, "previous");
    try
    {
      JsonException exception = Assert.Throws<JsonException>(() =>
        ExpConfigGenerator.GenerateAspireConfig(source, target, new Dictionary<string, string>()));
      Assert.AreEqual(0L, exception.LineNumber);
      Assert.AreEqual(1L, exception.BytePositionInLine);
      Assert.AreEqual("previous", File.ReadAllText(target));
    }
    finally { File.Delete(source); File.Delete(target); }
  }

  [TestMethod]
  public void GenerateAspireConfig_ExistingTarget_PreservesWindowsCreationTime()
  {
    string source = Path.GetTempFileName();
    string target = Path.GetTempFileName();
    File.WriteAllText(source, """{"DbConnection":"source"}""");
    DateTime creation = new(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc);
    try
    {
      if (OperatingSystem.IsWindows()) { File.SetCreationTimeUtc(target, creation); }
      ExpConfigGenerator.GenerateAspireConfig(source, target, new Dictionary<string, string>());
      if (OperatingSystem.IsWindows()) { Assert.AreEqual(creation, File.GetCreationTimeUtc(target)); }
      using JsonDocument json = JsonDocument.Parse(File.ReadAllText(target));
      Assert.AreEqual("source", json.RootElement.GetProperty("DbConnection").GetString());
    }
    finally { File.Delete(source); File.Delete(target); }
  }

  [TestMethod]
  public void GenerateAspireConfig_ReplacementFails_PreservesTargetAndCleansTemporaryFile()
  {
    string directory = Directory.CreateTempSubdirectory().FullName;
    string source = Path.Combine(directory, "source.json");
    string target = Path.Combine(directory, "target.json");
    File.WriteAllText(source, """{"DbConnection":"source"}""");
    File.WriteAllText(target, "previous");
    var failure = new IOException("replacement failed");

    try
    {
      IOException thrown = Assert.ThrowsExactly<IOException>(() =>
        ExpConfigGenerator.GenerateAspireConfig(source, target,
          new Dictionary<string, string> { ["DbConnection"] = "new" },
          (_, _) => throw failure));
      Assert.AreSame(failure, thrown);
      Assert.AreEqual("previous", File.ReadAllText(target));
      Assert.AreEqual("""{"DbConnection":"source"}""", File.ReadAllText(source));
      Assert.HasCount(0, Directory.GetFiles(directory, "*.tmp"));
    }
    finally
    {
      foreach (string file in Directory.GetFiles(directory)) { File.Delete(file); }
      Directory.Delete(directory);
    }
  }

  [TestMethod]
  public void GenerateAspireConfig_NullOverrideKey_PreservesNull()
  {
    string source = Path.GetTempFileName();
    string target = Path.GetTempFileName();
    File.WriteAllText(source, """{"DbConnection":null}""");
    try
    {
      ExpConfigGenerator.GenerateAspireConfig(source, target,
        new Dictionary<string, string> { ["DbConnection"] = "new" });
      using JsonDocument json = JsonDocument.Parse(File.ReadAllText(target));
      Assert.AreEqual(JsonValueKind.Null, json.RootElement.GetProperty("DbConnection").ValueKind);
    }
    finally { File.Delete(source); File.Delete(target); }
  }

  [TestMethod]
  public void GenerateAspireConfig_SameFile_LeavesSourceUnchanged()
  {
    string path = Path.GetTempFileName();
    const string original = """{"DbConnection":"developer-owned"}""";
    File.WriteAllText(path, original);

    try
    {
      Assert.ThrowsExactly<ArgumentException>(() =>
        ExpConfigGenerator.GenerateAspireConfig(
          path, path, new Dictionary<string, string> { ["DbConnection"] = "override" }));
      Assert.AreEqual(original, File.ReadAllText(path));
    }
    finally
    {
      File.Delete(path);
    }
  }

  [TestMethod]
  public void GenerateAspireConfig_KeyPresentInOverrides_UpdatesKeyAndPreservesUnrelatedTopLevelKeys()
  {
    var sourcePath = Path.GetTempFileName();
    var targetPath = Path.GetTempFileName();
    File.WriteAllText(sourcePath,
        """{"DbConnection":"docker://old","FeatureFlag":true,"RetryCount":3}""");

    try
    {
      ExpConfigGenerator.GenerateAspireConfig(sourcePath, targetPath, new Dictionary<string, string>
      {
        ["DbConnection"] = "localhost:1433",
        // Absent in source — must be silently skipped, never introduced.
        ["UnknownKey"] = "should-not-appear",
      });

      using var doc = JsonDocument.Parse(File.ReadAllText(targetPath));
      var root = doc.RootElement;

      Assert.AreEqual("localhost:1433", root.GetProperty("DbConnection").GetString());
      Assert.IsTrue(root.GetProperty("FeatureFlag").GetBoolean());
      Assert.AreEqual(3, root.GetProperty("RetryCount").GetInt32());
      Assert.IsFalse(root.TryGetProperty("UnknownKey", out _));
    }
    finally
    {
      File.Delete(sourcePath);
      File.Delete(targetPath);
    }
  }

  [TestMethod]
  public void GenerateAspireConfig_CalledTwiceWithSameInputs_ProducesIdenticalFileContent()
  {
    var sourcePath = Path.GetTempFileName();
    var targetPath = Path.GetTempFileName();
    File.WriteAllText(sourcePath, """{"DbConnection":"docker://old","OtherKey":42}""");
    var overrides = new Dictionary<string, string> { ["DbConnection"] = "localhost:1433" };

    try
    {
      ExpConfigGenerator.GenerateAspireConfig(sourcePath, targetPath, overrides);
      var first = File.ReadAllText(targetPath);

      ExpConfigGenerator.GenerateAspireConfig(sourcePath, targetPath, overrides);
      var second = File.ReadAllText(targetPath);

      Assert.AreEqual(first, second);
    }
    finally
    {
      File.Delete(sourcePath);
      File.Delete(targetPath);
    }
  }

  [TestMethod]
  public void GenerateAspireConfig_SourceMissing_Throws()
  {
    var missing = Path.Combine(Path.GetTempPath(), $"does-not-exist-{Guid.NewGuid():N}.json");
    var targetPath = Path.GetTempFileName();

    try
    {
      var ex = Assert.ThrowsExactly<InvalidOperationException>(() =>
          ExpConfigGenerator.GenerateAspireConfig(
              missing, targetPath, new Dictionary<string, string>()));
      Assert.Contains("config.docker.json", ex.Message, StringComparison.Ordinal);
    }
    finally
    {
      File.Delete(targetPath);
    }
  }

  [TestMethod]
  public void GenerateAspireConfig_SourceNotJsonObject_Throws()
  {
    var sourcePath = Path.GetTempFileName();
    var targetPath = Path.GetTempFileName();
    File.WriteAllText(sourcePath, "[1, 2, 3]"); // valid JSON, but not an object

    try
    {
      Assert.ThrowsExactly<InvalidOperationException>(() =>
          ExpConfigGenerator.GenerateAspireConfig(
              sourcePath, targetPath, new Dictionary<string, string>()));
    }
    finally
    {
      File.Delete(sourcePath);
      File.Delete(targetPath);
    }
  }
}
