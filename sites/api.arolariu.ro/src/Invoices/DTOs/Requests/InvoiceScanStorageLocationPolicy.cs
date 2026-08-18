namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;

using arolariu.Backend.Common.Options;

/// <summary>
/// Validates that a client-supplied invoice scan URI remains within the configured Blob service root's invoices
/// container.
/// </summary>
/// <remarks>
/// This policy performs only deterministic URI comparison. It never resolves DNS, follows redirects, or fetches
/// remote content. The configured <see cref="ApplicationOptions.StorageAccountEndpoint"/> remains an Azure Blob
/// service root, for example <c>https://account.blob.core.windows.net</c>. Invoice scans are constrained to the
/// backend-owned <c>invoices</c> container beneath that root using the exact shape
/// <c>&lt;service-root&gt;/invoices/&lt;nonempty-blob-path&gt;</c>. Local HTTP is permitted only for an explicitly
/// configured loopback Azurite service root.
/// </remarks>
internal static class InvoiceScanStorageLocationPolicy
{
  private const string InvoiceScanContainerName = "invoices";
  private const string InvalidLocationMessage =
    "Scan location must be in the configured invoices storage container.";
  private const string InvalidStorageConfigurationMessage =
    "Scan upload storage is not configured for URI validation.";

  /// <summary>
  /// Validates a scan location against the configured storage service root and invoices container.
  /// </summary>
  /// <param name="location">The client-supplied scan location.</param>
  /// <param name="storageOptions">The configured Azure storage options.</param>
  /// <param name="validationMessage">A safe validation message that never includes the supplied URI.</param>
  /// <returns><see langword="true"/> when the location is within the configured invoices container; otherwise, <see langword="false"/>.</returns>
  internal static bool TryValidate(
    Uri? location,
    ApplicationOptions storageOptions,
    out string validationMessage)
  {
    ArgumentNullException.ThrowIfNull(storageOptions);

    if (!TryGetConfiguredServiceRoot(storageOptions, out Uri? configuredServiceRoot, out bool isAzurite))
    {
      validationMessage = InvalidStorageConfigurationMessage;
      return false;
    }

    Uri configuredServiceRootUri = configuredServiceRoot!;

    if (location is null
        || !location.IsAbsoluteUri
        || !string.IsNullOrEmpty(location.UserInfo)
        || !string.IsNullOrEmpty(location.Fragment)
        || !string.Equals(location.Scheme, configuredServiceRootUri.Scheme, StringComparison.OrdinalIgnoreCase)
        || !string.Equals(location.Host, configuredServiceRootUri.Host, StringComparison.OrdinalIgnoreCase)
        || location.Port != configuredServiceRootUri.Port
        || !IsWithinInvoiceContainer(
          location.AbsolutePath,
          storageOptions.StorageAccountName,
          isAzurite))
    {
      validationMessage = InvalidLocationMessage;
      return false;
    }

    validationMessage = string.Empty;
    return true;
  }

  private static bool TryGetConfiguredServiceRoot(
    ApplicationOptions storageOptions,
    out Uri? configuredServiceRoot,
    out bool isAzurite)
  {
    configuredServiceRoot = null;
    isAzurite = false;

    if (string.IsNullOrWhiteSpace(storageOptions.StorageAccountName)
        || !Uri.TryCreate(storageOptions.StorageAccountEndpoint, UriKind.Absolute, out Uri? endpoint)
        || !string.IsNullOrEmpty(endpoint.UserInfo)
        || !string.IsNullOrEmpty(endpoint.Query)
        || !string.IsNullOrEmpty(endpoint.Fragment))
    {
      return false;
    }

    if (string.Equals(endpoint.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
        && IsProductionServiceRoot(endpoint, storageOptions.StorageAccountName))
    {
      configuredServiceRoot = endpoint;
      return true;
    }

    if (string.Equals(endpoint.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
        && IsLoopbackHost(endpoint.Host)
        && IsAzuriteServiceRoot(endpoint, storageOptions.StorageAccountName))
    {
      configuredServiceRoot = endpoint;
      isAzurite = true;
      return true;
    }

    return false;
  }

  private static bool IsProductionServiceRoot(Uri endpoint, string storageAccountName) =>
    string.Equals(endpoint.AbsolutePath, "/", StringComparison.Ordinal)
    && endpoint.Host.StartsWith($"{storageAccountName}.", StringComparison.OrdinalIgnoreCase);

  private static bool IsLoopbackHost(string host)
  {
    string normalizedHost = host.Trim('[', ']');

    return string.Equals(normalizedHost, "localhost", StringComparison.OrdinalIgnoreCase)
      || string.Equals(normalizedHost, "127.0.0.1", StringComparison.Ordinal)
      || string.Equals(normalizedHost, "::1", StringComparison.Ordinal);
  }

  private static bool IsAzuriteServiceRoot(Uri endpoint, string storageAccountName)
  {
    string expectedAccountPath = $"/{storageAccountName}";

    return string.Equals(endpoint.AbsolutePath, expectedAccountPath, StringComparison.Ordinal)
      || string.Equals(endpoint.AbsolutePath, $"{expectedAccountPath}/", StringComparison.Ordinal);
  }

  private static bool IsWithinInvoiceContainer(
    string absolutePath,
    string storageAccountName,
    bool isAzurite)
  {
    string containerPrefix = isAzurite
      ? $"/{storageAccountName}/{InvoiceScanContainerName}/"
      : $"/{InvoiceScanContainerName}/";

    if (!absolutePath.StartsWith(containerPrefix, StringComparison.Ordinal))
    {
      return false;
    }

    string blobPath = absolutePath[containerPrefix.Length..];
    return IsValidBlobPath(blobPath);
  }

  private static bool IsValidBlobPath(string blobPath)
  {
    if (string.IsNullOrEmpty(blobPath)
        || blobPath.Contains('\\', StringComparison.Ordinal))
    {
      return false;
    }

    string[] segments = blobPath.Split('/', StringSplitOptions.None);

    foreach (string segment in segments)
    {
      if (string.IsNullOrEmpty(segment)
          || ContainsEncodedSeparator(segment))
      {
        return false;
      }

      string decodedSegment;

      try
      {
        decodedSegment = Uri.UnescapeDataString(segment);
      }
      catch (UriFormatException)
      {
        return false;
      }

      if (string.IsNullOrEmpty(decodedSegment)
          || string.Equals(decodedSegment, ".", StringComparison.Ordinal)
          || string.Equals(decodedSegment, "..", StringComparison.Ordinal)
          || decodedSegment.Contains('/', StringComparison.Ordinal)
          || decodedSegment.Contains('\\', StringComparison.Ordinal))
      {
        return false;
      }
    }

    return true;
  }

  private static bool ContainsEncodedSeparator(string segment) =>
    segment.Contains("%2f", StringComparison.OrdinalIgnoreCase)
    || segment.Contains("%5c", StringComparison.OrdinalIgnoreCase);
}
