namespace AppHost.Tests.Repository;

using global::AppHost.Repository;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies paths are anchored to the host rather than the caller.</summary>
[TestClass]
public sealed class RepositoryLayoutTests
{
  /// <summary>Verifies absolute repository and service paths.</summary>
  [TestMethod]
  public void Resolve_HostRoot_ProducesAbsoluteRepositoryPaths()
  {
    string root = Path.Combine(Path.GetTempPath(), "repository-layout-test");
    RepositoryLayout layout = RepositoryLayout.Resolve(Path.Combine(root, "tooling", "src", "AppHost"));

    Assert.AreEqual(root, layout.RootDirectory);
    Assert.AreEqual(Path.Combine(root, "sites", "exp.arolariu.ro"), layout.ExpDirectory);
    Assert.AreEqual(Path.Combine(layout.ExpDirectory, "config.docker.json"), layout.SourceConfigPath);
    Assert.AreEqual(Path.Combine(layout.ExpDirectory, "config.aspire.json"), layout.GeneratedConfigPath);
    Assert.AreEqual(Path.Combine(root, "sites", "arolariu.ro"), layout.WebsiteDirectory);
    Assert.AreEqual(Path.Combine(root, "sites", "cv.arolariu.ro"), layout.CvDirectory);
    Assert.AreEqual(Path.Combine(root, "sites", "docs.arolariu.ro"), layout.DocsDirectory);
    Assert.AreEqual(Path.Combine(root, "sites", "status.arolariu.ro"), layout.StatusDirectory);
  }

  /// <summary>Verifies an absent host location fails explicitly.</summary>
  [TestMethod]
  public void Resolve_EmptyHostPath_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => RepositoryLayout.Resolve(""));
}
