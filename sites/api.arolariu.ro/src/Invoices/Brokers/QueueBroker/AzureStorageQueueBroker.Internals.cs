namespace arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;

using System;

using arolariu.Backend.Common.Azure;
using arolariu.Backend.Common.Options;

using Azure.Storage.Queues;

public sealed partial class AzureStorageQueueBroker
{
  private const string AnalysisQueueName = "invoice-analysis";
  private const string AzuriteDevelopmentKey =
    "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";

  /// <summary>Creates the Azure Queue service client for hosted Azure or local Azurite execution.</summary>
  /// <param name="optionsManager">The application options source containing the configured storage endpoint.</param>
  /// <returns>An authenticated queue service client targeting the configured storage account.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="optionsManager"/> is null.</exception>
  private static QueueServiceClient CreateQueueServiceClient(IOptionsManager optionsManager)
  {
    ArgumentNullException.ThrowIfNull(optionsManager);
    return CreateQueueServiceClient(optionsManager.GetApplicationOptions());
  }

  internal static QueueServiceClient CreateQueueServiceClient(ApplicationOptions options)
  {
    ArgumentNullException.ThrowIfNull(options);
    Uri queueEndpoint = string.IsNullOrWhiteSpace(options.StorageQueueEndpoint)
      ? ResolveQueueEndpoint(new Uri(options.StorageAccountEndpoint))
      : ParseScopedQueueEndpoint(options.StorageQueueEndpoint);

    if (queueEndpoint.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase))
    {
      string connectionString =
        $"DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey={AzuriteDevelopmentKey};QueueEndpoint={queueEndpoint};";
      return new QueueServiceClient(connectionString);
    }

    return new QueueServiceClient(queueEndpoint, AzureCredentialFactory.CreateCredential());
  }

  private static Uri ParseScopedQueueEndpoint(string endpoint)
  {
    if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var parsed)
        || !parsed.IsLoopback || parsed.Scheme != Uri.UriSchemeHttp
        || parsed.UserInfo.Length != 0 || parsed.Query.Length != 0 || parsed.Fragment.Length != 0
        || !string.Equals(parsed.AbsolutePath.TrimEnd('/'), "/devstoreaccount1", StringComparison.Ordinal))
    {
      throw new InvalidOperationException("The configured local queue endpoint must target the loopback Azurite account.");
    }
    return parsed;
  }

  internal static Uri ResolveQueueEndpoint(Uri blobEndpoint)
  {
    ArgumentNullException.ThrowIfNull(blobEndpoint);
    var builder = new UriBuilder(blobEndpoint);

    if (builder.Port == 10000
        && (builder.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            || builder.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
            || builder.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)))
    {
      builder.Port = 10001;
    }

    if (builder.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        || builder.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
    {
      return builder.Uri;
    }

    builder.Host = builder.Host.Replace(".blob.", ".queue.", StringComparison.OrdinalIgnoreCase);
    return builder.Uri;
  }
}
