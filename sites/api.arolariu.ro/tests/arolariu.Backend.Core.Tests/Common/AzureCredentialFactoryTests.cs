namespace arolariu.Backend.Core.Tests.Common;

using arolariu.Backend.Common.Azure;
using Azure.Identity;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for <see cref="AzureCredentialFactory"/>.
/// </summary>
[TestClass]
public class AzureCredentialFactoryTests
{
    /// <summary>
    /// Verifies that <see cref="AzureCredentialFactory.CreateCredential"/> returns a <see cref="DefaultAzureCredential"/> instance.
    /// </summary>
    [TestMethod]
    public void CreateCredential_ReturnsDefaultAzureCredential()
    {
        var credential = AzureCredentialFactory.CreateCredential();
        Assert.IsNotNull(credential);
        Assert.IsInstanceOfType<DefaultAzureCredential>(credential);
    }

    /// <summary>
    /// Verifies that <see cref="AzureCredentialFactory.CreateCredential"/> returns the same singleton instance on repeated calls.
    /// </summary>
    [TestMethod]
    public void CreateCredential_ReturnsSameInstance()
    {
        var first = AzureCredentialFactory.CreateCredential();
        var second = AzureCredentialFactory.CreateCredential();
        Assert.AreSame(first, second);
    }
}
