namespace AppHost.Applications.Website;

using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

/// <summary>What a renewal check did with the website's development certificate.</summary>
internal enum CertificateRenewalOutcome
{
  /// <summary>No certificate and no usable trusted CA exist; Next.js keeps its own first-run flow.</summary>
  Missing,

  /// <summary>The certificate is valid beyond the renewal window and was kept unchanged.</summary>
  Valid,

  /// <summary>An expiring certificate was replaced by one issued from the same trusted CA.</summary>
  Renewed,

  /// <summary>A missing certificate was issued from the trusted CA.</summary>
  Issued,
}

/// <summary>The outcome of a renewal check.</summary>
/// <param name="Outcome">What the check did.</param>
/// <param name="PreviousExpiry">The existing certificate's expiry, when a certificate existed.</param>
/// <param name="NewExpiry">The issued certificate's expiry, when one was issued.</param>
internal sealed record CertificateRenewalResult(
  CertificateRenewalOutcome Outcome, DateTimeOffset? PreviousExpiry, DateTimeOffset? NewExpiry);

/// <summary>
/// Keeps the website's local HTTPS certificate valid by issuing it from the already-trusted local mkcert CA.
/// </summary>
/// <remarks>
/// <c>next dev --experimental-https</c> never checks the certificate's expiry, and its own issuance runs
/// <c>mkcert -install</c>, which also targets other trust stores (for example Java's) and can fail without admin rights.
/// Issuing directly from the existing CA never touches any trust store, and the new pair is written before the old one
/// is replaced, so the website is never left without a certificate.
/// </remarks>
internal static class WebsiteCertificateRenewal
{
  /// <summary>The certificate file Next.js serves.</summary>
  internal const string CertificateFileName = "localhost.pem";

  /// <summary>The private-key file paired with the certificate.</summary>
  internal const string KeyFileName = "localhost-key.pem";

  /// <summary>The mkcert CA certificate file inside the CA directory.</summary>
  internal const string AuthorityCertificateFileName = "rootCA.pem";

  /// <summary>The mkcert CA private-key file inside the CA directory.</summary>
  internal const string AuthorityKeyFileName = "rootCA-key.pem";

  /// <summary>How long before expiry the certificate is renewed.</summary>
  internal static readonly TimeSpan RenewalWindow = TimeSpan.FromDays(14);

  /// <summary>The lifetime of an issued certificate, matching mkcert's 2 years and 3 months.</summary>
  internal static readonly TimeSpan CertificateLifetime = TimeSpan.FromDays(825);

  private const string PendingSuffix = ".renewing";

  private static readonly Action<ILogger, DateTimeOffset, DateTimeOffset, Exception?> CertificateRenewed =
    LoggerMessage.Define<DateTimeOffset, DateTimeOffset>(LogLevel.Information, new EventId(0),
      "Renewed the development certificate that expires {PreviousExpiry:O} from the local mkcert CA; it is valid until {NewExpiry:O}.");

  private static readonly Action<ILogger, DateTimeOffset, Exception?> CertificateIssued =
    LoggerMessage.Define<DateTimeOffset>(LogLevel.Information, new EventId(0),
      "Issued the development certificate from the local mkcert CA; it is valid until {NewExpiry:O}.");

  /// <summary>Renews or issues the certificate from the trusted local CA when it is missing or near expiry.</summary>
  /// <param name="certificatesDirectory">The website's <c>certificates</c> directory.</param>
  /// <param name="authorityDirectory">The mkcert CA directory (<c>CAROOT</c>).</param>
  /// <param name="now">The current time.</param>
  /// <param name="isAuthorityTrusted">Reports whether the CA is already trusted by the machine.</param>
  /// <returns>What the check did.</returns>
  /// <exception cref="InvalidOperationException">A certificate needs renewal but cannot be renewed safely; nothing changed.</exception>
  internal static CertificateRenewalResult Renew(
    string certificatesDirectory, string authorityDirectory, DateTimeOffset now, Func<X509Certificate2, bool> isAuthorityTrusted)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(certificatesDirectory);
    ArgumentException.ThrowIfNullOrWhiteSpace(authorityDirectory);
    ArgumentNullException.ThrowIfNull(isAuthorityTrusted);
    string certificatePath = Path.Combine(certificatesDirectory, CertificateFileName);

    using X509Certificate2? current = File.Exists(certificatePath) ? LoadCertificate(certificatePath) : null;
    DateTimeOffset? previousExpiry = current is null ? null : new DateTimeOffset(current.NotAfter);
    if (previousExpiry > now + RenewalWindow)
    {
      return new(CertificateRenewalOutcome.Valid, previousExpiry, null);
    }

    using X509Certificate2? authority = LoadAuthority(authorityDirectory);
    if (authority is null || !isAuthorityTrusted(authority))
    {
      return current is null
        ? new(CertificateRenewalOutcome.Missing, null, null)
        : throw Unrenewable(certificatePath, previousExpiry,
          $"no trusted mkcert CA with its key was found in '{authorityDirectory}'");
    }

    if (current is not null && !string.Equals(current.Issuer, authority.Subject, StringComparison.Ordinal))
    {
      throw Unrenewable(certificatePath, previousExpiry, $"it was issued by '{current.Issuer}', not the local mkcert CA");
    }

    if (new DateTimeOffset(authority.NotAfter) <= now + RenewalWindow)
    {
      throw Unrenewable(certificatePath, previousExpiry, "the local mkcert CA itself expires within the renewal window");
    }

    DateTimeOffset newExpiry = Issue(authority, certificatesDirectory, now);
    return new(current is null ? CertificateRenewalOutcome.Issued : CertificateRenewalOutcome.Renewed, previousExpiry, newExpiry);
  }

  /// <summary>Resolves mkcert's CA directory: <c>CAROOT</c> when set, otherwise mkcert's per-platform default.</summary>
  /// <returns>The CA directory path.</returns>
  internal static string ResolveAuthorityDirectory()
  {
    string? configured = Environment.GetEnvironmentVariable("CAROOT");
    if (!string.IsNullOrWhiteSpace(configured))
    {
      return configured;
    }

    if (OperatingSystem.IsWindows())
    {
      return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "mkcert");
    }

    string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
    if (OperatingSystem.IsMacOS())
    {
      return Path.Combine(home, "Library", "Application Support", "mkcert");
    }

    string? dataHome = Environment.GetEnvironmentVariable("XDG_DATA_HOME");
    return Path.Combine(string.IsNullOrWhiteSpace(dataHome) ? Path.Combine(home, ".local", "share") : dataHome, "mkcert");
  }

  /// <summary>Reports whether the CA already chains to a trusted root on this machine, ignoring validity dates.</summary>
  /// <param name="authority">The CA certificate to check.</param>
  /// <returns><see langword="true"/> when the machine already trusts the CA.</returns>
  internal static bool IsAuthorityTrusted(X509Certificate2 authority)
  {
    ArgumentNullException.ThrowIfNull(authority);
    using var chain = new X509Chain();
    chain.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
    chain.ChainPolicy.VerificationFlags = X509VerificationFlags.IgnoreNotTimeValid;
    return chain.Build(authority);
  }

  /// <summary>Renews or issues the website's development certificate each time the resource starts.</summary>
  /// <typeparam name="T">The website resource type.</typeparam>
  /// <param name="website">The website resource builder.</param>
  /// <param name="certificatesDirectory">The website's <c>certificates</c> directory.</param>
  /// <param name="authorityDirectory">The mkcert CA directory (<c>CAROOT</c>).</param>
  /// <param name="timeProvider">Supplies the current time.</param>
  /// <param name="isAuthorityTrusted">Reports whether the CA is already trusted by the machine.</param>
  /// <returns>The website resource builder.</returns>
  internal static IResourceBuilder<T> WithDevelopmentCertificateRenewal<T>(
    this IResourceBuilder<T> website, string certificatesDirectory, string authorityDirectory, TimeProvider timeProvider,
    Func<X509Certificate2, bool> isAuthorityTrusted)
    where T : IResource
  {
    ArgumentNullException.ThrowIfNull(website);
    ArgumentNullException.ThrowIfNull(timeProvider);
    return website.OnBeforeResourceStarted((resource, startedEvent, _) =>
    {
      CertificateRenewalResult result =
        Renew(certificatesDirectory, authorityDirectory, timeProvider.GetUtcNow(), isAuthorityTrusted);
      ILogger logger = startedEvent.Services.GetRequiredService<ResourceLoggerService>().GetLogger(resource);
      if (result is { Outcome: CertificateRenewalOutcome.Renewed, PreviousExpiry: DateTimeOffset previous, NewExpiry: DateTimeOffset renewed })
      {
        CertificateRenewed(logger, previous, renewed, null);
      }
      else if (result is { Outcome: CertificateRenewalOutcome.Issued, NewExpiry: DateTimeOffset issued })
      {
        CertificateIssued(logger, issued, null);
      }

      return Task.CompletedTask;
    });
  }

  private static DateTimeOffset Issue(X509Certificate2 authority, string certificatesDirectory, DateTimeOffset now)
  {
    using RSA key = RSA.Create(2048);
    var request = new CertificateRequest("CN=localhost", key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
    var names = new SubjectAlternativeNameBuilder();
    names.AddDnsName("localhost");
    names.AddIpAddress(IPAddress.Loopback);
    names.AddIpAddress(IPAddress.IPv6Loopback);
    request.CertificateExtensions.Add(names.Build());
    request.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, true));
    request.CertificateExtensions.Add(
      new X509KeyUsageExtension(X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment, true));
    request.CertificateExtensions.Add(
      new X509EnhancedKeyUsageExtension([new Oid("1.3.6.1.5.5.7.3.1", "Server Authentication")], false));

    DateTimeOffset authorityExpiry = new(authority.NotAfter);
    DateTimeOffset notAfter = now + CertificateLifetime < authorityExpiry ? now + CertificateLifetime : authorityExpiry;
    byte[] serialNumber = RandomNumberGenerator.GetBytes(16);
    serialNumber[0] &= 0x7F;
    using X509Certificate2 certificate = request.Create(authority, now.AddMinutes(-5), notAfter, serialNumber);

    // Write the complete new pair first, then replace the old files, so the website never loses its certificate.
    string keyPath = Path.Combine(certificatesDirectory, KeyFileName);
    string certificatePath = Path.Combine(certificatesDirectory, CertificateFileName);
    File.WriteAllText(keyPath + PendingSuffix, key.ExportPkcs8PrivateKeyPem());
    File.WriteAllText(certificatePath + PendingSuffix, certificate.ExportCertificatePem());
    File.Move(keyPath + PendingSuffix, keyPath, overwrite: true);
    File.Move(certificatePath + PendingSuffix, certificatePath, overwrite: true);
    return new DateTimeOffset(certificate.NotAfter);
  }

  private static X509Certificate2 LoadCertificate(string certificatePath)
  {
    try
    {
      return X509Certificate2.CreateFromPem(File.ReadAllText(certificatePath));
    }
    catch (Exception exception) when (exception is CryptographicException or IOException or UnauthorizedAccessException)
    {
      throw new InvalidOperationException(
        $"The website development certificate '{certificatePath}' could not be read; nothing was changed.", exception);
    }
  }

  private static X509Certificate2? LoadAuthority(string authorityDirectory)
  {
    string certificatePath = Path.Combine(authorityDirectory, AuthorityCertificateFileName);
    string keyPath = Path.Combine(authorityDirectory, AuthorityKeyFileName);
    if (!File.Exists(certificatePath) || !File.Exists(keyPath))
    {
      return null;
    }

    try
    {
      return X509Certificate2.CreateFromPemFile(certificatePath, keyPath);
    }
    catch (Exception exception) when (exception is CryptographicException or IOException or UnauthorizedAccessException)
    {
      throw new InvalidOperationException(
        $"The local mkcert CA in '{authorityDirectory}' could not be read; nothing was changed.", exception);
    }
  }

  private static InvalidOperationException Unrenewable(string certificatePath, DateTimeOffset? expiry, string reason) =>
    new(string.Create(CultureInfo.InvariantCulture,
      $"The website development certificate '{certificatePath}' (expiry {expiry:O}) needs renewal, but {reason}. " +
      $"Nothing was changed and no trust store was touched; fix the CA or replace the certificate manually."));
}
