namespace LocalDevelopment.Tests.Identity.Configuration;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the local identity service rejects unsafe binding configuration.
/// </summary>
[TestClass]
public sealed class LocalIdentityBindingTests
{
  /// <summary>
  /// Verifies explicit loopback bindings are accepted.
  /// </summary>
  [TestMethod]
  public void RequireLoopbackBinding_LoopbackUrls_ReturnsNormally()
  {
    global::LocalDevelopment.Identity.Program.RequireLoopbackBinding(
      "http://localhost:5011;https://127.0.0.1:5012");
  }

  /// <summary>
  /// Verifies the token service cannot start without an explicit binding.
  /// </summary>
  [TestMethod]
  public void RequireLoopbackBinding_MissingUrls_ThrowsInvalidOperationException()
  {
    Assert.ThrowsExactly<InvalidOperationException>(
      () => global::LocalDevelopment.Identity.Program.RequireLoopbackBinding(null));
  }

  /// <summary>
  /// Verifies any remote binding prevents token service startup.
  /// </summary>
  [TestMethod]
  [DataRow("http://0.0.0.0:5011")]
  [DataRow("http://localhost:5011;http://192.0.2.1:5011")]
  public void RequireLoopbackBinding_RemoteUrl_ThrowsInvalidOperationException(
    string urls)
  {
    Assert.ThrowsExactly<InvalidOperationException>(
      () => global::LocalDevelopment.Identity.Program.RequireLoopbackBinding(urls));
  }
}
