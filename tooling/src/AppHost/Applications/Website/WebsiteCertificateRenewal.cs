namespace AppHost.Applications.Website;

using System.Globalization;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

/// <summary>What a renewal check did with the website's development certificate.</summary>
internal enum CertificateRenewalOutcome
{
  /// <summary>No certificate exists yet; Next.js creates one when the website starts.</summary>
  Missing,

  /// <summary>The certificate is valid beyond the renewal window and was kept.</summary>
  Valid,

  /// <summary>The certificate was removed so Next.js re-issues it from the already-trusted local CA.</summary>
  Renewed,
}

/// <summary>The outcome of a renewal check.</summary>
/// <param name="Outcome">What the check did.</param>
/// <param name="ExpiresAt">The checked certificate's expiry, when a certificate existed.</param>
internal sealed record CertificateRenewalResult(CertificateRenewalOutcome Outcome, DateTimeOffset? ExpiresAt);

/// <summary>
/// Renews the website's local HTTPS certificate before it expires without ever changing the trust store.
/// </summary>
/// <remarks>
/// <c>next dev --experimental-https</c> issues <c>certificates/localhost.pem</c> from the local mkcert CA only when the
/// files are missing and never checks their expiry. Removing an expiring pair lets Next.js re-issue it from the same,
/// already-trusted CA.
/// </remarks>
internal static class WebsiteCertificateRenewal
{
  /// <summary>The certificate file Next.js serves.</summary>
  internal const string CertificateFileName = "localhost.pem";

  /// <summary>The private-key file paired with the certificate.</summary>
  internal const string KeyFileName = "localhost-key.pem";

  /// <summary>How long before expiry the certificate is renewed.</summary>
  internal static readonly TimeSpan RenewalWindow = TimeSpan.FromDays(14);

  private static readonly Action<ILogger, DateTimeOffset, Exception?> CertificateRenewed =
    LoggerMessage.Define<DateTimeOffset>(LogLevel.Information, new EventId(0),
      "Renewing the development certificate that expires {ExpiresAt:O}; Next.js re-issues it from the trusted local CA.");

  /// <summary>Removes the certificate pair when it is within the renewal window and its CA is already trusted.</summary>
  /// <param name="certificatesDirectory">The website's <c>certificates</c> directory.</param>
  /// <param name="now">The current time.</param>
  /// <param name="isIssuerTrusted">Reports whether the certificate chains to a CA the machine already trusts.</param>
  /// <returns>What the check did.</returns>
  /// <exception cref="InvalidOperationException">The certificate is unreadable, or its CA is not trusted.</exception>
  internal static CertificateRenewalResult Renew(
    string certificatesDirectory, DateTimeOffset now, Func<X509Certificate2, bool> isIssuerTrusted)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(certificatesDirectory);
    ArgumentNullException.ThrowIfNull(isIssuerTrusted);
    string certificatePath = Path.Combine(certificatesDirectory, CertificateFileName);
    if (!File.Exists(certificatePath))
    {
      return new(CertificateRenewalOutcome.Missing, null);
    }

    using X509Certificate2 certificate = Load(certificatePath);
    var expiresAt = new DateTimeOffset(certificate.NotAfter);
    if (expiresAt > now + RenewalWindow)
    {
      return new(CertificateRenewalOutcome.Valid, expiresAt);
    }

    if (!isIssuerTrusted(certificate))
    {
      throw new InvalidOperationException(string.Create(CultureInfo.InvariantCulture,
        $"The website development certificate '{certificatePath}' expires {expiresAt:O}, but its issuing CA is not " +
        $"trusted. Renewal only re-issues from an already-trusted local CA and never changes the trust store; trust " +
        $"the local mkcert CA or replace the certificate manually."));
    }

    File.Delete(certificatePath);
    File.Delete(Path.Combine(certificatesDirectory, KeyFileName));
    return new(CertificateRenewalOutcome.Renewed, expiresAt);
  }

  /// <summary>Reports whether the certificate chains to a CA the machine already trusts, ignoring its validity dates.</summary>
  /// <param name="certificate">The certificate to check.</param>
  /// <returns><see langword="true"/> when the chain builds to a trusted root.</returns>
  internal static bool IsIssuerTrusted(X509Certificate2 certificate)
  {
    ArgumentNullException.ThrowIfNull(certificate);
    using var chain = new X509Chain();
    chain.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
    chain.ChainPolicy.VerificationFlags = X509VerificationFlags.IgnoreNotTimeValid;
    return chain.Build(certificate);
  }

  /// <summary>Renews the website's development certificate each time the resource starts.</summary>
  /// <typeparam name="T">The website resource type.</typeparam>
  /// <param name="website">The website resource builder.</param>
  /// <param name="certificatesDirectory">The website's <c>certificates</c> directory.</param>
  /// <param name="timeProvider">Supplies the current time.</param>
  /// <param name="isIssuerTrusted">Reports whether a certificate chains to an already-trusted CA.</param>
  /// <returns>The website resource builder.</returns>
  internal static IResourceBuilder<T> WithDevelopmentCertificateRenewal<T>(
    this IResourceBuilder<T> website, string certificatesDirectory, TimeProvider timeProvider,
    Func<X509Certificate2, bool> isIssuerTrusted)
    where T : IResource
  {
    ArgumentNullException.ThrowIfNull(website);
    ArgumentNullException.ThrowIfNull(timeProvider);
    return website.OnBeforeResourceStarted((resource, startedEvent, _) =>
    {
      CertificateRenewalResult result = Renew(certificatesDirectory, timeProvider.GetUtcNow(), isIssuerTrusted);
      if (result is { Outcome: CertificateRenewalOutcome.Renewed, ExpiresAt: DateTimeOffset expiresAt })
      {
        CertificateRenewed(
          startedEvent.Services.GetRequiredService<ResourceLoggerService>().GetLogger(resource), expiresAt, null);
      }

      return Task.CompletedTask;
    });
  }

  private static X509Certificate2 Load(string certificatePath)
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
}
