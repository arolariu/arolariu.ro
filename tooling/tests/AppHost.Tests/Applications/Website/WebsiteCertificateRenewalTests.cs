namespace AppHost.Tests.Applications.Website;

using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using global::AppHost.Applications.Website;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies the website's local HTTPS certificate is renewed before it expires, never by changing trust.</summary>
[TestClass]
public sealed class WebsiteCertificateRenewalTests
{
  private static readonly DateTimeOffset Now = new(2026, 11, 3, 12, 0, 0, TimeSpan.Zero);
  private string directory = string.Empty;

  private string CertificatePath => Path.Combine(directory, WebsiteCertificateRenewal.CertificateFileName);

  private string KeyPath => Path.Combine(directory, WebsiteCertificateRenewal.KeyFileName);

  /// <summary>Creates an isolated certificates directory per test.</summary>
  [TestInitialize]
  public void CreateDirectory()
  {
    directory = Path.Combine(Path.GetTempPath(), "website-certificates-" + Guid.NewGuid().ToString("N"));
    Directory.CreateDirectory(directory);
  }

  /// <summary>Removes the per-test certificates directory.</summary>
  [TestCleanup]
  public void DeleteDirectory() => Directory.Delete(directory, recursive: true);

  /// <summary>Verifies a certificate valid beyond the renewal window is kept.</summary>
  [TestMethod]
  public void Renew_CertificateValidBeyondWindow_KeepsFiles()
  {
    WriteCertificate(Now.AddDays(30));

    CertificateRenewalResult result = WebsiteCertificateRenewal.Renew(directory, Now, _ => true);

    Assert.AreEqual(CertificateRenewalOutcome.Valid, result.Outcome);
    Assert.IsTrue(File.Exists(CertificatePath));
    Assert.IsTrue(File.Exists(KeyPath));
  }

  /// <summary>Verifies an expiring certificate from a trusted CA is removed so Next.js re-issues it.</summary>
  [TestMethod]
  public void Renew_CertificateExpiringWithTrustedIssuer_DeletesBothFiles()
  {
    DateTimeOffset notAfter = WriteCertificate(Now.AddDays(3));

    CertificateRenewalResult result = WebsiteCertificateRenewal.Renew(directory, Now, _ => true);

    Assert.AreEqual(CertificateRenewalOutcome.Renewed, result.Outcome);
    Assert.AreEqual(notAfter, result.ExpiresAt);
    Assert.IsFalse(File.Exists(CertificatePath));
    Assert.IsFalse(File.Exists(KeyPath));
  }

  /// <summary>Verifies an already-expired certificate from a trusted CA is still renewed.</summary>
  [TestMethod]
  public void Renew_CertificateAlreadyExpiredWithTrustedIssuer_DeletesBothFiles()
  {
    WriteCertificate(Now.AddDays(-1));

    CertificateRenewalResult result = WebsiteCertificateRenewal.Renew(directory, Now, _ => true);

    Assert.AreEqual(CertificateRenewalOutcome.Renewed, result.Outcome);
    Assert.IsFalse(File.Exists(CertificatePath));
    Assert.IsFalse(File.Exists(KeyPath));
  }

  /// <summary>Verifies renewal refuses to proceed when re-issuing would require trusting a new CA.</summary>
  [TestMethod]
  public void Renew_CertificateExpiringWithUntrustedIssuer_ThrowsAndKeepsFiles()
  {
    WriteCertificate(Now.AddDays(3));

    Assert.ThrowsExactly<InvalidOperationException>(() => WebsiteCertificateRenewal.Renew(directory, Now, _ => false));

    Assert.IsTrue(File.Exists(CertificatePath));
    Assert.IsTrue(File.Exists(KeyPath));
  }

  /// <summary>Verifies an unreadable certificate fails clearly without deleting anything.</summary>
  [TestMethod]
  public void Renew_CertificateUnreadable_ThrowsAndKeepsFiles()
  {
    File.WriteAllText(CertificatePath, "not a certificate");
    File.WriteAllText(KeyPath, "key");

    Assert.ThrowsExactly<InvalidOperationException>(() => WebsiteCertificateRenewal.Renew(directory, Now, _ => true));

    Assert.IsTrue(File.Exists(CertificatePath));
    Assert.IsTrue(File.Exists(KeyPath));
  }

  /// <summary>Verifies a missing certificate is left for Next.js to create.</summary>
  [TestMethod]
  public void Renew_CertificateMissing_ReturnsMissingAndKeepsKey()
  {
    File.WriteAllText(KeyPath, "key");

    CertificateRenewalResult result = WebsiteCertificateRenewal.Renew(directory, Now, _ => true);

    Assert.AreEqual(CertificateRenewalOutcome.Missing, result.Outcome);
    Assert.IsTrue(File.Exists(KeyPath));
  }

  /// <summary>Verifies a chain whose CA is not in the machine's trust store is reported as untrusted.</summary>
  [TestMethod]
  public void IsIssuerTrusted_UntrustedSelfSignedIssuer_ReturnsFalse()
  {
    using X509Certificate2 leaf = CreateLeaf(Now.AddDays(30));

    Assert.IsFalse(WebsiteCertificateRenewal.IsIssuerTrusted(leaf));
  }

  /// <summary>Verifies renewal runs only when the resource starts, never during composition.</summary>
  [TestMethod]
  public async Task WithDevelopmentCertificateRenewal_RenewsOnlyWhenResourceStarts()
  {
    WriteCertificate(Now.AddDays(3));
    var builder = DistributedApplication.CreateBuilder(new DistributedApplicationOptions
    {
      ProjectDirectory = directory,
      DisableDashboard = true,
      Args = [],
    });
    var probe = builder.AddExecutable("probe", "cmd", directory)
      .WithDevelopmentCertificateRenewal(directory, new FixedTimeProvider(Now), _ => true);

    Assert.IsTrue(File.Exists(CertificatePath));
    Assert.IsTrue(File.Exists(KeyPath));

    using ServiceProvider services = builder.Services.BuildServiceProvider();
    await builder.Eventing.PublishAsync(new BeforeResourceStartedEvent(probe.Resource, services));

    Assert.IsFalse(File.Exists(CertificatePath));
    Assert.IsFalse(File.Exists(KeyPath));
  }

  private DateTimeOffset WriteCertificate(DateTimeOffset notAfter)
  {
    using X509Certificate2 leaf = CreateLeaf(notAfter);
    File.WriteAllText(CertificatePath, leaf.ExportCertificatePem());
    File.WriteAllText(KeyPath, "key");
    return new DateTimeOffset(leaf.NotAfter);
  }

  private static X509Certificate2 CreateLeaf(DateTimeOffset notAfter)
  {
    using ECDsa authorityKey = ECDsa.Create(ECCurve.NamedCurves.nistP256);
    var authorityRequest = new CertificateRequest("CN=Test Development CA", authorityKey, HashAlgorithmName.SHA256);
    authorityRequest.CertificateExtensions.Add(new X509BasicConstraintsExtension(true, false, 0, true));
    authorityRequest.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.KeyCertSign, true));
    using X509Certificate2 authority = authorityRequest.CreateSelfSigned(Now.AddYears(-1), Now.AddYears(5));

    using ECDsa leafKey = ECDsa.Create(ECCurve.NamedCurves.nistP256);
    var leafRequest = new CertificateRequest("CN=localhost", leafKey, HashAlgorithmName.SHA256);
    return leafRequest.Create(authority, Now.AddDays(-30), notAfter, [1, 2, 3, 4]);
  }

  private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
  {
    public override DateTimeOffset GetUtcNow() => now;
  }
}
