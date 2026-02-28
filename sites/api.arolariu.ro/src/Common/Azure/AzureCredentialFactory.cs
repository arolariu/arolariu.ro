namespace arolariu.Backend.Common.Azure;

using System;
using global::Azure.Core;
using global::Azure.Identity;

/// <summary>
/// Centralized singleton factory for creating Azure credentials.
/// Ensures consistent credential configuration across all Azure service clients.
/// </summary>
/// <remarks>
/// <para><see cref="DefaultAzureCredential"/> handles token lifecycle internally —
/// it caches tokens and requests fresh ones ~5 minutes before expiry.
/// A singleton is safe and recommended to avoid redundant token acquisitions.</para>
/// <para>In RELEASE builds, uses AZURE_CLIENT_ID for User Assigned Managed Identity.
/// In DEBUG builds, falls back to Azure CLI, Visual Studio, etc.</para>
/// </remarks>
public static class AzureCredentialFactory
{
    private static readonly Lazy<TokenCredential> CachedCredential = new(CreateCredentialInternal);

    /// <summary>
    /// Returns the shared <see cref="TokenCredential"/> instance.
    /// Thread-safe, lazy-initialized, and never expires (Azure SDK refreshes tokens internally).
    /// </summary>
    public static TokenCredential CreateCredential() => CachedCredential.Value;

    private static DefaultAzureCredential CreateCredentialInternal()
    {
        return new DefaultAzureCredential(
#if !DEBUG
            new DefaultAzureCredentialOptions
            {
                ManagedIdentityClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")
            }
#endif
        );
    }
}
