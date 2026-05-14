namespace AppHost.Tests;

using System.Text.Json;
using AppHost.Aspire;
using Xunit;

/// <summary>
/// Unit tests for <see cref="ExpConfigGenerator.GenerateAspireConfig"/>.
/// </summary>
public sealed class ExpConfigGeneratorTests
{
  [Fact]
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

      Assert.Equal("localhost:1433", root.GetProperty("DbConnection").GetString());
      Assert.True(root.GetProperty("FeatureFlag").GetBoolean());
      Assert.Equal(3, root.GetProperty("RetryCount").GetInt32());
      Assert.False(root.TryGetProperty("UnknownKey", out _));
    }
    finally
    {
      File.Delete(sourcePath);
      File.Delete(targetPath);
    }
  }

  [Fact]
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

      Assert.Equal(first, second);
    }
    finally
    {
      File.Delete(sourcePath);
      File.Delete(targetPath);
    }
  }

  [Fact]
  public void GenerateAspireConfig_SourceMissing_Throws()
  {
    var missing = Path.Combine(Path.GetTempPath(), $"does-not-exist-{Guid.NewGuid():N}.json");
    var targetPath = Path.GetTempFileName();

    try
    {
      var ex = Assert.Throws<InvalidOperationException>(() =>
          ExpConfigGenerator.GenerateAspireConfig(
              missing, targetPath, new Dictionary<string, string>()));
      Assert.Contains("config.docker.json", ex.Message, StringComparison.Ordinal);
    }
    finally
    {
      File.Delete(targetPath);
    }
  }

  [Fact]
  public void GenerateAspireConfig_SourceNotJsonObject_Throws()
  {
    var sourcePath = Path.GetTempFileName();
    var targetPath = Path.GetTempFileName();
    File.WriteAllText(sourcePath, "[1, 2, 3]"); // valid JSON, but not an object

    try
    {
      Assert.Throws<InvalidOperationException>(() =>
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
