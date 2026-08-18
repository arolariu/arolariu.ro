namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;

using arolariu.Backend.Common.Options;

/// <summary>
/// Validates that a client-supplied invoice scan URI remains within the configured HTTPS upload container.
/// </summary>
/// <remarks>
/// This policy performs only deterministic URI comparison. It never resolves DNS, follows redirects, or fetches
/// remote content. The configured <see cref="ApplicationOptions.StorageAccountEndpoint"/> must be an HTTPS URI
/// containing exactly one blob-container path segment, for example
/// <c>https://account.blob.core.windows.net/invoice-scans</c>.
/// </remarks>
internal static class InvoiceScanStorageLocationPolicy
{
  private const string InvalidLocationMessage =
    "Scan location must be an HTTPS URI in the configured upload storage container.";
  private const string InvalidStorageConfigurationMessage =
    "Scan upload storage is not configured for URI validation.";

  /// <summary>
  /// Validates a scan location against the configured storage account origin and container path.
  /// </summary>
  /// <param name="location">The client-supplied scan location.</param>
  /// <param name="storageOptions">The configured Azure storage options.</param>
  /// <param name="validationMessage">A safe validation message that never includes the supplied URI.</param>
  /// <returns><see langword="true"/> when the location is within the configured upload container; otherwise, <see langword="false"/>.</returns>
  internal static bool TryValidate(
    Uri? location,
    ApplicationOptions storageOptions,
    out string validationMessage)
  {
    ArgumentNullException.ThrowIfNull(storageOptions);

    if (!TryGetConfiguredContainer(storageOptions, out Uri? configuredContainer, out string containerPath))
    {
      validationMessage = InvalidStorageConfigurationMessage;
      return false;
    }

    Uri configuredContainerUri = configuredContainer!;

    if (location is null
        || !location.IsAbsoluteUri
        || !string.Equals(location.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
        || !string.IsNullOrEmpty(location.UserInfo)
        || !string.IsNullOrEmpty(location.Fragment)
        || !string.Equals(location.Host, configuredContainerUri.Host, StringComparison.OrdinalIgnoreCase)
        || location.Port != configuredContainerUri.Port
        || !IsWithinContainer(location.AbsolutePath, containerPath))
    {
      validationMessage = InvalidLocationMessage;
      return false;
    }

    validationMessage = string.Empty;
    return true;
  }

  private static bool TryGetConfiguredContainer(
    ApplicationOptions storageOptions,
    out Uri? configuredContainer,
    out string containerPath)
  {
    configuredContainer = null;
    containerPath = string.Empty;

    if (string.IsNullOrWhiteSpace(storageOptions.StorageAccountName)
        || !Uri.TryCreate(storageOptions.StorageAccountEndpoint, UriKind.Absolute, out Uri? endpoint)
        || !string.Equals(endpoint.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
        || !string.IsNullOrEmpty(endpoint.UserInfo)
        || !string.IsNullOrEmpty(endpoint.Query)
        || !string.IsNullOrEmpty(endpoint.Fragment)
        || !TryGetContainerPath(endpoint.AbsolutePath, out containerPath))
    {
      return false;
    }

    configuredContainer = endpoint;
    return true;
  }

  private static bool TryGetContainerPath(string absolutePath, out string containerPath)
  {
    containerPath = string.Empty;

    if (absolutePath.Contains('%', StringComparison.Ordinal))
    {
      return false;
    }

    string[] segments = absolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);

    if (segments.Length != 1
        || string.Equals(segments[0], ".", StringComparison.Ordinal)
        || string.Equals(segments[0], "..", StringComparison.Ordinal))
    {
      return false;
    }

    containerPath = $"/{segments[0]}";
    return true;
  }

  private static bool IsWithinContainer(string absolutePath, string containerPath) =>
    absolutePath.StartsWith($"{containerPath}/", StringComparison.Ordinal);
}
