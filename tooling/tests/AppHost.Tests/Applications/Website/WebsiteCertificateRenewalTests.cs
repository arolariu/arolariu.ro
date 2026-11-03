namespace AppHost.Tests.Applications.Website;

using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using global::AppHost.Applications.Website;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the website's local HTTPS certificate is re-issued from the already-trusted mkcert CA, never by changing trust
/// and never by deleting the current certificate first.
/// </summary>
[TestClass]
public sealed class WebsiteCertificateRenewalTests
{
  private static readonly DateTimeOffset Now = new(2026, 11, 3, 12, 0, 0, TimeSpan.Zero);
  private string root = string.Empty;
  private string certificates = string.Empty;
  private string authorityDirectory = string.Empty;

  private string CertificatePath => Path.Combine(certificates, WebsiteCertificateRenewal.CertificateFileName);

  private string KeyPath => Path.Combine(certificates, WebsiteCertificateRenewal.KeyFileName);

  /// <summary>Creates isolated certificate and CA directories per test.</summary>
  [TestInitialize]
  public void CreateDirectories()
  {
    root = Path.Combine(Path.GetTempPath(), "website-certificates-" + Guid.NewGuid().ToString("N"));
    certificates = Directory.CreateDirectory(Path.Combine(root, "certificates")).FullName;
    authorityDirectory = Directory.CreateDirectory(Path.Combine(root, "mkcert")).FullName;
  }

  /// <summary>Removes the per-test directories.</summary>
  [TestCleanup]
  public void DeleteDirectories() => Directory.Delete(root, recursive: true);

  /// <summary>Verifies a certificate valid beyond the renewal window is left exactly as it is.</summary>
  [TestMethod]
  public void Renew_CertificateValidBeyondWindow_KeepsFiles()
  {
    using X509Certificate2 authority = WriteAuthority();
    WriteLeaf(authority, Now.AddDays(30));
    (byte[] Certificate, byte[] Key) before = ReadFiles();

    CertificateRenewalResult result = WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true);

    Assert.AreEqual(CertificateRenewalOutcome.Valid, result.Outcome);
    AssertUnchanged(before);
  }

  /// <summary>Verifies an expiring certificate is re-issued from the same trusted CA with a matching key.</summary>
  [TestMethod]
  public void Renew_CertificateExpiringWithTrustedAuthority_ReissuesFromSameAuthority()
  {
    using X509Certificate2 authority = WriteAuthority();
    DateTimeOffset previous = WriteLeaf(authority, Now.AddDays(3));

    CertificateRenewalResult result = WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true);

    Assert.AreEqual(CertificateRenewalOutcome.Renewed, result.Outcome);
    Assert.AreEqual(previous, result.PreviousExpiry);
    AssertIssuedBy(authority);
  }

  /// <summary>Verifies an already-expired certificate is still re-issued when its CA is trusted.</summary>
  [TestMethod]
  public void Renew_CertificateAlreadyExpiredWithTrustedAuthority_Reissues()
  {
    using X509Certificate2 authority = WriteAuthority();
    WriteLeaf(authority, Now.AddDays(-1));

    CertificateRenewalResult result = WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true);

    Assert.AreEqual(CertificateRenewalOutcome.Renewed, result.Outcome);
    AssertIssuedBy(authority);
  }

  /// <summary>Verifies renewal refuses to issue from a CA the machine does not already trust.</summary>
  [TestMethod]
  public void Renew_CertificateExpiringWithUntrustedAuthority_ThrowsAndKeepsFiles()
  {
    using X509Certificate2 authority = WriteAuthority();
    WriteLeaf(authority, Now.AddDays(3));
    (byte[] Certificate, byte[] Key) before = ReadFiles();

    Assert.ThrowsExactly<InvalidOperationException>(() =>
      WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => false));

    AssertUnchanged(before);
  }

  /// <summary>Verifies renewal without the CA key fails clearly and changes nothing.</summary>
  [TestMethod]
  public void Renew_CertificateExpiringWithoutAuthorityKey_ThrowsAndKeepsFiles()
  {
    using X509Certificate2 authority = WriteAuthority();
    WriteLeaf(authority, Now.AddDays(3));
    File.Delete(Path.Combine(authorityDirectory, WebsiteCertificateRenewal.AuthorityKeyFileName));
    (byte[] Certificate, byte[] Key) before = ReadFiles();

    Assert.ThrowsExactly<InvalidOperationException>(() =>
      WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true));

    AssertUnchanged(before);
  }

  /// <summary>Verifies a certificate from a different CA is never replaced by one from the local CA.</summary>
  [TestMethod]
  public void Renew_CertificateFromAnotherAuthority_ThrowsAndKeepsFiles()
  {
    using X509Certificate2 local = WriteAuthority();
    using X509Certificate2 other = CreateAuthority("CN=Another Development CA");
    WriteLeaf(other, Now.AddDays(3));
    (byte[] Certificate, byte[] Key) before = ReadFiles();

    Assert.ThrowsExactly<InvalidOperationException>(() =>
      WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true));

    AssertUnchanged(before);
  }

  /// <summary>Verifies an unreadable certificate fails clearly and changes nothing.</summary>
  [TestMethod]
  public void Renew_CertificateUnreadable_ThrowsAndKeepsFiles()
  {
    using X509Certificate2 authority = WriteAuthority();
    File.WriteAllText(CertificatePath, "not a certificate");
    File.WriteAllText(KeyPath, "key");
    (byte[] Certificate, byte[] Key) before = ReadFiles();

    Assert.ThrowsExactly<InvalidOperationException>(() =>
      WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true));

    AssertUnchanged(before);
  }

  /// <summary>Verifies a missing certificate is issued from the trusted CA instead of relying on Next.js.</summary>
  [TestMethod]
  public void Renew_CertificateMissingWithTrustedAuthority_IssuesCertificate()
  {
    using X509Certificate2 authority = WriteAuthority();

    CertificateRenewalResult result = WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true);

    Assert.AreEqual(CertificateRenewalOutcome.Issued, result.Outcome);
    AssertIssuedBy(authority);
  }

  /// <summary>Verifies nothing is written when there is neither a certificate nor a usable CA.</summary>
  [TestMethod]
  public void Renew_CertificateMissingWithoutAuthority_ReturnsMissing()
  {
    CertificateRenewalResult result = WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true);

    Assert.AreEqual(CertificateRenewalOutcome.Missing, result.Outcome);
    Assert.HasCount(0, Directory.GetFiles(certificates));
  }

  /// <summary>Verifies a fresh clone, where the git-ignored certificates directory does not exist yet, still gets a certificate.</summary>
  [TestMethod]
  public void Renew_CertificatesDirectoryMissingWithTrustedAuthority_IssuesCertificate()
  {
    using X509Certificate2 authority = WriteAuthority();
    Directory.Delete(certificates);

    CertificateRenewalResult result = WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true);

    Assert.AreEqual(CertificateRenewalOutcome.Issued, result.Outcome);
    AssertIssuedBy(authority);
  }

  /// <summary>Verifies a CA created moments ago, right after setup, can issue: the certificate never starts before its CA.</summary>
  [TestMethod]
  public void Renew_AuthorityCreatedMomentsAgo_IssuesCertificateStartingNoEarlierThanAuthority()
  {
    using X509Certificate2 authority = WriteAuthority(notBefore: Now.AddMinutes(-1));

    CertificateRenewalResult result = WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true);

    Assert.AreEqual(CertificateRenewalOutcome.Issued, result.Outcome);
    AssertIssuedBy(authority);
    using X509Certificate2 issued = ReadCertificate();
    Assert.IsTrue(issued.NotBefore.ToUniversalTime() >= authority.NotBefore.ToUniversalTime());
  }

  /// <summary>Verifies an issued certificate stays within the 825-day limit Apple platforms enforce even for custom roots.</summary>
  [TestMethod]
  public void Renew_TrustedAuthority_IssuesCertificateValidForAtMost825Days()
  {
    using X509Certificate2 authority = WriteAuthority();

    WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true);

    using X509Certificate2 issued = ReadCertificate();
    TimeSpan validity = issued.NotAfter.ToUniversalTime() - issued.NotBefore.ToUniversalTime();
    Assert.IsTrue(validity <= TimeSpan.FromDays(825), $"The certificate is valid for {validity}.");
    Assert.IsTrue(validity > TimeSpan.FromDays(800), $"The certificate is valid for {validity}.");
  }

  /// <summary>Verifies an issued certificate never outlives the CA that issued it.</summary>
  [TestMethod]
  public void Renew_AuthorityExpiringBeforeFullLifetime_CapsCertificateAtAuthorityExpiry()
  {
    using X509Certificate2 authority = WriteAuthority(notAfter: Now.AddDays(100));

    CertificateRenewalResult result = WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true);

    Assert.AreEqual(CertificateRenewalOutcome.Issued, result.Outcome);
    using X509Certificate2 issued = ReadCertificate();
    Assert.AreEqual(authority.NotAfter.ToUniversalTime(), issued.NotAfter.ToUniversalTime());
  }

  /// <summary>Verifies renewal from a CA that itself expires within the renewal window fails clearly and changes nothing.</summary>
  [TestMethod]
  public void Renew_CertificateExpiringWithAuthorityExpiringWithinWindow_ThrowsAndKeepsFiles()
  {
    using X509Certificate2 authority = WriteAuthority(notAfter: Now.AddDays(10));
    WriteLeaf(authority, Now.AddDays(3));
    (byte[] Certificate, byte[] Key) before = ReadFiles();

    Assert.ThrowsExactly<InvalidOperationException>(() =>
      WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true));

    AssertUnchanged(before);
  }

  /// <summary>Verifies a CA key that does not belong to the CA certificate fails clearly and changes nothing.</summary>
  [TestMethod]
  public void Renew_CertificateExpiringWithMismatchedAuthorityKey_ThrowsAndKeepsFiles()
  {
    using X509Certificate2 authority = WriteAuthority();
    WriteLeaf(authority, Now.AddDays(3));
    using RSA otherKey = RSA.Create(2048);
    File.WriteAllText(Path.Combine(authorityDirectory, WebsiteCertificateRenewal.AuthorityKeyFileName),
      otherKey.ExportPkcs8PrivateKeyPem());
    (byte[] Certificate, byte[] Key) before = ReadFiles();

    Assert.ThrowsExactly<InvalidOperationException>(() =>
      WebsiteCertificateRenewal.Renew(certificates, authorityDirectory, Now, _ => true));

    AssertUnchanged(before);
  }

  /// <summary>Verifies a CA that is not in the machine's trust store is reported as untrusted.</summary>
  [TestMethod]
  public void IsAuthorityTrusted_FreshSelfSignedAuthority_ReturnsFalse()
  {
    using X509Certificate2 authority = CreateAuthority("CN=Untrusted Development CA");

    Assert.IsFalse(WebsiteCertificateRenewal.IsAuthorityTrusted(authority));
  }

  /// <summary>Verifies renewal runs only when the resource starts, never during composition.</summary>
  [TestMethod]
  public async Task WithDevelopmentCertificateRenewal_RenewsOnlyWhenResourceStarts()
  {
    using X509Certificate2 authority = WriteAuthority();
    DateTimeOffset previous = WriteLeaf(authority, Now.AddDays(3));
    var builder = DistributedApplication.CreateBuilder(new DistributedApplicationOptions
    {
      ProjectDirectory = root,
      DisableDashboard = true,
      Args = [],
    });
    var probe = builder.AddExecutable("probe", "cmd", root)
      .WithDevelopmentCertificateRenewal(certificates, authorityDirectory, new FixedTimeProvider(Now), _ => true);

    Assert.AreEqual(previous, ReadExpiry());

    using ServiceProvider services = builder.Services.BuildServiceProvider();
    await builder.Eventing.PublishAsync(new BeforeResourceStartedEvent(probe.Resource, services));

    Assert.IsTrue(ReadExpiry() > Now + WebsiteCertificateRenewal.RenewalWindow);
  }

  private X509Certificate2 WriteAuthority(DateTimeOffset? notBefore = null, DateTimeOffset? notAfter = null)
  {
    X509Certificate2 authority = CreateAuthority("CN=Test mkcert development CA", notBefore, notAfter);
    File.WriteAllText(Path.Combine(authorityDirectory, WebsiteCertificateRenewal.AuthorityCertificateFileName),
      authority.ExportCertificatePem());
    using RSA key = authority.GetRSAPrivateKey()
      ?? throw new InvalidOperationException("The test CA requires an RSA private key.");
    File.WriteAllText(Path.Combine(authorityDirectory, WebsiteCertificateRenewal.AuthorityKeyFileName),
      key.ExportPkcs8PrivateKeyPem());
    return authority;
  }

  private static X509Certificate2 CreateAuthority(
    string subject, DateTimeOffset? notBefore = null, DateTimeOffset? notAfter = null)
  {
    using RSA key = RSA.Create(2048);
    var request = new CertificateRequest(subject, key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
    request.CertificateExtensions.Add(new X509BasicConstraintsExtension(true, false, 0, true));
    request.CertificateExtensions.Add(
      new X509KeyUsageExtension(X509KeyUsageFlags.KeyCertSign | X509KeyUsageFlags.CrlSign, true));
    return request.CreateSelfSigned(notBefore ?? Now.AddYears(-1), notAfter ?? Now.AddYears(10));
  }

  private DateTimeOffset WriteLeaf(X509Certificate2 authority, DateTimeOffset notAfter)
  {
    using RSA key = RSA.Create(2048);
    var request = new CertificateRequest("CN=localhost", key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
    using X509Certificate2 leaf = request.Create(authority, Now.AddDays(-30), notAfter, [1, 2, 3, 4]);
    File.WriteAllText(CertificatePath, leaf.ExportCertificatePem());
    File.WriteAllText(KeyPath, key.ExportPkcs8PrivateKeyPem());
    return new DateTimeOffset(leaf.NotAfter);
  }

  private (byte[] Certificate, byte[] Key) ReadFiles() => (File.ReadAllBytes(CertificatePath), File.ReadAllBytes(KeyPath));

  private void AssertUnchanged((byte[] Certificate, byte[] Key) before)
  {
    CollectionAssert.AreEqual(before.Certificate, File.ReadAllBytes(CertificatePath));
    CollectionAssert.AreEqual(before.Key, File.ReadAllBytes(KeyPath));
    Assert.HasCount(2, Directory.GetFiles(certificates));
  }

  private X509Certificate2 ReadCertificate() => X509Certificate2.CreateFromPem(File.ReadAllText(CertificatePath));

  private DateTimeOffset ReadExpiry()
  {
    using X509Certificate2 certificate = X509Certificate2.CreateFromPem(File.ReadAllText(CertificatePath));
    return new DateTimeOffset(certificate.NotAfter);
  }

  private void AssertIssuedBy(X509Certificate2 authority)
  {
    using X509Certificate2 renewed = X509Certificate2.CreateFromPemFile(CertificatePath, KeyPath);
    Assert.IsTrue(renewed.HasPrivateKey);
    Assert.AreEqual(authority.Subject, renewed.Issuer);
    Assert.IsTrue(new DateTimeOffset(renewed.NotAfter) > Now + WebsiteCertificateRenewal.RenewalWindow);
    CollectionAssert.Contains(
      renewed.Extensions.OfType<X509SubjectAlternativeNameExtension>().Single().EnumerateDnsNames().ToList(), "localhost");
    using var chain = new X509Chain();
    chain.ChainPolicy.TrustMode = X509ChainTrustMode.CustomRootTrust;
    chain.ChainPolicy.CustomTrustStore.Add(authority);
    chain.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
    chain.ChainPolicy.VerificationTime = Now.UtcDateTime;
    Assert.IsTrue(chain.Build(renewed));
    Assert.HasCount(2, Directory.GetFiles(certificates));
  }

  private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
  {
    public override DateTimeOffset GetUtcNow() => now;
  }
}
